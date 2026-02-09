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

    // Get API key from environment (optional, but required for auth)
    let api_key = match env::var("API_KEY") {
        Ok(key) => {
            tracing::info!("API key configured");
            Some(key)
        }
        Err(_) => {
            tracing::warn!("API_KEY environment variable not set - requests will fail if server requires authentication");
            eprintln!("Warning: API_KEY not set. Set API_KEY environment variable for authenticated access.");
            None
        }
    };

    // Get user email from environment (optional, for family scoping).
    // USER_EMAIL takes priority; falls back to DEFAULT_AUTHOR_EMAIL for backward compatibility.
    // When set, requests are scoped to the user's family.
    // When not set, MCP operates in god mode (access to all recipes).
    let user_email = match env::var("USER_EMAIL").or_else(|_| env::var("DEFAULT_AUTHOR_EMAIL")) {
        Ok(email) => {
            let normalized = email.trim().to_lowercase();
            tracing::info!("User email configured: {} (scoped mode)", normalized);
            Some(normalized)
        }
        Err(_) => {
            tracing::info!("USER_EMAIL not set - MCP operating in god mode (all recipes accessible)");
            None
        }
    };

    // Create API client
    let client = match ApiClient::new(api_base_url, api_key, user_email) {
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
