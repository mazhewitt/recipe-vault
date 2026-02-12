use axum::{
    body::Body,
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::Path;
use std::sync::Arc;
use tracing::{info, warn};

use crate::config::FamiliesConfig;

const API_KEY_FILE: &str = "/app/data/.api_key";
const API_KEY_LENGTH: usize = 32;

/// Normalize an email address to lowercase for consistent matching
pub fn normalize_email(email: &str) -> String {
    email.trim().to_lowercase()
}

/// User identity extracted from Cloudflare headers or dev environment
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UserIdentity {
    pub email: Option<String>,
    /// All emails in the user's family (normalized).
    /// Some(vec) = scoped to family, None = god mode (no filtering).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub family_members: Option<Vec<String>>,
}

/// Shared state for the API key auth middleware
#[derive(Clone)]
pub struct ApiKeyState {
    pub key: Arc<String>,
    pub families_config: Arc<FamiliesConfig>,
    pub dev_user_email: Option<String>,
}

/// Shared state for the cloudflare auth middleware
#[derive(Clone)]
pub struct CloudflareAuthState {
    pub dev_user_email: Option<String>,
    pub families_config: Arc<FamiliesConfig>,
}

/// Load API key from environment, file, or generate a new one
pub fn load_or_generate_api_key() -> String {
    // Check for API_KEY environment variable first (for testing)
    if let Ok(key) = std::env::var("API_KEY") {
        let key = key.trim().to_string();
        if !key.is_empty() {
            info!("Using API key from API_KEY environment variable");
            return key;
        }
    }

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
    if let Some(parent) = key_path.parent()
        && !parent.exists()
        && let Err(e) = fs::create_dir_all(parent) {
            warn!("Failed to create directory for API key: {}", e);
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

/// Middleware to extract user identity from Cloudflare headers or dev environment.
/// Looks up family members from the families config and sets them in UserIdentity.
pub async fn cloudflare_auth(
    axum::extract::State(state): axum::extract::State<CloudflareAuthState>,
    mut request: Request<Body>,
    next: Next,
) -> Response {
    // Priority: Cloudflare header > dev email
    // Note: X-User-Email is now handled in api_key_auth for scoped API key access
    let email = request
        .headers()
        .get("Cf-Access-Authenticated-User-Email")
        .and_then(|v| v.to_str().ok())
        .map(normalize_email)
        .or_else(|| state.dev_user_email.as_ref().map(|e| normalize_email(e)));

    let family_members = email
        .as_ref()
        .and_then(|e| state.families_config.get_family_members(e))
        .cloned();

    request.extensions_mut().insert(UserIdentity {
        email,
        family_members,
    });
    next.run(request).await
}

/// Middleware to validate API key or Cloudflare identity.
/// For API key auth with X-User-Email header, scopes to that user's family.
/// For API key auth without X-User-Email, grants god mode (family_members = None).
pub async fn api_key_auth(
    axum::extract::State(state): axum::extract::State<ApiKeyState>,
    mut request: Request<Body>,
    next: Next,
) -> Response {
    // Try API key first (for MCP clients)
    let api_key = request
        .headers()
        .get("X-API-Key")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    if let Some(key) = api_key {
        if constant_time_compare(&key, &state.key) {
            // Valid API key — check for X-User-Email header for scoped access
            let x_user_email = request
                .headers()
                .get("X-User-Email")
                .and_then(|v| v.to_str().ok())
                .map(normalize_email);

            if let Some(email) = x_user_email {
                // Scoped mode: look up family for this email
                let family_members = state.families_config.get_family_members(&email).cloned();
                if family_members.is_none() {
                    // Email not in config → 403
                    return (
                        StatusCode::FORBIDDEN,
                        Json(json!({
                            "error": "Your email is not configured for access. Please contact the administrator."
                        })),
                    )
                        .into_response();
                }
                request.extensions_mut().insert(UserIdentity {
                    email: Some(email),
                    family_members,
                });
            } else {
                // God mode: no X-User-Email header, use DEV_USER_EMAIL for authorship
                let email = state.dev_user_email.as_ref().map(|e| normalize_email(e));
                request.extensions_mut().insert(UserIdentity {
                    email,
                    family_members: None, // None = god mode
                });
            }
            return next.run(request).await;
        }
        // Invalid API key
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "error": "Invalid API key"
            })),
        )
            .into_response();
    }

    // Check if Cloudflare identity is present in extensions
    if let Some(identity) = request.extensions().get::<UserIdentity>()
        && identity.email.is_some() {
            if identity.family_members.is_none() {
                // User authenticated via Cloudflare but not in any family → 403
                return (
                    StatusCode::FORBIDDEN,
                    Json(json!({
                        "error": "Your email is not configured for access. Please contact the administrator."
                    })),
                )
                    .into_response();
            }
            return next.run(request).await;
        }

    // No valid auth provided
    (
        StatusCode::UNAUTHORIZED,
        Json(json!({
            "error": "Authentication required. Provide X-API-Key header or valid Cloudflare identity."
        })),
    )
        .into_response()
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

    #[test]
    fn test_normalize_email_lowercase() {
        assert_eq!(normalize_email("Alice@Example.COM"), "alice@example.com");
    }

    #[test]
    fn test_normalize_email_already_lowercase() {
        assert_eq!(normalize_email("alice@example.com"), "alice@example.com");
    }

    #[test]
    fn test_normalize_email_trims_whitespace() {
        assert_eq!(normalize_email("  alice@example.com  "), "alice@example.com");
    }

    #[test]
    fn test_normalize_email_mixed_case() {
        assert_eq!(normalize_email("Bob@GMAIL.com"), "bob@gmail.com");
    }
}
