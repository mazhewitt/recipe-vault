use rand::Rng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ShareLink {
    pub token: String,
    pub recipe_id: String,
    pub created_by: String,
    pub created_at: String,
    pub expires_at: String,
}

const TOKEN_LENGTH: usize = 10;
const TOKEN_CHARS: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/// Generate a random 10-character alphanumeric token
pub fn generate_share_token() -> String {
    let mut rng = rand::thread_rng();
    (0..TOKEN_LENGTH)
        .map(|_| {
            let idx = rng.gen_range(0..TOKEN_CHARS.len());
            TOKEN_CHARS[idx] as char
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_share_token_length() {
        let token = generate_share_token();
        assert_eq!(token.len(), TOKEN_LENGTH);
    }

    #[test]
    fn test_generate_share_token_alphanumeric() {
        let token = generate_share_token();
        assert!(token.chars().all(|c| c.is_ascii_alphanumeric()));
    }

    #[test]
    fn test_generate_share_token_unique() {
        let t1 = generate_share_token();
        let t2 = generate_share_token();
        assert_ne!(t1, t2);
    }
}
