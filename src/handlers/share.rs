use axum::{
    extract::{Path, State},
    http::{header, StatusCode},
    response::{Html, IntoResponse},
    Json,
};
use sqlx::SqlitePool;
use std::sync::Arc;

use crate::{
    auth::UserIdentity,
    config::Config,
    db::queries,
    models::share_link::generate_share_token,
};

/// Shared state for share handlers
#[derive(Clone)]
pub struct ShareState {
    pub pool: SqlitePool,
    pub config: Arc<Config>,
}

/// POST /api/recipes/:id/share — create a share link (authenticated)
pub async fn create_share_link(
    State(state): State<ShareState>,
    Path(recipe_id): Path<String>,
    extensions: axum::http::Extensions,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let identity = extensions.get::<UserIdentity>();
    let family_members = identity.and_then(|i| i.family_members.as_ref());
    let user_email = identity.and_then(|i| i.email.as_ref());

    let user_email = match user_email {
        Some(email) => email.clone(),
        None => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"error": "Authentication required"})),
            ));
        }
    };

    // Verify recipe exists and is accessible
    let _recipe = queries::get_recipe(
        &state.pool,
        &recipe_id,
        family_members.map(|v| v.as_slice()),
    )
    .await
    .map_err(|_| {
        (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Recipe not found"})),
        )
    })?;

    let token = generate_share_token();
    let expires_at = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(30))
        .unwrap()
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();

    let link = queries::create_share_link(
        &state.pool,
        &token,
        &recipe_id,
        &user_email,
        &expires_at,
    )
    .await
    .map_err(|e| {
        tracing::error!("Failed to create share link: {:?}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to create share link"})),
        )
    })?;

    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({
            "token": link.token,
            "url": format!("/share/{}", link.token),
            "expires_at": link.expires_at
        })),
    ))
}

/// GET /share/:token — public share page (no auth)
pub async fn share_page(
    State(state): State<ShareState>,
    Path(token): Path<String>,
) -> impl IntoResponse {
    let link = match queries::get_share_link(&state.pool, &token).await {
        Ok(Some(link)) => link,
        _ => return (StatusCode::NOT_FOUND, Html(not_found_page())),
    };

    // Check expiry
    if is_expired(&link.expires_at) {
        return (StatusCode::NOT_FOUND, Html(expired_page()));
    }

    let recipe = match queries::get_recipe_by_share_token(&state.pool, &token).await {
        Ok(Some(r)) => r,
        _ => return (StatusCode::NOT_FOUND, Html(not_found_page())),
    };

    let r = &recipe.recipe;

    // Build ingredients HTML
    let ingredients_html: String = recipe
        .ingredients
        .iter()
        .map(|ing| {
            let qty = ing.quantity.map(|q| format!("{} ", q)).unwrap_or_default();
            let unit = ing.unit.as_deref().map(|u| format!("{} ", u)).unwrap_or_default();
            let notes = ing
                .notes
                .as_deref()
                .map(|n| format!(" <span style=\"color:#888;font-style:italic\">({})</span>", html_escape(n)))
                .unwrap_or_default();
            format!(
                "<li>{}{}{}{}</li>",
                qty,
                html_escape(&unit),
                html_escape(&ing.name),
                notes
            )
        })
        .collect();

    // Build steps HTML
    let steps_html: String = recipe
        .steps
        .iter()
        .enumerate()
        .map(|(i, step)| {
            let duration = step
                .duration_minutes
                .map(|d| format!(" <span style=\"color:#888\">({} min)</span>", d))
                .unwrap_or_default();
            format!(
                "<li><strong>Step {}.</strong> {}{}</li>",
                i + 1,
                html_escape(&step.instruction),
                duration
            )
        })
        .collect();

    // Build metadata
    let mut meta_items = Vec::new();
    if let Some(prep) = r.prep_time_minutes {
        meta_items.push(format!("Prep: {} min", prep));
    }
    if let Some(cook) = r.cook_time_minutes {
        meta_items.push(format!("Cook: {} min", cook));
    }
    if let Some(total) = r.total_time_minutes() {
        meta_items.push(format!("Total: {} min", total));
    }
    if let Some(servings) = r.servings {
        meta_items.push(format!("Serves: {}", servings));
    }
    if let Some(diff) = r.difficulty {
        let dots: String = (1..=5)
            .map(|i| if i <= diff { "●" } else { "○" })
            .collect::<Vec<_>>()
            .join("");
        meta_items.push(format!("Difficulty: {}", dots));
    }
    let meta_html = if meta_items.is_empty() {
        String::new()
    } else {
        format!(
            "<div class=\"meta\">{}</div>",
            meta_items.join(" &middot; ")
        )
    };

    // Photo
    let photo_html = if r.photo_filename.is_some() {
        format!(
            "<img src=\"/share/{}/photo\" alt=\"{}\" class=\"recipe-photo\">",
            html_escape(&token),
            html_escape(&r.title)
        )
    } else {
        String::new()
    };

    // OG description
    let og_description = r
        .description
        .as_deref()
        .unwrap_or("A recipe shared from Recipe Vault");

    // OG image
    let og_image = if r.photo_filename.is_some() {
        format!("<meta property=\"og:image\" content=\"/share/{}/photo\">", html_escape(&token))
    } else {
        String::new()
    };

    // Description
    let description_html = r
        .description
        .as_deref()
        .map(|d| format!("<p class=\"description\">{}</p>", html_escape(d)))
        .unwrap_or_default();

    // Build plain text for clipboard (used by JS)
    let plain_ingredients: String = recipe
        .ingredients
        .iter()
        .map(|ing| {
            let qty = ing.quantity.map(|q| format!("{} ", q)).unwrap_or_default();
            let unit = ing.unit.as_deref().map(|u| format!("{} ", u)).unwrap_or_default();
            format!("- {}{}{}", qty, unit, ing.name)
        })
        .collect::<Vec<_>>()
        .join("\n");

    let plain_steps: String = recipe
        .steps
        .iter()
        .enumerate()
        .map(|(i, step)| format!("{}. {}", i + 1, step.instruction))
        .collect::<Vec<_>>()
        .join("\n");

    let plain_text = format!(
        "{}\n\nIngredients:\n{}\n\nSteps:\n{}",
        r.title, plain_ingredients, plain_steps
    );

    let html = format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} - Recipe Vault</title>
<meta property="og:title" content="{title}">
<meta property="og:description" content="{og_desc}">
<meta property="og:type" content="article">
{og_image}
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:680px;margin:0 auto;padding:24px 16px;color:#333;background:#faf9f6;line-height:1.6}}
h1{{font-size:1.8em;margin-bottom:8px;color:#2c1810}}
.meta{{color:#666;margin:12px 0;font-size:0.95em}}
.description{{color:#555;margin:12px 0;font-style:italic}}
.recipe-photo{{width:100%;max-height:400px;object-fit:cover;border-radius:8px;margin:16px 0}}
h2{{font-size:1.2em;margin:24px 0 12px;color:#2c1810;border-bottom:1px solid #e0d6c8;padding-bottom:4px}}
ul,ol{{padding-left:24px}}
li{{margin:6px 0}}
.footer{{margin-top:32px;padding-top:16px;border-top:1px solid #e0d6c8;color:#999;font-size:0.85em;display:flex;justify-content:space-between;align-items:center}}
.copy-btn{{background:#2c1810;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:0.9em}}
.copy-btn:hover{{background:#4a2e20}}
.toast{{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:8px;font-size:0.9em;opacity:0;transition:opacity 0.3s;pointer-events:none}}
.toast.show{{opacity:1}}
</style>
</head>
<body>
<h1>{title}</h1>
{meta}
{description}
{photo}
<h2>Ingredients</h2>
<ul>{ingredients}</ul>
<h2>Preparation</h2>
<ol>{steps}</ol>
<div class="footer">
<span>Shared from Recipe Vault</span>
<button class="copy-btn" id="copyBtn">Copy to clipboard</button>
</div>
<div class="toast" id="toast">Copied to clipboard!</div>
<script>
(function(){{
var btn=document.getElementById('copyBtn');
var toast=document.getElementById('toast');
if(!navigator.clipboard){{btn.style.display='none';return}}
var text={plain_text_json};
btn.addEventListener('click',function(){{
navigator.clipboard.writeText(text).then(function(){{
toast.classList.add('show');
setTimeout(function(){{toast.classList.remove('show')}},2000);
}});
}});
}})();
</script>
</body>
</html>"#,
        title = html_escape(&r.title),
        og_desc = html_escape(og_description),
        og_image = og_image,
        meta = meta_html,
        description = description_html,
        photo = photo_html,
        ingredients = ingredients_html,
        steps = steps_html,
        plain_text_json = serde_json::to_string(&plain_text).unwrap_or_else(|_| "\"\"".to_string()),
    );

    (StatusCode::OK, Html(html))
}

/// GET /share/:token/photo — public photo endpoint (no auth)
pub async fn share_photo(
    State(state): State<ShareState>,
    Path(token): Path<String>,
) -> Result<impl IntoResponse, StatusCode> {
    let link = match queries::get_share_link(&state.pool, &token).await {
        Ok(Some(link)) => link,
        _ => return Err(StatusCode::NOT_FOUND),
    };

    if is_expired(&link.expires_at) {
        return Err(StatusCode::NOT_FOUND);
    }

    // Get recipe to find photo filename
    let recipe = match queries::get_recipe(&state.pool, &link.recipe_id, None).await {
        Ok(r) => r,
        Err(_) => return Err(StatusCode::NOT_FOUND),
    };

    let photo_filename = match &recipe.recipe.photo_filename {
        Some(f) => f.clone(),
        None => return Err(StatusCode::NOT_FOUND),
    };

    let photo_path = format!("{}/{}", state.config.photos_dir, photo_filename);
    let photo_bytes = tokio::fs::read(&photo_path).await.map_err(|e| {
        tracing::error!("Failed to read shared photo {}: {}", photo_path, e);
        StatusCode::NOT_FOUND
    })?;

    let content_type = content_type_from_extension(&photo_filename);

    Ok((
        StatusCode::OK,
        [(header::CONTENT_TYPE, content_type)],
        photo_bytes,
    ))
}

/// Check if an expires_at datetime string is in the past
fn is_expired(expires_at: &str) -> bool {
    match chrono::NaiveDateTime::parse_from_str(expires_at, "%Y-%m-%d %H:%M:%S") {
        Ok(expiry) => {
            let now = chrono::Utc::now().naive_utc();
            now > expiry
        }
        Err(_) => true, // Treat unparseable dates as expired
    }
}

fn content_type_from_extension(filename: &str) -> &'static str {
    let extension = std::path::Path::new(filename)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");

    match extension.to_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "application/octet-stream",
    }
}

fn not_found_page() -> String {
    r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Not Found - Recipe Vault</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:80px auto;padding:24px 16px;color:#333;text-align:center;background:#faf9f6}
h1{font-size:1.5em;color:#2c1810;margin-bottom:12px}
p{color:#666}
</style>
</head>
<body>
<h1>Recipe not found</h1>
<p>This share link doesn't exist or the recipe has been removed.</p>
</body>
</html>"#
        .to_string()
}

fn expired_page() -> String {
    r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Link Expired - Recipe Vault</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:80px auto;padding:24px 16px;color:#333;text-align:center;background:#faf9f6}
h1{font-size:1.5em;color:#2c1810;margin-bottom:12px}
p{color:#666}
</style>
</head>
<body>
<h1>This share link has expired</h1>
<p>Share links are valid for 30 days. Ask the recipe owner to share it again.</p>
</body>
</html>"#
        .to_string()
}

/// Escape HTML special characters to prevent XSS
fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
}
