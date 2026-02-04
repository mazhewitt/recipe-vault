use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub bind_address: String,
    pub anthropic_api_key: String,
    pub ai_model: String,
    pub family_password: Option<String>,
    pub mock_llm: bool,
    pub mock_recipe_id: Option<String>,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        let database_url = env::var("DATABASE_URL")
            .map_err(|_| "DATABASE_URL must be set".to_string())?;

        let bind_address = env::var("BIND_ADDRESS")
            .unwrap_or_else(|_| "127.0.0.1:3000".to_string());

        let anthropic_api_key = env::var("ANTHROPIC_API_KEY")
            .map_err(|_| "ANTHROPIC_API_KEY must be set".to_string())?;

        let ai_model = env::var("AI_MODEL")
            .unwrap_or_else(|_| "claude-sonnet-4-5".to_string());

        let family_password = env::var("FAMILY_PASSWORD").ok();

        let mock_llm = env::var("MOCK_LLM")
            .unwrap_or_else(|_| "false".to_string())
            .to_lowercase() == "true";

        let mock_recipe_id = env::var("MOCK_RECIPE_ID").ok();

        Ok(Config {
            database_url,
            bind_address,
            anthropic_api_key,
            ai_model,
            family_password,
            mock_llm,
            mock_recipe_id,
        })
    }
}
