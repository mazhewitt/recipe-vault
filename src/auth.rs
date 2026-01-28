use axum::{
    body::Body,
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use rand::Rng;
use serde_json::json;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;
use std::sync::Arc;
use tracing::{info, warn};

const API_KEY_FILE: &str = "/app/data/.api_key";
const API_KEY_LENGTH: usize = 32;
const SESSION_COOKIE_NAME: &str = "rv_session";
const SESSION_SALT: &str = "recipe-vault-session-v1";
const SESSION_MAX_AGE: i64 = 315_360_000; // 10 years in seconds

/// Shared state for the API key
#[derive(Clone)]
pub struct ApiKeyState {
    pub key: Arc<String>,
    pub family_password: Option<Arc<String>>,
}

/// Compute the session hash from the family password
/// Returns SHA256(password + salt) as a hex string
pub fn compute_session_hash(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    hasher.update(SESSION_SALT.as_bytes());
    let result = hasher.finalize();
    hex::encode(result.to_vec())
}

/// Validate a session cookie value against the current password
pub fn validate_session_cookie(cookie_value: &str, password: &str) -> bool {
    let expected = compute_session_hash(password);
    constant_time_compare(cookie_value, &expected)
}

/// Create a Set-Cookie header value for the session cookie
pub fn create_session_cookie(password: &str) -> String {
    let hash = compute_session_hash(password);
    format!(
        "{}={}; HttpOnly; SameSite=Strict; Path=/; Max-Age={}",
        SESSION_COOKIE_NAME, hash, SESSION_MAX_AGE
    )
}

/// Create a Set-Cookie header value to clear the session cookie
pub fn clear_session_cookie() -> String {
    format!(
        "{}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        SESSION_COOKIE_NAME
    )
}

/// Extract a cookie value by name from the Cookie header
fn extract_cookie(cookie_header: &str, name: &str) -> Option<String> {
    for cookie in cookie_header.split(';') {
        let cookie = cookie.trim();
        if let Some((key, value)) = cookie.split_once('=') {
            if key.trim() == name {
                return Some(value.trim().to_string());
            }
        }
    }
    None
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

/// Middleware to validate API key or session cookie
pub async fn api_key_auth(
    axum::extract::State(state): axum::extract::State<ApiKeyState>,
    request: Request<Body>,
    next: Next,
) -> Response {
    // Try API key first (for MCP clients)
    let api_key = request
        .headers()
        .get("X-API-Key")
        .and_then(|v| v.to_str().ok());

    if let Some(key) = api_key {
        if constant_time_compare(key, &state.key) {
            return next.run(request).await;
        }
        // Invalid API key - don't fall through to cookie check
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "error": "Invalid API key"
            })),
        )
            .into_response();
    }

    // Try session cookie (for web users)
    let cookie_header = request
        .headers()
        .get("Cookie")
        .and_then(|v| v.to_str().ok());

    if let Some(cookies) = cookie_header {
        if let Some(session_value) = extract_cookie(cookies, SESSION_COOKIE_NAME) {
            // Only validate if family password is configured
            if let Some(ref password) = state.family_password {
                if validate_session_cookie(&session_value, password) {
                    return next.run(request).await;
                }
            }
        }
    }

    // No valid auth provided
    (
        StatusCode::UNAUTHORIZED,
        Json(json!({
            "error": "Authentication required. Provide X-API-Key header or valid session cookie."
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
    fn test_compute_session_hash_deterministic() {
        let hash1 = compute_session_hash("mypassword");
        let hash2 = compute_session_hash("mypassword");
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_compute_session_hash_different_passwords() {
        let hash1 = compute_session_hash("password1");
        let hash2 = compute_session_hash("password2");
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_compute_session_hash_is_hex() {
        let hash = compute_session_hash("testpassword");
        assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
        assert_eq!(hash.len(), 64); // SHA256 = 256 bits = 64 hex chars
    }

    #[test]
    fn test_validate_session_cookie_valid() {
        let password = "familypassword123";
        let cookie_value = compute_session_hash(password);
        assert!(validate_session_cookie(&cookie_value, password));
    }

    #[test]
    fn test_validate_session_cookie_invalid() {
        let password = "familypassword123";
        let wrong_cookie = compute_session_hash("wrongpassword");
        assert!(!validate_session_cookie(&wrong_cookie, password));
    }

    #[test]
    fn test_validate_session_cookie_password_changed() {
        let old_password = "oldpassword";
        let new_password = "newpassword";
        let old_cookie = compute_session_hash(old_password);
        // Old cookie should not validate with new password
        assert!(!validate_session_cookie(&old_cookie, new_password));
    }

    #[test]
    fn test_create_session_cookie_format() {
        let cookie = create_session_cookie("testpass");
        assert!(cookie.starts_with("rv_session="));
        assert!(cookie.contains("HttpOnly"));
        assert!(cookie.contains("SameSite=Strict"));
        assert!(cookie.contains("Path=/"));
        assert!(cookie.contains("Max-Age="));
    }

    #[test]
    fn test_clear_session_cookie_format() {
        let cookie = clear_session_cookie();
        assert!(cookie.starts_with("rv_session="));
        assert!(cookie.contains("Max-Age=0"));
    }

    #[test]
    fn test_extract_cookie_single() {
        let header = "rv_session=abc123";
        assert_eq!(extract_cookie(header, "rv_session"), Some("abc123".to_string()));
    }

    #[test]
    fn test_extract_cookie_multiple() {
        let header = "other=xyz; rv_session=abc123; another=456";
        assert_eq!(extract_cookie(header, "rv_session"), Some("abc123".to_string()));
    }

    #[test]
    fn test_extract_cookie_not_found() {
        let header = "other=xyz; another=456";
        assert_eq!(extract_cookie(header, "rv_session"), None);
    }
}
