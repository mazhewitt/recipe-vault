use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum LlmError {
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),
    #[error("API error: {0}")]
    ApiError(String),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    /// The model finished without usable content (cut off, blocked or
    /// malformed). The message names the reason and never carries content.
    #[error("{0}")]
    Incomplete(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LlmProviderType {
    Anthropic,
    Gemini,
    Mock,
}

/// Default `generationConfig.maxOutputTokens` for Gemini. On Gemini 3 and
/// later the budget is shared by thinking and visible output.
pub const DEFAULT_GEMINI_MAX_OUTPUT_TOKENS: u32 = 16384;

/// Gemini 3+ `thinkingConfig.thinkingLevel`. `minimal` is deliberately absent:
/// 3.8 Flash rejects it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GeminiThinkingLevel {
    Low,
    Medium,
    High,
}

impl GeminiThinkingLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
        }
    }
}

/// Gemini-only request settings, taken from `GEMINI_MAX_OUTPUT_TOKENS` and
/// `GEMINI_THINKING_LEVEL`. Ignored by the other providers.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GeminiOptions {
    pub max_output_tokens: u32,
    pub thinking_level: Option<GeminiThinkingLevel>,
}

impl Default for GeminiOptions {
    fn default() -> Self {
        Self {
            max_output_tokens: DEFAULT_GEMINI_MAX_OUTPUT_TOKENS,
            thinking_level: None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct LlmProvider {
    provider_type: LlmProviderType,
    api_key: String,
    model: String,
    client: reqwest::Client,
    mock_recipe_id: Option<String>,
    gemini_options: GeminiOptions,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: serde_json::Value,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thought_signature: Option<String>,
    /// True when the model sent no id and `id` was invented to pair the call
    /// with its result. Such ids are never echoed back to Gemini.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub synthetic_id: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub tool_use_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    pub content: String,
    pub is_error: bool,
}

/// Content block for multi-modal messages (text, images, etc.)
///
/// Represents a single piece of content within a user message. Messages can contain
/// multiple content blocks to support rich content like text combined with images.
///
/// # Examples
///
/// Text-only message:
/// ```rust
/// use recipe_vault::ai::ContentBlock;
///
/// let blocks = vec![ContentBlock::Text { text: "What's in this recipe?".to_string() }];
/// assert_eq!(blocks.len(), 1);
/// ```
///
/// Text with image:
/// ```rust
/// use recipe_vault::ai::{ContentBlock, ImageSource};
///
/// let blocks = vec![
///     ContentBlock::Text { text: "This is grandma's recipe".to_string() },
///     ContentBlock::Image {
///         source: ImageSource {
///             source_type: "base64".to_string(),
///             media_type: "image/jpeg".to_string(),
///             data: "iVBORw0KGgo=".to_string(),
///         },
///     },
/// ];
/// assert_eq!(blocks.len(), 2);
/// ```
///
/// This structure matches the Anthropic Messages API format directly, enabling
/// seamless serialization to the API's expected format.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ContentBlock {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "image")]
    Image { source: ImageSource },
}

/// Image source for image content blocks
///
/// Contains the image data and metadata required to send images to the Claude API.
/// Images are encoded as base64 strings and transmitted inline with the message.
///
/// # Size Limits
///
/// - Frontend validation: 5MB max (enforced before sending to backend)
/// - Backend body limit: 10MB max (allows overhead for JSON payload)
/// - Claude API limit: ~5MB per image
///
/// # Supported Formats
///
/// JPEG, PNG, GIF, WebP (specified via `media_type`)
///
/// # Example
///
/// ```rust
/// use recipe_vault::ai::ImageSource;
///
/// let source = ImageSource {
///     source_type: "base64".to_string(),
///     media_type: "image/jpeg".to_string(),
///     data: "iVBORw0KGgo=".to_string(), // base64-encoded image (no data URL prefix)
/// };
/// assert_eq!(source.media_type, "image/jpeg");
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageSource {
    #[serde(rename = "type")]
    pub source_type: String, // "base64"
    pub media_type: String,  // "image/jpeg", "image/png", etc.
    pub data: String,        // base64-encoded image data (without data URL prefix)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "role")]
pub enum Message {
    #[serde(rename = "user")]
    User { content: Vec<ContentBlock> },
    #[serde(rename = "assistant")]
    Assistant {
        content: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        tool_calls: Option<Vec<ToolCall>>,
    },
    #[serde(rename = "tool")]
    Tool { tool_results: Vec<ToolResult> },
}

#[derive(Debug, Clone)]
pub enum LlmResponse {
    Text(String),
    ToolUse(Vec<ToolCall>),
    TextWithToolUse { text: String, tool_calls: Vec<ToolCall> },
}

/// Extract the recipe id from the `[Current recipe context]` block the chat
/// handler appends to the user message, for the mock provider.
fn mock_current_recipe_id(messages: &[Message]) -> Option<String> {
    messages.iter().rev().find_map(|m| match m {
        Message::User { content } => content.iter().find_map(|block| match block {
            ContentBlock::Text { text } => text
                .lines()
                .find_map(|line| line.strip_prefix("recipe_id: "))
                .map(|id| id.trim().to_string()),
            _ => None,
        }),
        _ => None,
    })
}

/// Extract the page's displayed servings (`page_servings: N`) from the
/// `[Current recipe context]` block, for the mock provider.
fn mock_page_servings(messages: &[Message]) -> Option<u32> {
    messages.iter().rev().find_map(|m| match m {
        Message::User { content } => content.iter().find_map(|block| match block {
            ContentBlock::Text { text } => text
                .lines()
                .find_map(|line| line.strip_prefix("page_servings: "))
                .and_then(|n| n.trim().parse().ok()),
            _ => None,
        }),
        _ => None,
    })
}

/// One usage line per Gemini response, for cost tracking. Counts and the
/// finish reason only, never content; missing counts are 0.
fn gemini_usage_line(model: &str, response: &serde_json::Value) -> String {
    let usage = response.get("usageMetadata");
    let count = |field: &str| {
        usage
            .and_then(|u| u.get(field))
            .and_then(|n| n.as_u64())
            .unwrap_or(0)
    };
    format!(
        "gemini usage model={} prompt_tokens={} output_tokens={} thoughts_tokens={} cached_tokens={} finish_reason={}",
        model,
        count("promptTokenCount"),
        count("candidatesTokenCount"),
        count("thoughtsTokenCount"),
        count("cachedContentTokenCount"),
        gemini_finish_reason(response).unwrap_or("UNKNOWN")
    )
}

fn gemini_finish_reason(response: &serde_json::Value) -> Option<&str> {
    response
        .get("candidates")
        .and_then(|c| c.as_array())
        .and_then(|arr| arr.first())
        .and_then(|candidate| candidate.get("finishReason"))
        .and_then(|r| r.as_str())
}

/// Finish reasons that mean the model refused or failed to produce a reply.
const GEMINI_BLOCKED_FINISH_REASONS: &[&str] = &[
    "SAFETY",
    "RECITATION",
    "PROHIBITED_CONTENT",
    "BLOCKLIST",
    "SPII",
    "MALFORMED_FUNCTION_CALL",
];

impl LlmProvider {
    pub fn new(provider_type: LlmProviderType, api_key: String, model: String, http_client: Option<reqwest::Client>) -> Self {
        Self {
            provider_type,
            api_key,
            model,
            client: http_client.unwrap_or_else(reqwest::Client::new),
            mock_recipe_id: None,
            gemini_options: GeminiOptions::default(),
        }
    }

    /// Set the Gemini request options; a no-op for other providers.
    pub fn with_gemini_options(mut self, options: GeminiOptions) -> Self {
        self.gemini_options = options;
        self
    }

    /// The Gemini request options this provider sends.
    pub fn gemini_options(&self) -> &GeminiOptions {
        &self.gemini_options
    }

    pub fn anthropic(api_key: String, model: String) -> Self {
        Self::new(LlmProviderType::Anthropic, api_key, model, None)
    }

    pub fn gemini(api_key: String, model: String) -> Self {
        Self::new(LlmProviderType::Gemini, api_key, model, None)
    }

    pub fn mock(mock_recipe_id: Option<String>) -> Self {
        Self {
            provider_type: LlmProviderType::Mock,
            api_key: String::new(),
            model: String::new(),
            client: reqwest::Client::new(),
            mock_recipe_id,
            gemini_options: GeminiOptions::default(),
        }
    }

    pub async fn complete(
        &self,
        messages: &[Message],
        tools: &[ToolDefinition],
        system_prompt: Option<&str>,
    ) -> Result<LlmResponse, LlmError> {
        match self.provider_type {
            LlmProviderType::Anthropic => self.complete_anthropic(messages, tools, system_prompt).await,
            LlmProviderType::Gemini => self.complete_gemini(messages, tools, system_prompt).await,
            LlmProviderType::Mock => Ok(self.complete_mock(messages, system_prompt)),
        }
    }

    fn complete_mock(&self, messages: &[Message], system_prompt: Option<&str>) -> LlmResponse {
        // Tag assessment is identified by its own system prompt so the deterministic
        // tag answer can never be confused with the chat or difficulty branches below.
        if system_prompt == Some(crate::ai::tag_assessment::TAG_ASSESSMENT_SYSTEM_PROMPT) {
            return LlmResponse::Text(r#"["main", "curry"]"#.to_string());
        }

        // If the last message is a tool result, return a text-only response.
        // This simulates the real LLM producing final text after seeing tool results,
        // which is how the agent loop works: TextWithToolUse -> execute tools -> Text.
        if let Some(Message::Tool { tool_results }) = messages.last() {
            let last_user_message = messages
                .iter()
                .rev()
                .find_map(|m| match m {
                    Message::User { content } => {
                        // Extract text from first Text block
                        content.iter().find_map(|block| match block {
                            ContentBlock::Text { text } => Some(text.as_str()),
                            _ => None,
                        })
                    }
                    _ => None,
                })
                .unwrap_or("");

            let lower = last_user_message.to_lowercase();

            // Meal plan two-step flow:
            // Step 1: list_recipes result (JSON with "recipes" key) → dispatch display_meal_plan
            // Step 2: display_meal_plan result → return final text
            if lower.contains("meal") && lower.contains("plan") {
                if let Some(first_result) = tool_results.first() {
                    if !first_result.is_error {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&first_result.content) {
                            if let Some(recipes) = parsed.get("recipes").and_then(|v| v.as_array()) {
                                if !recipes.is_empty() {
                                    let centrepiece_id = recipes[0]
                                        .get("recipe_id")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("")
                                        .to_string();
                                    let mut recipe_entries = vec![
                                        serde_json::json!({"recipe_id": centrepiece_id, "role": "centrepiece"})
                                    ];
                                    if recipes.len() >= 2 {
                                        let side_id = recipes[1]
                                            .get("recipe_id")
                                            .and_then(|v| v.as_str())
                                            .unwrap_or("")
                                            .to_string();
                                        recipe_entries.push(serde_json::json!({"recipe_id": side_id, "role": "side"}));
                                    }
                                    return LlmResponse::ToolUse(vec![ToolCall {
                                        id: "toolu_mock_meal_plan".to_string(),
                                        name: "display_meal_plan".to_string(),
                                        arguments: serde_json::json!({
                                            "title": "Mock Dinner Party",
                                            "guest_count": 4,
                                            "recipes": recipe_entries
                                        }),
                                        thought_signature: None,
                                        synthetic_id: false,
                                    }]);
                                }
                            }
                        }
                    }
                }
                // display_meal_plan result is back, or recipe list was empty
                return LlmResponse::Text("I've assembled your meal plan for you!".to_string());
            }

            if lower.contains("timer") {
                return LlmResponse::Text("Timer started for step 2.".to_string());
            }

            if let Some(servings) = tool_results
                .iter()
                .filter(|r| r.name.as_deref() == Some("set_servings") && !r.is_error)
                .find_map(|r| {
                    serde_json::from_str::<serde_json::Value>(&r.content)
                        .ok()
                        .and_then(|v| v.get("servings").and_then(|n| n.as_u64()))
                })
            {
                return LlmResponse::Text(format!(
                    "Showing {} servings on the page — the saved recipe is unchanged.",
                    servings
                ));
            }

            if lower.contains("update") || lower.contains("save") {
                return LlmResponse::Text("Halved it — serves 2 now.".to_string());
            }

            if lower.contains("list") {
                return LlmResponse::Text(
                    "Here are all your saved recipes:\n\n## 1. **Chicken Curry**\n\
                     A flavorful, aromatic curry with coconut milk\n\n\
                     Prep: 15 min | Cook: 30 min | Total: 45 min | Servings: 4"
                        .to_string(),
                );
            } else if lower.contains("show") || lower.contains("display") {
                return LlmResponse::Text(
                    "I've pulled up the recipe in the side panel for you! \
                     It's a flavorful dish that comes together in about 45 minutes."
                        .to_string(),
                );
            } else {
                return LlmResponse::Text(
                    "Done! I've completed the requested action.".to_string(),
                );
            }
        }

        // Get the last user message
        let last_message = messages
            .iter()
            .rev()
            .find_map(|m| match m {
                Message::User { content } => {
                    // Extract text from first Text block
                    content.iter().find_map(|block| match block {
                        ContentBlock::Text { text } => Some(text.as_str()),
                        _ => None,
                    })
                }
                _ => None,
            })
            .unwrap_or("");

        let lower_message = last_message.to_lowercase();

        // Pattern match on input to return appropriate response
        if lower_message.contains("difficulty") && lower_message.contains("rating") {
            // Difficulty assessment query - return a valid rating (3 = medium)
            LlmResponse::Text("3".to_string())
        } else if lower_message.contains("meal") && lower_message.contains("plan") {
            // Meal plan flow: first list recipes to get their real IDs from the DB,
            // then on the next call (after Tool result) dispatch display_meal_plan.
            LlmResponse::ToolUse(vec![ToolCall {
                id: "toolu_mock_meal_list".to_string(),
                name: "list_recipes".to_string(),
                arguments: serde_json::json!({}),
                thought_signature: None,
                synthetic_id: false,
            }])
        } else if lower_message.contains("timer") {
            // Start a short timer attached to method step 2 so e2e tests can assert
            // the timer pill and the step highlight deterministically.
            LlmResponse::ToolUse(vec![ToolCall {
                id: "toolu_mock_timer".to_string(),
                name: "start_timer".to_string(),
                arguments: serde_json::json!({
                    "duration_minutes": 0.1,
                    "label": "Mock timer",
                    "step_number": 2
                }),
                thought_signature: None,
                synthetic_id: false,
            }])
        } else if lower_message.contains("halve") {
            // Scale the page for tonight, never the saved recipe: half the page's
            // servings, rounded up, at least 1. Without a value, text only.
            match mock_page_servings(messages) {
                Some(n) => LlmResponse::ToolUse(vec![ToolCall {
                    id: "toolu_mock_servings".to_string(),
                    name: "set_servings".to_string(),
                    arguments: serde_json::json!({ "servings": n.div_ceil(2).max(1) }),
                    thought_signature: None,
                    synthetic_id: false,
                }]),
                None => LlmResponse::Text(
                    "Use the servings at the top of the recipe to halve it for tonight.".to_string(),
                ),
            }
        } else if (lower_message.contains("update") || lower_message.contains("save"))
            && let Some(recipe_id) = mock_current_recipe_id(messages).or_else(|| self.mock_recipe_id.clone())
        {
            // Edit the active recipe so the margin-note refresh path is testable
            // without a real provider.
            LlmResponse::ToolUse(vec![ToolCall {
                id: "toolu_mock_update".to_string(),
                name: "update_recipe".to_string(),
                arguments: serde_json::json!({
                    "recipe_id": recipe_id,
                    "servings": 2
                }),
                thought_signature: None,
                synthetic_id: false,
            }])
        } else if lower_message.contains("list") {
            // Return list_recipes tool call; the agent loop will execute the tool,
            // then call us again with the tool results, and we'll return Text above.
            LlmResponse::ToolUse(vec![ToolCall {
                id: "toolu_mock_list".to_string(),
                name: "list_recipes".to_string(),
                arguments: serde_json::json!({}),
                thought_signature: None,
                synthetic_id: false,
            }])
        } else if lower_message.contains("show") || lower_message.contains("display") {
            // Return display_recipe tool call
            let recipe_id = self
                .mock_recipe_id
                .clone()
                .unwrap_or_else(|| "9ebef851-3333-47ec-9238-2757ecafcf4e".to_string());

            LlmResponse::ToolUse(vec![ToolCall {
                id: "toolu_mock_display".to_string(),
                name: "display_recipe".to_string(),
                arguments: serde_json::json!({
                    "recipe_id": recipe_id
                }),
                thought_signature: None,
                synthetic_id: false,
            }])
        } else {
            // Default response for other queries
            LlmResponse::Text(
                "I'm a mock assistant. Try asking me to 'list recipes' or 'show a recipe'."
                    .to_string(),
            )
        }
    }

    async fn complete_anthropic(
        &self,
        messages: &[Message],
        tools: &[ToolDefinition],
        system_prompt: Option<&str>,
    ) -> Result<LlmResponse, LlmError> {
        let mut body: HashMap<String, serde_json::Value> = HashMap::new();
        body.insert("model".to_string(), serde_json::json!(self.model));
        body.insert("max_tokens".to_string(), serde_json::json!(4096));

        if let Some(system) = system_prompt {
            body.insert("system".to_string(), serde_json::json!([{
                "type": "text",
                "text": system,
                "cache_control": {"type": "ephemeral"}
            }]));
        }

        let anthropic_messages: Vec<serde_json::Value> = messages
            .iter()
            .map(|m| self.message_to_anthropic(m))
            .collect();
        body.insert("messages".to_string(), serde_json::json!(anthropic_messages));

        if !tools.is_empty() {
            let anthropic_tools: Vec<serde_json::Value> = tools
                .iter()
                .map(|t| {
                    serde_json::json!({
                        "name": t.name,
                        "description": t.description,
                        "input_schema": t.input_schema
                    })
                })
                .collect();
            body.insert("tools".to_string(), serde_json::json!(anthropic_tools));
        }

        let response = self
            .client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(LlmError::ApiError(error_text));
        }

        let response_json: serde_json::Value = response.json().await?;
        self.parse_anthropic_response(response_json)
    }

    fn message_to_anthropic(&self, message: &Message) -> serde_json::Value {
        match message {
            Message::User { content } => {
                // Convert content blocks to Anthropic API format
                let content_json: Vec<serde_json::Value> = content
                    .iter()
                    .map(|block| match block {
                        ContentBlock::Text { text } => {
                            serde_json::json!({
                                "type": "text",
                                "text": text
                            })
                        }
                        ContentBlock::Image { source } => {
                            serde_json::json!({
                                "type": "image",
                                "source": {
                                    "type": source.source_type,
                                    "media_type": source.media_type,
                                    "data": source.data
                                }
                            })
                        }
                    })
                    .collect();

                serde_json::json!({
                    "role": "user",
                    "content": content_json
                })
            }
            Message::Assistant { content, tool_calls } => {
                let mut content_blocks: Vec<serde_json::Value> = Vec::new();
                if let Some(text) = content
                    && !text.is_empty() {
                        content_blocks.push(serde_json::json!({
                            "type": "text",
                            "text": text
                        }));
                    }
                if let Some(calls) = tool_calls {
                    for call in calls {
                        content_blocks.push(serde_json::json!({
                            "type": "tool_use",
                            "id": call.id,
                            "name": call.name,
                            "input": call.arguments
                        }));
                    }
                }
                serde_json::json!({
                    "role": "assistant",
                    "content": content_blocks
                })
            }
            Message::Tool { tool_results } => {
                let content_blocks: Vec<serde_json::Value> = tool_results
                    .iter()
                    .map(|r| {
                        serde_json::json!({
                            "type": "tool_result",
                            "tool_use_id": r.tool_use_id,
                            "content": r.content,
                            "is_error": r.is_error
                        })
                    })
                    .collect();
                serde_json::json!({
                    "role": "user",
                    "content": content_blocks
                })
            }
        }
    }

    fn parse_anthropic_response(&self, response: serde_json::Value) -> Result<LlmResponse, LlmError> {
        let content = response
            .get("content")
            .and_then(|c| c.as_array())
            .ok_or_else(|| LlmError::InvalidResponse("Missing content array".to_string()))?;

        let mut text_parts: Vec<String> = Vec::new();
        let mut tool_calls: Vec<ToolCall> = Vec::new();

        for block in content {
            let block_type = block.get("type").and_then(|t| t.as_str());
            match block_type {
                Some("text") => {
                    if let Some(text) = block.get("text").and_then(|t| t.as_str()) {
                        text_parts.push(text.to_string());
                    }
                }
                Some("tool_use") => {
                    let id = block
                        .get("id")
                        .and_then(|i| i.as_str())
                        .unwrap_or("")
                        .to_string();
                    let name = block
                        .get("name")
                        .and_then(|n| n.as_str())
                        .unwrap_or("")
                        .to_string();
                    let arguments = block.get("input").cloned().unwrap_or(serde_json::json!({}));
                    tool_calls.push(ToolCall {
                        id,
                        name,
                        arguments,
                        thought_signature: None,
                        synthetic_id: false,
                    });
                }
                _ => {}
            }
        }

        let text = text_parts.join("");
        if tool_calls.is_empty() {
            Ok(LlmResponse::Text(text))
        } else if text.is_empty() {
            Ok(LlmResponse::ToolUse(tool_calls))
        } else {
            Ok(LlmResponse::TextWithToolUse { text, tool_calls })
        }
    }

    async fn complete_gemini(
        &self,
        messages: &[Message],
        tools: &[ToolDefinition],
        system_prompt: Option<&str>,
    ) -> Result<LlmResponse, LlmError> {
        let body = self.build_gemini_request(messages, tools, system_prompt);
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
            self.model
        );

        let response = self
            .client
            .post(url)
            .header("x-goog-api-key", &self.api_key)
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(LlmError::ApiError(error_text));
        }

        let response_json: serde_json::Value = response.json().await?;
        tracing::info!("{}", gemini_usage_line(&self.model, &response_json));
        self.parse_gemini_response(response_json)
    }

    fn build_gemini_request(
        &self,
        messages: &[Message],
        tools: &[ToolDefinition],
        system_prompt: Option<&str>,
    ) -> serde_json::Value {
        // Ids the app invented; they pair calls with results but are never sent
        let synthetic_ids: std::collections::HashSet<&str> = messages
            .iter()
            .filter_map(|m| match m {
                Message::Assistant { tool_calls: Some(calls), .. } => Some(calls),
                _ => None,
            })
            .flatten()
            .filter(|call| call.synthetic_id)
            .map(|call| call.id.as_str())
            .collect();

        let mut body = serde_json::json!({
            "contents": messages
                .iter()
                .map(|m| self.message_to_gemini(m, &synthetic_ids))
                .collect::<Vec<_>>(),
            "generationConfig": {
                "maxOutputTokens": self.gemini_options.max_output_tokens
            }
        });

        // thinkingLevel is rejected by Gemini 2.5, so only 3+ models get it
        if let Some(level) = self.gemini_options.thinking_level
            && (self.model.starts_with("gemini-3") || self.model.starts_with("gemini-4")) {
                body["generationConfig"]["thinkingConfig"] = serde_json::json!({
                    "thinkingLevel": level.as_str()
                });
            }

        if let Some(system) = system_prompt {
            body["systemInstruction"] = serde_json::json!({
                "parts": [{"text": system}]
            });
        }

        if !tools.is_empty() {
            body["tools"] = serde_json::json!([{
                "functionDeclarations": tools
                    .iter()
                    .map(|t| self.tool_to_gemini(t))
                    .collect::<Vec<_>>()
            }]);
        }

        body
    }

    fn tool_to_gemini(&self, tool: &ToolDefinition) -> serde_json::Value {
        serde_json::json!({
            "name": tool.name,
            "description": tool.description,
            "parameters": Self::sanitize_gemini_schema(&tool.input_schema)
        })
    }

    fn sanitize_gemini_schema(schema: &serde_json::Value) -> serde_json::Value {
        match schema {
            serde_json::Value::Object(map) => {
                let mut cleaned = serde_json::Map::new();
                for (key, value) in map {
                    if matches!(
                        key.as_str(),
                        "additionalProperties"
                            | "exclusiveMaximum"
                            | "exclusiveMinimum"
                            | "$schema"
                            | "$defs"
                    ) {
                        continue;
                    }
                    cleaned.insert(key.clone(), Self::sanitize_gemini_schema(value));
                }
                serde_json::Value::Object(cleaned)
            }
            serde_json::Value::Array(items) => serde_json::Value::Array(
                items.iter().map(Self::sanitize_gemini_schema).collect(),
            ),
            _ => schema.clone(),
        }
    }

    fn message_to_gemini(
        &self,
        message: &Message,
        synthetic_ids: &std::collections::HashSet<&str>,
    ) -> serde_json::Value {
        match message {
            Message::User { content } => {
                let parts: Vec<serde_json::Value> = content
                    .iter()
                    .map(|block| match block {
                        ContentBlock::Text { text } => serde_json::json!({ "text": text }),
                        ContentBlock::Image { source } => serde_json::json!({
                            "inline_data": {
                                "mime_type": source.media_type,
                                "data": source.data
                            }
                        }),
                    })
                    .collect();

                serde_json::json!({
                    "role": "user",
                    "parts": parts
                })
            }
            Message::Assistant { content, tool_calls } => {
                let mut parts: Vec<serde_json::Value> = Vec::new();
                if let Some(text) = content
                    && !text.is_empty() {
                        parts.push(serde_json::json!({ "text": text }));
                    }
                if let Some(calls) = tool_calls {
                    for call in calls {
                        let mut part = serde_json::json!({
                            "functionCall": {
                                "id": call.id,
                                "name": call.name,
                                "args": call.arguments
                            }
                        });
                        // Echo the part as the model returned it: no invented id
                        if call.synthetic_id
                            && let Some(function_call) = part["functionCall"].as_object_mut() {
                                function_call.remove("id");
                            }
                        if let Some(signature) = &call.thought_signature {
                            part["thoughtSignature"] = serde_json::json!(signature);
                        }
                        parts.push(part);
                    }
                }

                serde_json::json!({
                    "role": "model",
                    "parts": parts
                })
            }
            Message::Tool { tool_results } => {
                let parts: Vec<serde_json::Value> = tool_results
                    .iter()
                    .map(|result| {
                        let mut part = serde_json::json!({
                            "functionResponse": {
                                "id": result.tool_use_id,
                                "name": result.name.as_deref().unwrap_or(&result.tool_use_id),
                                "response": {
                                    "result": result.content,
                                    "is_error": result.is_error
                                }
                            }
                        });
                        if synthetic_ids.contains(result.tool_use_id.as_str())
                            && let Some(function_response) = part["functionResponse"].as_object_mut() {
                                function_response.remove("id");
                            }
                        part
                    })
                    .collect();

                serde_json::json!({
                    "role": "user",
                    "parts": parts
                })
            }
        }
    }

    fn parse_gemini_response(&self, response: serde_json::Value) -> Result<LlmResponse, LlmError> {
        let finish_reason = gemini_finish_reason(&response);
        let block_reason = response
            .get("promptFeedback")
            .and_then(|f| f.get("blockReason"))
            .and_then(|r| r.as_str());
        let empty = Vec::new();
        let parts = response
            .get("candidates")
            .and_then(|c| c.as_array())
            .and_then(|arr| arr.first())
            .and_then(|candidate| candidate.get("content"))
            .and_then(|content| content.get("parts"))
            .and_then(|parts| parts.as_array());

        let mut text_parts: Vec<String> = Vec::new();
        let mut tool_calls: Vec<ToolCall> = Vec::new();

        for (index, part) in parts.unwrap_or(&empty).iter().enumerate() {
            if let Some(text) = part.get("text").and_then(|t| t.as_str()) {
                text_parts.push(text.to_string());
            }

            if let Some(function_call) = part.get("functionCall") {
                let name = function_call
                    .get("name")
                    .and_then(|n| n.as_str())
                    .ok_or_else(|| {
                        LlmError::InvalidResponse("Gemini functionCall missing name".to_string())
                    })?
                    .to_string();
                let model_id = function_call
                    .get("id")
                    .and_then(|i| i.as_str())
                    .map(|s| s.to_string());
                let synthetic_id = model_id.is_none();
                let id = model_id.unwrap_or_else(|| format!("gemini_call_{}", index));
                let arguments = function_call
                    .get("args")
                    .cloned()
                    .unwrap_or_else(|| serde_json::json!({}));
                let thought_signature = part
                    .get("thoughtSignature")
                    .or_else(|| part.get("thought_signature"))
                    .and_then(|s| s.as_str())
                    .map(|s| s.to_string());
                tool_calls.push(ToolCall {
                    id,
                    name,
                    arguments,
                    thought_signature,
                    synthetic_id,
                });
            }
        }

        let text = text_parts.join("");
        let has_content = !text.is_empty() || !tool_calls.is_empty();

        // Reasons are logged and returned by name only, never with content
        if let Some(reason) = block_reason
            && !has_content {
                tracing::warn!("gemini prompt blocked: block_reason={}", reason);
                return Err(LlmError::Incomplete(format!(
                    "The AI service blocked this request ({})",
                    reason
                )));
            }
        match finish_reason {
            Some("MAX_TOKENS") => {
                tracing::warn!("gemini reply hit the output budget: finish_reason=MAX_TOKENS");
                if !has_content {
                    return Err(LlmError::Incomplete(
                        "The AI reply was cut off before it finished (MAX_TOKENS)".to_string(),
                    ));
                }
            }
            Some(reason) if GEMINI_BLOCKED_FINISH_REASONS.contains(&reason) && !has_content => {
                tracing::warn!("gemini reply stopped without content: finish_reason={}", reason);
                return Err(LlmError::Incomplete(format!(
                    "The AI service did not return a usable reply ({})",
                    reason
                )));
            }
            _ => {}
        }
        if parts.is_none() {
            return Err(LlmError::InvalidResponse(
                "Missing candidates[0].content.parts".to_string(),
            ));
        }

        if tool_calls.is_empty() {
            Ok(LlmResponse::Text(text))
        } else if text.is_empty() {
            Ok(LlmResponse::ToolUse(tool_calls))
        } else {
            Ok(LlmResponse::TextWithToolUse { text, tool_calls })
        }
    }

}

#[cfg(test)]
mod tests {
    use super::*;

    fn provider() -> LlmProvider {
        LlmProvider::new(
            LlmProviderType::Gemini,
            "test-key".to_string(),
            "gemini-test".to_string(),
            None,
        )
    }

    #[test]
    fn test_gemini_request_maps_text_image_and_system_prompt() {
        let llm = provider();
        let body = llm.build_gemini_request(
            &[Message::User {
                content: vec![
                    ContentBlock::Text {
                        text: "Extract this recipe".to_string(),
                    },
                    ContentBlock::Image {
                        source: ImageSource {
                            source_type: "base64".to_string(),
                            media_type: "image/jpeg".to_string(),
                            data: "abc123".to_string(),
                        },
                    },
                ],
            }],
            &[],
            Some("You are a cooking assistant."),
        );

        assert_eq!(body["systemInstruction"]["parts"][0]["text"], "You are a cooking assistant.");
        assert_eq!(body["contents"][0]["role"], "user");
        assert_eq!(body["contents"][0]["parts"][0]["text"], "Extract this recipe");
        assert_eq!(
            body["contents"][0]["parts"][1]["inline_data"]["mime_type"],
            "image/jpeg"
        );
        assert_eq!(body["contents"][0]["parts"][1]["inline_data"]["data"], "abc123");
        assert!(body.get("tools").is_none());
    }

    #[test]
    fn test_gemini_request_maps_tools_tool_calls_and_results() {
        let llm = provider();
        let tool = ToolDefinition {
            name: "list_recipes".to_string(),
            description: "List recipes".to_string(),
            input_schema: serde_json::json!({"type": "object", "properties": {}}),
        };

        let body = llm.build_gemini_request(
            &[
                Message::Assistant {
                    content: Some("Checking.".to_string()),
                    tool_calls: Some(vec![ToolCall {
                        id: "call-1".to_string(),
                        name: "list_recipes".to_string(),
                        arguments: serde_json::json!({}),
                        thought_signature: Some("sig-1".to_string()),
                        synthetic_id: false,
                    }]),
                },
                Message::Tool {
                    tool_results: vec![ToolResult {
                        tool_use_id: "call-1".to_string(),
                        name: Some("list_recipes".to_string()),
                        content: "{\"recipes\":[]}".to_string(),
                        is_error: false,
                    }],
                },
            ],
            &[tool],
            None,
        );

        assert_eq!(body["tools"][0]["functionDeclarations"][0]["name"], "list_recipes");
        assert_eq!(body["contents"][0]["role"], "model");
        assert_eq!(
            body["contents"][0]["parts"][1]["functionCall"]["name"],
            "list_recipes"
        );
        assert_eq!(body["contents"][0]["parts"][1]["functionCall"]["id"], "call-1");
        assert_eq!(body["contents"][0]["parts"][1]["thoughtSignature"], "sig-1");
        assert_eq!(body["contents"][1]["role"], "user");
        assert_eq!(
            body["contents"][1]["parts"][0]["functionResponse"]["name"],
            "list_recipes"
        );
        assert_eq!(body["contents"][1]["parts"][0]["functionResponse"]["id"], "call-1");
    }

    #[test]
    fn test_gemini_tool_schema_removes_unsupported_keywords() {
        let llm = provider();
        let tool = ToolDefinition {
            name: "start_timer".to_string(),
            description: "Start a timer".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "duration": {
                        "type": "number",
                        "exclusiveMinimum": 0,
                        "exclusiveMaximum": 1440
                    }
                },
                "$defs": {},
                "additionalProperties": false
            }),
        };

        let mapped = llm.tool_to_gemini(&tool);
        let duration = &mapped["parameters"]["properties"]["duration"];
        assert!(duration.get("exclusiveMinimum").is_none());
        assert!(duration.get("exclusiveMaximum").is_none());
        assert!(mapped["parameters"].get("$defs").is_none());
        assert!(mapped["parameters"].get("additionalProperties").is_none());
    }

    #[test]
    fn test_parse_gemini_text_response() {
        let llm = provider();
        let response = serde_json::json!({
            "candidates": [{
                "content": {"parts": [{"text": "Hello there"}]}
            }]
        });

        match llm.parse_gemini_response(response).unwrap() {
            LlmResponse::Text(text) => assert_eq!(text, "Hello there"),
            other => panic!("Unexpected response: {:?}", other),
        }
    }

    #[test]
    fn test_parse_gemini_tool_response() {
        let llm = provider();
        let response = serde_json::json!({
            "candidates": [{
                "content": {
                    "parts": [{
                        "functionCall": {
                            "id": "call-1",
                            "name": "list_recipes",
                            "args": {}
                        },
                        "thoughtSignature": "sig-1"
                    }]
                }
            }]
        });

        match llm.parse_gemini_response(response).unwrap() {
            LlmResponse::ToolUse(calls) => {
                assert_eq!(calls[0].id, "call-1");
                assert_eq!(calls[0].name, "list_recipes");
                assert_eq!(calls[0].thought_signature.as_deref(), Some("sig-1"));
            }
            other => panic!("Unexpected response: {:?}", other),
        }
    }

    #[test]
    fn test_parse_gemini_text_with_tool_response() {
        let llm = provider();
        let response = serde_json::json!({
            "candidates": [{
                "content": {
                    "parts": [
                        {"text": "I will check."},
                        {
                            "functionCall": {
                                "id": "call-2",
                                "name": "display_recipe",
                                "args": {"recipe_id": "abc"}
                            }
                        }
                    ]
                }
            }]
        });

        match llm.parse_gemini_response(response).unwrap() {
            LlmResponse::TextWithToolUse { text, tool_calls } => {
                assert_eq!(text, "I will check.");
                assert_eq!(tool_calls[0].name, "display_recipe");
                assert_eq!(tool_calls[0].arguments["recipe_id"], "abc");
            }
            other => panic!("Unexpected response: {:?}", other),
        }
    }

    fn provider_for(model: &str, options: GeminiOptions) -> LlmProvider {
        LlmProvider::gemini("test-key".to_string(), model.to_string()).with_gemini_options(options)
    }

    fn user(text: &str) -> Message {
        Message::User {
            content: vec![ContentBlock::Text { text: text.to_string() }],
        }
    }

    #[test]
    fn test_gemini_request_default_output_budget() {
        let body = provider().build_gemini_request(&[user("hi")], &[], None);
        assert_eq!(body["generationConfig"]["maxOutputTokens"], 16384);
    }

    #[test]
    fn test_gemini_request_output_budget_override() {
        let llm = provider_for(
            "gemini-3.8-flash",
            GeminiOptions { max_output_tokens: 32768, thinking_level: None },
        );
        let body = llm.build_gemini_request(&[user("hi")], &[], None);
        assert_eq!(body["generationConfig"]["maxOutputTokens"], 32768);
    }

    #[test]
    fn test_gemini_request_thinking_level_unset_sends_no_thinking_config() {
        let llm = provider_for("gemini-3.8-flash", GeminiOptions::default());
        let body = llm.build_gemini_request(&[user("hi")], &[], None);
        assert!(body["generationConfig"].get("thinkingConfig").is_none());
    }

    #[test]
    fn test_gemini_request_thinking_level_sent_to_gemini_3_and_4() {
        for model in ["gemini-3.8-flash", "gemini-4-argon"] {
            let llm = provider_for(
                model,
                GeminiOptions { thinking_level: Some(GeminiThinkingLevel::Low), ..GeminiOptions::default() },
            );
            let body = llm.build_gemini_request(&[user("hi")], &[], None);
            assert_eq!(
                body["generationConfig"]["thinkingConfig"],
                serde_json::json!({"thinkingLevel": "low"}),
                "model {}",
                model
            );
        }
    }

    #[test]
    fn test_gemini_request_thinking_level_not_sent_to_gemini_2_5() {
        let llm = provider_for(
            "gemini-2.5-pro",
            GeminiOptions { thinking_level: Some(GeminiThinkingLevel::Low), ..GeminiOptions::default() },
        );
        let body = llm.build_gemini_request(&[user("hi")], &[], None);
        assert!(body["generationConfig"].get("thinkingConfig").is_none());
        assert_eq!(body["generationConfig"]["maxOutputTokens"], 16384);
    }

    #[test]
    fn test_gemini_usage_line_with_all_counts() {
        let response = serde_json::json!({
            "candidates": [{"content": {"parts": [{"text": "secret recipe text"}]}, "finishReason": "STOP"}],
            "usageMetadata": {
                "promptTokenCount": 1200,
                "candidatesTokenCount": 85,
                "thoughtsTokenCount": 410,
                "cachedContentTokenCount": 1024,
                "totalTokenCount": 1695
            }
        });
        let line = gemini_usage_line("gemini-3.8-flash", &response);
        assert_eq!(
            line,
            "gemini usage model=gemini-3.8-flash prompt_tokens=1200 output_tokens=85 thoughts_tokens=410 cached_tokens=1024 finish_reason=STOP"
        );
        assert!(!line.contains("secret"));
    }

    #[test]
    fn test_gemini_usage_line_missing_counts_and_reason() {
        let response = serde_json::json!({
            "candidates": [{"content": {"parts": [{"text": "x"}]}}],
            "usageMetadata": {"promptTokenCount": 7, "candidatesTokenCount": 3}
        });
        assert_eq!(
            gemini_usage_line("gemini-2.5-pro", &response),
            "gemini usage model=gemini-2.5-pro prompt_tokens=7 output_tokens=3 thoughts_tokens=0 cached_tokens=0 finish_reason=UNKNOWN"
        );
    }

    #[test]
    fn test_parse_gemini_stop_parses_as_before() {
        let llm = provider();
        let response = serde_json::json!({
            "candidates": [{
                "content": {"parts": [
                    {"text": "Checking."},
                    {"functionCall": {"id": "c1", "name": "list_recipes", "args": {}}}
                ]},
                "finishReason": "STOP"
            }]
        });
        match llm.parse_gemini_response(response).unwrap() {
            LlmResponse::TextWithToolUse { text, tool_calls } => {
                assert_eq!(text, "Checking.");
                assert_eq!(tool_calls[0].id, "c1");
                assert!(!tool_calls[0].synthetic_id);
            }
            other => panic!("Unexpected response: {:?}", other),
        }
    }

    #[test]
    fn test_parse_gemini_max_tokens_without_content_is_cut_off_error() {
        let llm = provider();
        let response = serde_json::json!({
            "candidates": [{"content": {"role": "model"}, "finishReason": "MAX_TOKENS"}]
        });
        let err = llm.parse_gemini_response(response).unwrap_err();
        assert!(matches!(err, LlmError::Incomplete(_)), "got {:?}", err);
        assert!(err.to_string().contains("cut off"), "got {}", err);
    }

    #[test]
    fn test_parse_gemini_max_tokens_with_partial_text_returns_text() {
        let llm = provider();
        let response = serde_json::json!({
            "candidates": [{"content": {"parts": [{"text": "Preheat the oven to"}]}, "finishReason": "MAX_TOKENS"}]
        });
        match llm.parse_gemini_response(response).unwrap() {
            LlmResponse::Text(text) => assert_eq!(text, "Preheat the oven to"),
            other => panic!("Unexpected response: {:?}", other),
        }
    }

    #[test]
    fn test_parse_gemini_blocked_finish_reasons_name_the_reason() {
        let llm = provider();
        for reason in ["SAFETY", "RECITATION", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "MALFORMED_FUNCTION_CALL"] {
            let response = serde_json::json!({
                "candidates": [{"finishReason": reason, "finishMessage": "leaked model content"}]
            });
            let err = llm.parse_gemini_response(response).unwrap_err();
            assert!(matches!(err, LlmError::Incomplete(_)), "{}: got {:?}", reason, err);
            let message = err.to_string();
            assert!(message.contains(reason), "{}: got {}", reason, message);
            assert!(!message.contains("leaked"), "{}: got {}", reason, message);
        }
    }

    #[test]
    fn test_parse_gemini_prompt_block_reason_names_the_reason() {
        let llm = provider();
        let response = serde_json::json!({
            "promptFeedback": {"blockReason": "SAFETY"}
        });
        let err = llm.parse_gemini_response(response).unwrap_err();
        assert!(matches!(err, LlmError::Incomplete(_)), "got {:?}", err);
        assert!(err.to_string().contains("SAFETY"), "got {}", err);
    }

    #[test]
    fn test_parse_gemini_missing_id_is_marked_synthetic() {
        let llm = provider();
        let response = serde_json::json!({
            "candidates": [{"content": {"parts": [
                {"functionCall": {"name": "list_recipes", "args": {}}, "thoughtSignature": "sig-9"}
            ]}, "finishReason": "STOP"}]
        });
        match llm.parse_gemini_response(response).unwrap() {
            LlmResponse::ToolUse(calls) => {
                assert!(calls[0].synthetic_id);
                assert!(!calls[0].id.is_empty());
            }
            other => panic!("Unexpected response: {:?}", other),
        }
    }

    fn echo_body(call: ToolCall) -> serde_json::Value {
        let tool_use_id = call.id.clone();
        provider().build_gemini_request(
            &[
                user("list"),
                Message::Assistant { content: None, tool_calls: Some(vec![call]) },
                Message::Tool {
                    tool_results: vec![ToolResult {
                        tool_use_id,
                        name: Some("list_recipes".to_string()),
                        content: "{}".to_string(),
                        is_error: false,
                    }],
                },
            ],
            &[],
            None,
        )
    }

    #[test]
    fn test_gemini_echo_model_supplied_id_on_both_parts() {
        let body = echo_body(ToolCall {
            id: "abc".to_string(),
            name: "list_recipes".to_string(),
            arguments: serde_json::json!({}),
            thought_signature: Some("sig-1".to_string()),
            synthetic_id: false,
        });
        assert_eq!(body["contents"][1]["parts"][0]["functionCall"]["id"], "abc");
        assert_eq!(body["contents"][1]["parts"][0]["thoughtSignature"], "sig-1");
        assert_eq!(body["contents"][2]["parts"][0]["functionResponse"]["id"], "abc");
    }

    #[test]
    fn test_gemini_echo_omits_synthetic_id_on_both_parts() {
        let body = echo_body(ToolCall {
            id: "gemini_call_0".to_string(),
            name: "list_recipes".to_string(),
            arguments: serde_json::json!({}),
            thought_signature: Some("sig-2".to_string()),
            synthetic_id: true,
        });
        let part = &body["contents"][1]["parts"][0];
        assert_eq!(
            *part,
            serde_json::json!({
                "functionCall": {"name": "list_recipes", "args": {}},
                "thoughtSignature": "sig-2"
            })
        );
        let response = &body["contents"][2]["parts"][0]["functionResponse"];
        assert!(response.get("id").is_none(), "got {}", response);
        assert_eq!(response["name"], "list_recipes");
    }

    #[test]
    fn test_tool_call_without_synthetic_flag_deserialises_as_model_supplied() {
        let call: ToolCall = serde_json::from_value(serde_json::json!({
            "id": "toolu_1",
            "name": "list_recipes",
            "arguments": {}
        }))
        .unwrap();
        assert!(!call.synthetic_id);
    }

    // ---- llm-mocking: Mock separates scaling from saving ----

    /// A user note followed by the chat handler's current-recipe block.
    fn mock_note(note: &str, servings: Option<u32>) -> Vec<Message> {
        let mut context = "[Current recipe context]\nrecipe_id: R\ntitle: Lasagne".to_string();
        if let Some(n) = servings {
            context.push_str(&format!("\npage_servings: {}\n(page_servings is what the page shows now and may differ from the saved recipe's servings.)", n));
        }
        context.push_str("\nInstruction: Treat this as the active recipe. Call get_recipe if you need full details.");
        vec![Message::User {
            content: vec![
                ContentBlock::Text { text: note.to_string() },
                ContentBlock::Text { text: context },
            ],
        }]
    }

    fn single_call(response: LlmResponse) -> ToolCall {
        match response {
            LlmResponse::ToolUse(mut calls) => {
                assert_eq!(calls.len(), 1);
                calls.remove(0)
            }
            other => panic!("expected one tool call, got {:?}", other),
        }
    }

    #[test]
    fn test_mock_halve_sets_half_the_page_servings_rounded_up() {
        let mock = LlmProvider::mock(None);
        for (n, half) in [(8, 4), (3, 2), (1, 1)] {
            let call = single_call(mock.complete_mock(&mock_note("Halve it please", Some(n)), None));
            assert_eq!(call.name, "set_servings", "N = {}", n);
            assert_eq!(call.arguments, serde_json::json!({"servings": half}), "N = {}", n);
        }
    }

    #[test]
    fn test_mock_halve_reply_names_the_servings() {
        let mock = LlmProvider::mock(None);
        let mut messages = mock_note("halve this recipe", Some(8));
        messages.push(Message::Tool {
            tool_results: vec![ToolResult {
                tool_use_id: "toolu_mock_servings".to_string(),
                name: Some("set_servings".to_string()),
                content: r#"{"servings":4,"message":"ok"}"#.to_string(),
                is_error: false,
            }],
        });
        match mock.complete_mock(&messages, None) {
            LlmResponse::Text(text) => {
                assert!(text.contains("4 servings"), "{}", text);
                assert!(text.contains("saved recipe is unchanged"), "{}", text);
            }
            other => panic!("expected text, got {:?}", other),
        }
    }

    #[test]
    fn test_mock_halve_without_servings_replies_with_text_only() {
        let mock = LlmProvider::mock(Some("R".to_string()));
        assert!(matches!(
            mock.complete_mock(&mock_note("halve this recipe", None), None),
            LlmResponse::Text(_)
        ));
    }

    #[test]
    fn test_mock_update_or_save_still_saves() {
        let mock = LlmProvider::mock(None);
        for note in ["update this recipe", "save it with cream"] {
            let call = single_call(mock.complete_mock(&mock_note(note, Some(8)), None));
            assert_eq!(call.name, "update_recipe", "{}", note);
            assert_eq!(call.arguments, serde_json::json!({"recipe_id": "R", "servings": 2}), "{}", note);
        }
    }
}

/// Built-in tool definitions for the chat interface
pub mod tools {
    use super::ToolDefinition;

    /// Creates the display_recipe tool definition for showing recipes in the artifact panel
    pub fn display_recipe_tool() -> ToolDefinition {
        ToolDefinition {
            name: "display_recipe".to_string(),
            description: "Renders the visual recipe card in the side panel. MANDATORY when the user asks to see, view, read, or cook a recipe. Provide EITHER recipe_id (from list_recipes) OR title (for searching). If you have the exact recipe_id from a previous list_recipes call, use that. If you only know the recipe name, provide the title instead.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "recipe_id": {
                        "type": "string",
                        "description": "The exact UUID from list_recipes. Use this if you have it."
                    },
                    "title": {
                        "type": "string", 
                        "description": "The recipe title to search for. Use this if you don't have the exact recipe_id."
                    }
                }
            }),
        }
    }

    /// Creates the display_meal_plan tool definition for showing a composed meal plan in the artifact panel
    pub fn display_meal_plan_tool() -> ToolDefinition {
        ToolDefinition {
            name: "display_meal_plan".to_string(),
            description: "Renders a composed meal plan in the side panel. Call this ONLY after the user has explicitly confirmed the meal composition. Resolve all recipe IDs via list_recipes first. Never call speculatively or as a preview.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "A short descriptive title for the meal plan (e.g. 'Sunday Roast', 'Summer BBQ')"
                    },
                    "guest_count": {
                        "type": "integer",
                        "description": "Number of people the meal is planned for (optional)"
                    },
                    "recipes": {
                        "type": "array",
                        "description": "Recipes in the meal plan with their roles",
                        "items": {
                            "type": "object",
                            "properties": {
                                "recipe_id": {
                                    "type": "string",
                                    "description": "The exact UUID of the recipe from list_recipes"
                                },
                                "role": {
                                    "type": "string",
                                    "enum": ["centrepiece", "side", "vegetarian alternative"],
                                    "description": "The role this recipe plays in the meal"
                                }
                            },
                            "required": ["recipe_id", "role"]
                        }
                    }
                },
                "required": ["title", "recipes"]
            }),
        }
    }
}
