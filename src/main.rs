use axum::{
    extract::DefaultBodyLimit,
    middleware,
    routing::{delete, get, post, put},
    Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::{
    cors::CorsLayer,
    services::ServeDir,
    trace::{DefaultMakeSpan, TraceLayer},
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use recipe_vault::{
    auth::{api_key_auth, cloudflare_auth, load_or_generate_api_key, ApiKeyState, CloudflareAuthState},
    config::Config,
    db,
    handlers::{chat, recipes, ui::{self, UiState}},
};

#[tokio::main]
async fn main() {
    // Load environment variables from .env file
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,recipe_vault=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env().expect("Failed to load configuration");

    tracing::info!("Starting Recipe Vault server");
    tracing::debug!("Database URL: {}", config.database_url);
    tracing::debug!("Bind address: {}", config.bind_address);

    // Create photos directory if it doesn't exist
    tracing::info!("Ensuring photos directory exists: {}", config.photos_dir);
    if let Err(e) = std::fs::create_dir_all(&config.photos_dir) {
        tracing::error!("Failed to create photos directory at {}: {}", config.photos_dir, e);
        panic!("Failed to create photos directory: {}", e);
    }
    tracing::info!("Photos directory ready");

    // Load or generate API key
    let api_key = load_or_generate_api_key();
    let api_key_for_chat = api_key.clone();

    let families_config = Arc::new(config.families_config.clone());

    let api_key_state = ApiKeyState {
        key: Arc::new(api_key),
        families_config: families_config.clone(),
        dev_user_email: config.dev_user_email.clone(),
    };

    let cloudflare_auth_state = CloudflareAuthState {
        dev_user_email: config.dev_user_email.clone(),
        families_config: families_config.clone(),
    };

    let ui_state = UiState {};

    // Create database connection pool
    let pool = db::create_pool(&config.database_url)
        .await
        .expect("Failed to create database pool");

    // Run migrations with automatic reset on missing migration versions
    tracing::info!("Running database migrations");
    let migration_result = sqlx::migrate!().run(&pool).await;

    if let Err(e) = migration_result {
        // Check if error is due to missing migration versions
        let error_msg = e.to_string();
        if error_msg.contains("VersionMissing") || error_msg.contains("previously applied but is missing") {
            tracing::warn!("Detected missing migration versions - resetting migrations table");
            tracing::warn!("This is expected during migration consolidation (v2.6.2)");

            // Clear the migrations table
            sqlx::query("DELETE FROM _sqlx_migrations")
                .execute(&pool)
                .await
                .expect("Failed to clear migrations table");

            tracing::info!("Migrations table cleared, re-running migrations");

            // Re-run migrations
            sqlx::migrate!()
                .run(&pool)
                .await
                .expect("Failed to run migrations after reset");

            tracing::info!("Migrations completed successfully after reset");
        } else {
            // Other migration error - panic
            panic!("Failed to run migrations: {}", e);
        }
    }

    // Create chat state with AI agent
    let chat_state = recipe_vault::chat::ChatState::new(config.clone(), api_key_for_chat);

    // Create recipe state with database and AI configuration
    let recipe_state = recipes::RecipeState {
        pool: pool.clone(),
        config: Arc::new(config.clone()),
    };

    // Build recipe routes with recipe state
    let recipe_routes = Router::new()
        .route("/recipes", post(recipes::create_recipe))
        .route("/recipes", get(recipes::list_recipes))
        .route("/recipes/:id", get(recipes::get_recipe))
        .route("/recipes/:id", put(recipes::update_recipe))
        .route("/recipes/:id", delete(recipes::delete_recipe))
        .route("/recipes/:id/photo", post(recipes::upload_photo))
        .route("/recipes/:id/photo", get(recipes::get_photo))
        .route("/recipes/:id/photo", delete(recipes::delete_photo))
        .with_state(recipe_state);

    // Build chat routes with chat state
    let chat_routes = Router::new()
        .route("/chat", post(chat::chat))
        .route("/chat/reset", post(chat::reset_conversation))
        .with_state(chat_state);

    // Combine API routes with authentication
    // Note: cloudflare_auth middleware runs on the entire app,
    // so UserIdentity is already available in extensions here.
    let api_routes = Router::new()
        .merge(recipe_routes)
        .merge(chat_routes)
        .route_layer(middleware::from_fn_with_state(
            api_key_state.clone(),
            api_key_auth,
        ));

    // UI routes
    let ui_routes = Router::new()
        .route("/", get(ui::root))
        .route("/chat", get(ui::chat_page))
        .with_state(ui_state);

    let app = Router::new()
        .nest_service("/static", ServeDir::new("./static"))
        .merge(ui_routes)
        .nest("/api", api_routes)
        .layer(middleware::from_fn_with_state(
            cloudflare_auth_state,
            cloudflare_auth,
        ))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::default().include_headers(true)),
        )
        .layer(CorsLayer::permissive())
        // 10MB body limit for image uploads
        // Frontend validates images at 5MB (Claude API limit), but backend allows 10MB
        // to accommodate base64 encoding overhead (~33% larger) plus JSON structure
        .layer(DefaultBodyLimit::max(10 * 1024 * 1024));

    // Parse bind address
    let addr: SocketAddr = config
        .bind_address
        .parse()
        .expect("Invalid bind address");

    tracing::info!("Listening on http://{}", addr);
    tracing::info!("API key authentication enabled");
    tracing::info!("Family multi-tenancy enabled");
    if config.dev_user_email.is_some() {
        tracing::info!("Development user email enabled: {}", config.dev_user_email.as_ref().unwrap());
    }

    // Start server
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind address");

    axum::serve(listener, app)
        .await
        .expect("Server error");
}
