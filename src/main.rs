use axum::{
    middleware,
    routing::{delete, get, post, put},
    Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::{
    cors::CorsLayer,
    trace::{DefaultMakeSpan, TraceLayer},
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use recipe_vault::{
    auth::{api_key_auth, load_or_generate_api_key, ApiKeyState},
    config::Config,
    db,
    handlers::recipes,
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
    let api_key_state = ApiKeyState {
        key: Arc::new(api_key),
    };

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

    // Build router with API key authentication on /api/* routes
    let api_routes = Router::new()
        .route("/recipes", post(recipes::create_recipe))
        .route("/recipes", get(recipes::list_recipes))
        .route("/recipes/:id", get(recipes::get_recipe))
        .route("/recipes/:id", put(recipes::update_recipe))
        .route("/recipes/:id", delete(recipes::delete_recipe))
        .route_layer(middleware::from_fn_with_state(
            api_key_state.clone(),
            api_key_auth,
        ))
        .with_state(pool);

    let app = Router::new()
        .nest("/api", api_routes)
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

    // Start server
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind address");

    axum::serve(listener, app)
        .await
        .expect("Server error");
}
