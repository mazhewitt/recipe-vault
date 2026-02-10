mod client;
pub mod difficulty_assessment;
pub mod llm;

pub use client::{AiAgent, AiAgentConfig, McpServerConfig};
pub use difficulty_assessment::{assess_recipe_difficulty, DifficultyAssessmentError};
pub use llm::{LlmProvider, LlmProviderType, Message, ContentBlock, ImageSource};
