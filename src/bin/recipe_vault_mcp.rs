use recipe_vault::{config::Config, db, mcp::server};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    // Load environment variables
    dotenvy::dotenv().ok();

    // Initialize tracing - write to stderr so it doesn't interfere with JSON-RPC on stdout
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "recipe_vault_mcp=info".into()),
        )
        .with(tracing_subscriber::fmt::layer().with_writer(std::io::stderr))
        .init();

    tracing::info!("Starting Recipe Vault MCP Server");

    // Load configuration
    let config = Config::from_env().expect("Failed to load configuration");
    tracing::info!("Database URL: {}", config.database_url);

    // Create database pool
    let pool = db::connection::create_pool(&config.database_url)
        .await
        .expect("Failed to create database pool");

    // Run migrations
    sqlx::migrate!()
        .run(&pool)
        .await
        .expect("Failed to run database migrations");

    tracing::info!("Database initialized successfully");

    // Run the MCP server
    if let Err(e) = server::run_server(pool).await {
        tracing::error!("MCP server error: {}", e);
        std::process::exit(1);
    }
}
