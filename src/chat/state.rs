use std::sync::Arc;

use tokio::sync::RwLock;

use crate::ai::{AiAgent, AiAgentConfig, McpServerConfig, LlmProvider, LlmProviderType};
use crate::ai::prompts::CHAT_SYSTEM_PROMPT;
use crate::config::Config;
use crate::chat::{ChatError, SessionStore};

#[derive(Clone)]
pub struct ChatState {
    agent: Arc<RwLock<Option<AiAgent>>>,
    sessions: SessionStore,
    config: Arc<Config>,
    api_key: Arc<String>,
}

impl ChatState {
    pub fn new(config: Config, api_key: String) -> Self {
        Self {
            agent: Arc::new(RwLock::new(None)),
            sessions: SessionStore::new(),
            config: Arc::new(config),
            api_key: Arc::new(api_key),
        }
    }

    pub fn sessions(&self) -> &SessionStore {
        &self.sessions
    }

    pub async fn get_or_create_agent(&self, user_email: &str) -> Result<(), ChatError> {
        let mut agent_guard = self.agent.write().await;
        if agent_guard.is_none() {
            let llm = if self.config.mock_llm {
                LlmProvider::mock(self.config.mock_recipe_id.clone())
            } else {
                LlmProvider::new(
                    LlmProviderType::Anthropic,
                    self.config.anthropic_api_key.clone(),
                    self.config.ai_model.clone(),
                )
            };

            // Configure MCP servers
            let mcp_binary_path = std::env::var("MCP_BINARY_PATH")
                .unwrap_or_else(|_| "./target/release/recipe-vault-mcp".to_string());
            let api_base_url = format!(
                "http://127.0.0.1:{}",
                self.config.bind_address.split(':').last().unwrap_or("3000")
            );

            // Recipes server config
            let recipes_server = McpServerConfig {
                name: "recipes".to_string(),
                command: mcp_binary_path,
                args: vec![],
                env: vec![
                    ("API_BASE_URL".to_string(), api_base_url),
                    ("API_KEY".to_string(), (*self.api_key).clone()),
                    ("USER_EMAIL".to_string(), user_email.to_string()),
                ]
                .into_iter()
                .collect(),
            };

            // Fetch server config (only if uvx is available)
            let mut mcp_servers = vec![recipes_server];

            // Check if uvx is available before adding fetch server
            if std::process::Command::new("uvx")
                .arg("--version")
                .output()
                .is_ok()
            {
                let fetch_server = McpServerConfig {
                    name: "fetch".to_string(),
                    command: "uvx".to_string(),
                    args: vec!["mcp-server-fetch".to_string()],
                    env: std::collections::HashMap::new(),
                };
                mcp_servers.push(fetch_server);
                tracing::info!("uvx available - fetch server enabled");
            } else {
                tracing::warn!(
                    "uvx not available - fetch server disabled. Install uv to enable URL recipe fetching."
                );
            }

            let agent_config = AiAgentConfig {
                mcp_servers,
                system_prompt: Some(CHAT_SYSTEM_PROMPT.to_string()),
            };

            let agent = AiAgent::new(llm, agent_config);
            agent.start().await.map_err(|e| ChatError::Agent(e.to_string()))?;
            *agent_guard = Some(agent);
        }
        Ok(())
    }

    pub async fn chat(&self, conversation: &[crate::ai::Message]) -> Result<(String, Vec<String>, Vec<String>, Vec<(f64, String)>, Vec<crate::ai::Message>), ChatError> {
        let agent_guard = self.agent.read().await;
        let agent = agent_guard
            .as_ref()
            .ok_or_else(|| ChatError::Agent("Agent not initialized".to_string()))?;
        agent
            .chat(conversation)
            .await
            .map_err(|e| ChatError::Agent(e.to_string()))
    }
}
