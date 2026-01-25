use recipe_vault::mcp::{http_client::ApiClient, server};
use std::env;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

fn main() {
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

    // Get API base URL from environment
    let api_base_url = match env::var("API_BASE_URL") {
        Ok(url) => url,
        Err(_) => {
            tracing::error!("API_BASE_URL environment variable is required");
            eprintln!("Error: API_BASE_URL environment variable is required");
            eprintln!("Example: API_BASE_URL=http://192.168.1.100:3000");
            std::process::exit(1);
        }
    };

    tracing::info!("API Base URL: {}", api_base_url);

    // Create API client
    let client = match ApiClient::new(api_base_url) {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to create API client: {}", e);
            std::process::exit(1);
        }
    };

    tracing::info!("API client initialized successfully");

    // Run the MCP server
    if let Err(e) = server::run_server(client) {
        tracing::error!("MCP server error: {}", e);
        std::process::exit(1);
    }
}
