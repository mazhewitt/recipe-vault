use axum::{
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
    auth::{api_key_auth, cloudflare_auth, load_or_generate_api_key, ApiKeyState},
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

    // Load or generate API key
    let api_key = load_or_generate_api_key();
    let api_key_for_chat = api_key.clone();

    let api_key_state = ApiKeyState {
        key: Arc::new(api_key),
    };

    let ui_state = UiState {};

    // Create database connection pool
    let pool = db::create_pool(&config.database_url)
        .await
        .expect("Failed to create database pool");

    // Run migrations
    tracing::info!("Running database migrations");
    sqlx::migrate!()
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    // Create chat state with AI agent
    let chat_state = chat::ChatState::new(config.clone(), api_key_for_chat);

    // Build recipe routes with database state
    let recipe_routes = Router::new()
        .route("/recipes", post(recipes::create_recipe))
        .route("/recipes", get(recipes::list_recipes))
        .route("/recipes/:id", get(recipes::get_recipe))
        .route("/recipes/:id", put(recipes::update_recipe))
        .route("/recipes/:id", delete(recipes::delete_recipe))
        .with_state(pool);

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
        .route("/chat", get(ui::chat_page))
        .with_state(ui_state);

    let app = Router::new()
        .nest_service("/static", ServeDir::new("./static"))
        .merge(ui_routes)
        .nest("/api", api_routes)
        .layer(middleware::from_fn_with_state(
            config.dev_user_email.clone(),
            cloudflare_auth,
        ))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::default().include_headers(true)),
        )
        .layer(CorsLayer::permissive());

    // Parse bind address
    let addr: SocketAddr = config
        .bind_address
        .parse()
        .expect("Invalid bind address");

    tracing::info!("Listening on http://{}", addr);
    tracing::info!("API key authentication enabled");
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