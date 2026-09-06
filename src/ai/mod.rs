mod client;
pub mod difficulty_assessment;
pub mod llm;
pub mod prompts;

pub use client::{dedupe_recipe_ids, AiAgent, AiAgentConfig, McpServerConfig, MealArtifactData, MealPlanEntry, TimerData};
pub use difficulty_assessment::{assess_recipe_difficulty, DifficultyAssessmentError};
pub use llm::{LlmProvider, LlmProviderType, Message, ContentBlock, ImageSource};
