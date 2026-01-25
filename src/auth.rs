use axum::{
    body::Body,
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use rand::Rng;
use serde_json::json;
use std::fs;
use std::path::Path;
use std::sync::Arc;
use tracing::{info, warn};

const API_KEY_FILE: &str = "/app/data/.api_key";
const API_KEY_LENGTH: usize = 32;

/// Shared state for the API key
#[derive(Clone)]
pub struct ApiKeyState {
    pub key: Arc<String>,
}

/// Load API key from file or generate a new one
pub fn load_or_generate_api_key() -> String {
    let key_path = Path::new(API_KEY_FILE);

    // Try to load existing key
    if key_path.exists() {
        match fs::read_to_string(key_path) {
            Ok(key) => {
                let key = key.trim().to_string();
                if !key.is_empty() {
                    info!("Loaded API key from {}", API_KEY_FILE);
                    return key;
                }
            }
            Err(e) => {
                warn!("Failed to read API key file: {}", e);
            }
        }
    }

    // Generate new key
    let key = generate_api_key();

    // Try to save the key
    if let Some(parent) = key_path.parent() {
        if !parent.exists() {
            if let Err(e) = fs::create_dir_all(parent) {
                warn!("Failed to create directory for API key: {}", e);
            }
        }
    }

    match fs::write(key_path, &key) {
        Ok(_) => {
            info!("Generated new API key and saved to {}", API_KEY_FILE);
            println!("\n========================================");
            println!("NEW API KEY GENERATED");
            println!("========================================");
            println!("API Key: {}", key);
            println!("========================================");
            println!("Save this key! You will need it to configure");
            println!("the MCP server in Claude Desktop.");
            println!("This key will not be displayed again.");
            println!("========================================\n");
        }
        Err(e) => {
            warn!("Failed to save API key to file: {}", e);
            println!("\n========================================");
            println!("WARNING: Could not save API key to file!");
            println!("API Key: {}", key);
            println!("Save this key manually!");
            println!("========================================\n");
        }
    }

    key
}

/// Generate a random 32-character hex API key
fn generate_api_key() -> String {
    let mut rng = rand::thread_rng();
    let bytes: Vec<u8> = (0..API_KEY_LENGTH / 2).map(|_| rng.r#gen()).collect();
    hex::encode(bytes)
}

/// Simple hex encoding (to avoid another dependency)
mod hex {
    pub fn encode(bytes: Vec<u8>) -> String {
        bytes.iter().map(|b| format!("{:02x}", b)).collect()
    }
}

/// Middleware to validate API key
pub async fn api_key_auth(
    axum::extract::State(state): axum::extract::State<ApiKeyState>,
    request: Request<Body>,
    next: Next,
) -> Response {
    // Extract API key from header
    let api_key = request
        .headers()
        .get("X-API-Key")
        .and_then(|v| v.to_str().ok());

    match api_key {
        Some(key) if constant_time_compare(key, &state.key) => {
            // Valid key, proceed
            next.run(request).await
        }
        Some(_) => {
            // Invalid key
            (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "error": "Invalid API key"
                })),
            )
                .into_response()
        }
        None => {
            // Missing key
            (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "error": "Missing API key. Include X-API-Key header."
                })),
            )
                .into_response()
        }
    }
}

/// Constant-time string comparison to prevent timing attacks
fn constant_time_compare(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }

    let mut result = 0u8;
    for (x, y) in a.bytes().zip(b.bytes()) {
        result |= x ^ y;
    }
    result == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_api_key_length() {
        let key = generate_api_key();
        assert_eq!(key.len(), API_KEY_LENGTH);
    }

    #[test]
    fn test_generate_api_key_hex() {
        let key = generate_api_key();
        // Should only contain hex characters
        assert!(key.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_generate_api_key_unique() {
        let key1 = generate_api_key();
        let key2 = generate_api_key();
        assert_ne!(key1, key2);
    }

    #[test]
    fn test_constant_time_compare_equal() {
        assert!(constant_time_compare("abc123", "abc123"));
    }

    #[test]
    fn test_constant_time_compare_not_equal() {
        assert!(!constant_time_compare("abc123", "abc124"));
    }

    #[test]
    fn test_constant_time_compare_different_length() {
        assert!(!constant_time_compare("abc", "abcd"));
    }
}
