use axum::{
    routing::{delete, get, post, put},
    Router,
};
use std::net::SocketAddr;
use tower_http::{
    cors::CorsLayer,
    trace::{DefaultMakeSpan, TraceLayer},
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use recipe_vault::{config::Config, db, handlers::recipes};

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

    // Build router
    let app = Router::new()
        .route("/api/recipes", post(recipes::create_recipe))
        .route("/api/recipes", get(recipes::list_recipes))
        .route("/api/recipes/:id", get(recipes::get_recipe))
        .route("/api/recipes/:id", put(recipes::update_recipe))
        .route("/api/recipes/:id", delete(recipes::delete_recipe))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::default().include_headers(true)),
        )
        .layer(CorsLayer::permissive())
        .with_state(pool);

    // Parse bind address
    let addr: SocketAddr = config
        .bind_address
        .parse()
        .expect("Invalid bind address");

    tracing::info!("Listening on http://{}", addr);

    // Start server
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind address");

    axum::serve(listener, app)
        .await
        .expect("Server error");
}
