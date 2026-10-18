mod client;
pub mod difficulty_assessment;
pub mod llm;
pub mod prompts;
pub mod tag_assessment;

pub use client::{dedupe_recipe_ids, AiAgent, AiAgentConfig, McpServerConfig, MealArtifactData, MealPlanEntry, PageEvents, ServingsData, TimerData};
pub use difficulty_assessment::{assess_recipe_difficulty, DifficultyAssessmentError};
pub use tag_assessment::{assess_recipe_tags, TagAssessmentError, COURSE_TAGS, TAG_ASSESSMENT_SYSTEM_PROMPT};
pub use llm::{LlmProvider, LlmProviderType, Message, ContentBlock, ImageSource, GeminiOptions, GeminiThinkingLevel};
