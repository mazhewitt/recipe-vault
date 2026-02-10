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
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LlmProviderType {
    Anthropic,
    OpenAi,
    Mock,
}

#[derive(Debug, Clone)]
pub struct LlmProvider {
    provider_type: LlmProviderType,
    api_key: String,
    model: String,
    client: reqwest::Client,
    mock_recipe_id: Option<String>,
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub tool_use_id: String,
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

impl LlmProvider {
    pub fn new(provider_type: LlmProviderType, api_key: String, model: String) -> Self {
        Self {
            provider_type,
            api_key,
            model,
            client: reqwest::Client::new(),
            mock_recipe_id: None,
        }
    }

    pub fn anthropic(api_key: String, model: String) -> Self {
        Self::new(LlmProviderType::Anthropic, api_key, model)
    }

    pub fn openai(api_key: String, model: String) -> Self {
        Self::new(LlmProviderType::OpenAi, api_key, model)
    }

    pub fn mock(mock_recipe_id: Option<String>) -> Self {
        Self {
            provider_type: LlmProviderType::Mock,
            api_key: String::new(),
            model: String::new(),
            client: reqwest::Client::new(),
            mock_recipe_id,
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
            LlmProviderType::OpenAi => self.complete_openai(messages, tools, system_prompt).await,
            LlmProviderType::Mock => Ok(self.complete_mock(messages)),
        }
    }

    fn complete_mock(&self, messages: &[Message]) -> LlmResponse {
        // If the last message is a tool result, return a text-only response.
        // This simulates the real LLM producing final text after seeing tool results,
        // which is how the agent loop works: TextWithToolUse -> execute tools -> Text.
        if let Some(Message::Tool { .. }) = messages.last() {
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
        } else if lower_message.contains("list") {
            // Return list_recipes tool call; the agent loop will execute the tool,
            // then call us again with the tool results, and we'll return Text above.
            LlmResponse::ToolUse(vec![ToolCall {
                id: "toolu_mock_list".to_string(),
                name: "list_recipes".to_string(),
                arguments: serde_json::json!({}),
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
            body.insert("system".to_string(), serde_json::json!(system));
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
                if let Some(text) = content {
                    if !text.is_empty() {
                        content_blocks.push(serde_json::json!({
                            "type": "text",
                            "text": text
                        }));
                    }
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
                    tool_calls.push(ToolCall { id, name, arguments });
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

    async fn complete_openai(
        &self,
        messages: &[Message],
        tools: &[ToolDefinition],
        system_prompt: Option<&str>,
    ) -> Result<LlmResponse, LlmError> {
        let mut openai_messages: Vec<serde_json::Value> = Vec::new();

        if let Some(system) = system_prompt {
            openai_messages.push(serde_json::json!({
                "role": "system",
                "content": system
            }));
        }

        for msg in messages {
            openai_messages.push(self.message_to_openai(msg));
        }

        let mut body: HashMap<String, serde_json::Value> = HashMap::new();
        body.insert("model".to_string(), serde_json::json!(self.model));
        body.insert("messages".to_string(), serde_json::json!(openai_messages));

        if !tools.is_empty() {
            let openai_tools: Vec<serde_json::Value> = tools
                .iter()
                .map(|t| {
                    serde_json::json!({
                        "type": "function",
                        "function": {
                            "name": t.name,
                            "description": t.description,
                            "parameters": t.input_schema
                        }
                    })
                })
                .collect();
            body.insert("tools".to_string(), serde_json::json!(openai_tools));
        }

        let response = self
            .client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(LlmError::ApiError(error_text));
        }

        let response_json: serde_json::Value = response.json().await?;
        self.parse_openai_response(response_json)
    }

    fn message_to_openai(&self, message: &Message) -> serde_json::Value {
        match message {
            Message::User { content } => {
                // OpenAI also supports content blocks similar to Anthropic
                // If only text, we can simplify to just a string for compatibility
                if content.len() == 1 {
                    if let Some(ContentBlock::Text { text }) = content.first() {
                        return serde_json::json!({
                            "role": "user",
                            "content": text
                        });
                    }
                }

                // For multi-modal content, use array format
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
                                "type": "image_url",
                                "image_url": {
                                    "url": format!("data:{};base64,{}", source.media_type, source.data)
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
                let mut msg = serde_json::json!({
                    "role": "assistant",
                    "content": content.clone().unwrap_or_default()
                });
                if let Some(calls) = tool_calls {
                    let openai_calls: Vec<serde_json::Value> = calls
                        .iter()
                        .map(|c| {
                            serde_json::json!({
                                "id": c.id,
                                "type": "function",
                                "function": {
                                    "name": c.name,
                                    "arguments": c.arguments.to_string()
                                }
                            })
                        })
                        .collect();
                    msg["tool_calls"] = serde_json::json!(openai_calls);
                }
                msg
            }
            Message::Tool { tool_results } => {
                // OpenAI expects individual tool messages
                // For simplicity, return the first one (caller should handle multiple)
                if let Some(result) = tool_results.first() {
                    serde_json::json!({
                        "role": "tool",
                        "tool_call_id": result.tool_use_id,
                        "content": result.content
                    })
                } else {
                    serde_json::json!({
                        "role": "tool",
                        "content": ""
                    })
                }
            }
        }
    }

    fn parse_openai_response(&self, response: serde_json::Value) -> Result<LlmResponse, LlmError> {
        let choice = response
            .get("choices")
            .and_then(|c| c.as_array())
            .and_then(|arr| arr.first())
            .ok_or_else(|| LlmError::InvalidResponse("Missing choices".to_string()))?;

        let message = choice
            .get("message")
            .ok_or_else(|| LlmError::InvalidResponse("Missing message".to_string()))?;

        let content = message
            .get("content")
            .and_then(|c| c.as_str())
            .unwrap_or("")
            .to_string();

        let tool_calls: Vec<ToolCall> = message
            .get("tool_calls")
            .and_then(|tc| tc.as_array())
            .map(|calls| {
                calls
                    .iter()
                    .filter_map(|call| {
                        let id = call.get("id")?.as_str()?.to_string();
                        let function = call.get("function")?;
                        let name = function.get("name")?.as_str()?.to_string();
                        let args_str = function.get("arguments")?.as_str()?;
                        let arguments: serde_json::Value =
                            serde_json::from_str(args_str).unwrap_or(serde_json::json!({}));
                        Some(ToolCall { id, name, arguments })
                    })
                    .collect()
            })
            .unwrap_or_default();

        if tool_calls.is_empty() {
            Ok(LlmResponse::Text(content))
        } else if content.is_empty() {
            Ok(LlmResponse::ToolUse(tool_calls))
        } else {
            Ok(LlmResponse::TextWithToolUse {
                text: content,
                tool_calls,
            })
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
}
