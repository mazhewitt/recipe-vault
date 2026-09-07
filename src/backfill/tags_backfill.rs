use sqlx::SqlitePool;
use std::time::{Duration, Instant};
use tokio::time::sleep;

use crate::{
    ai::{assess_recipe_tags, LlmProvider},
    config::Config,
    db::queries,
    handlers::recipes::build_assessment_provider,
    models::Recipe,
};

/// Flag key in `backfill_flags` recording whether the tags backfill finished
const TAGS_BACKFILL_FLAG: &str = "tags_backfill_completed";

/// Delay between assessments to keep the API cost and rate profile gentle
const ASSESSMENT_DELAY_MS: u64 = 100;

/// How often (in recipes) to log progress
const PROGRESS_INTERVAL: usize = 10;

/// State of the `tags_backfill_completed` flag
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BackfillStatus {
    /// Flag is `'false'` — the backfill should run
    Pending,
    /// Flag is `'true'` — the backfill has already completed
    Completed,
    /// The `backfill_flags` table or the flag row is missing — skip quietly
    Missing,
}

/// Counts from a backfill pass
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct BackfillSummary {
    /// Recipes that were attempted
    pub processed: usize,
    /// Recipes that were successfully tagged
    pub succeeded: usize,
    /// Recipes whose assessment failed
    pub failed: usize,
}

/// Read the tags backfill flag
///
/// Never fails: a missing table, a missing row or any read error is reported as
/// `BackfillStatus::Missing` with an info log, so a startup task can skip cleanly.
pub async fn check_backfill_status(pool: &SqlitePool) -> BackfillStatus {
    let result = sqlx::query_scalar::<_, String>(
        "SELECT value FROM backfill_flags WHERE key = ?",
    )
    .bind(TAGS_BACKFILL_FLAG)
    .fetch_optional(pool)
    .await;

    match result {
        Ok(Some(value)) if value == "true" => BackfillStatus::Completed,
        Ok(Some(_)) => BackfillStatus::Pending,
        Ok(None) => {
            tracing::info!(
                "No '{}' row in backfill_flags, skipping tags backfill",
                TAGS_BACKFILL_FLAG
            );
            BackfillStatus::Missing
        }
        Err(e) => {
            tracing::info!("Could not read backfill_flags ({}), skipping tags backfill", e);
            BackfillStatus::Missing
        }
    }
}

/// Run the one-time tags backfill over every recipe that has no tags
///
/// Idempotent and resumable: recipes are selected with `NOT EXISTS` against
/// `recipe_tags`, so a restart only picks up what is still untagged. Recipes are
/// assessed sequentially with a delay, individual failures are logged and
/// skipped, and the flag is only set once a full pass has completed.
pub async fn run_tags_backfill(
    pool: &SqlitePool,
    config: &Config,
    http_client: reqwest::Client,
) -> Result<BackfillSummary, Box<dyn std::error::Error + Send + Sync>> {
    match check_backfill_status(pool).await {
        BackfillStatus::Completed => {
            tracing::info!("Tags backfill already completed, skipping");
            return Ok(BackfillSummary::default());
        }
        BackfillStatus::Missing => {
            return Ok(BackfillSummary::default());
        }
        BackfillStatus::Pending => {}
    }

    // Only recipes with no tags at all — this is what makes the pass resumable
    // and keeps recipes tagged by create-time auto-assignment untouched
    let recipes = sqlx::query_as::<_, Recipe>(
        "SELECT * FROM recipes r \
         WHERE NOT EXISTS (SELECT 1 FROM recipe_tags WHERE recipe_id = r.id) \
         ORDER BY created_at",
    )
    .fetch_all(pool)
    .await?;

    let total = recipes.len();
    tracing::info!("Starting tags backfill for {} recipes", total);

    let started = Instant::now();

    if total == 0 {
        mark_backfill_complete(pool).await?;
        tracing::info!(
            "Tags backfill completed: 0 recipes processed, 0 failures (0 succeeded, took {:?})",
            started.elapsed()
        );
        return Ok(BackfillSummary::default());
    }

    let llm = build_assessment_provider(config, http_client)?;

    let mut summary = BackfillSummary::default();

    for recipe in recipes {
        summary.processed += 1;

        match assign_tags(&llm, pool, &recipe).await {
            Ok(tags) => {
                summary.succeeded += 1;
                tracing::debug!(
                    "Assigned tags {:?} to recipe '{}' ({})",
                    tags,
                    recipe.title,
                    recipe.id
                );
            }
            Err(e) => {
                summary.failed += 1;
                tracing::warn!(
                    "Failed to assign tags to recipe '{}' ({}): {}",
                    recipe.title,
                    recipe.id,
                    e
                );
                // Continue with the next recipe; this one stays untagged
            }
        }

        if summary.processed % PROGRESS_INTERVAL == 0 {
            tracing::info!(
                "Tags backfill progress: {}/{} recipes processed, {} remaining ({} succeeded, {} failed)",
                summary.processed,
                total,
                total - summary.processed,
                summary.succeeded,
                summary.failed
            );
        }

        // Space out the API calls
        sleep(Duration::from_millis(ASSESSMENT_DELAY_MS)).await;
    }

    if summary.succeeded == 0 {
        // Every attempt failed — leave the flag alone so the next start retries
        tracing::error!(
            "Tags backfill failed for all {} recipes, leaving '{}' as 'false' to retry on next start",
            total,
            TAGS_BACKFILL_FLAG
        );
        log_completion(&summary, started);
        return Ok(summary);
    }

    mark_backfill_complete(pool).await?;
    log_completion(&summary, started);

    Ok(summary)
}

/// Log the end of a pass with the counts and the elapsed time
fn log_completion(summary: &BackfillSummary, started: Instant) {
    tracing::info!(
        "Tags backfill completed: {} recipes processed, {} failures ({} succeeded, took {:?})",
        summary.processed,
        summary.failed,
        summary.succeeded,
        started.elapsed()
    );
}

/// Assess and store the tags of a single recipe
///
/// Writes in its own transaction without touching `updated_at` / `updated_by`:
/// a backfill is not an edit by anyone.
async fn assign_tags(
    llm: &LlmProvider,
    pool: &SqlitePool,
    recipe: &Recipe,
) -> Result<Vec<String>, Box<dyn std::error::Error + Send + Sync>> {
    // Fetch ingredients and steps (no family filtering for a background task)
    let recipe_details = queries::get_recipe(pool, &recipe.id, None).await?;

    let tags = assess_recipe_tags(
        llm,
        &recipe_details.recipe,
        &recipe_details.ingredients,
        &recipe_details.steps,
    )
    .await?;

    let mut tx = pool.begin().await?;
    queries::set_recipe_tags(&mut tx, &recipe.id, &tags).await?;
    tx.commit().await?;

    Ok(tags)
}

/// Mark the tags backfill as complete
async fn mark_backfill_complete(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE backfill_flags SET value = 'true', updated_at = datetime('now') WHERE key = ?",
    )
    .bind(TAGS_BACKFILL_FLAG)
    .execute(pool)
    .await?;

    Ok(())
}
