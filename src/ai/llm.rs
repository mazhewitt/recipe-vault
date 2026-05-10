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
    Gemini,
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thought_signature: Option<String>,
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

impl LlmProvider {
    pub fn new(provider_type: LlmProviderType, api_key: String, model: String, http_client: Option<reqwest::Client>) -> Self {
        Self {
            provider_type,
            api_key,
            model,
            client: http_client.unwrap_or_else(reqwest::Client::new),
            mock_recipe_id: None,
        }
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
            LlmProviderType::Mock => Ok(self.complete_mock(messages)),
        }
    }

    fn complete_mock(&self, messages: &[Message]) -> LlmResponse {
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
                                    }]);
                                }
                            }
                        }
                    }
                }
                // display_meal_plan result is back, or recipe list was empty
                return LlmResponse::Text("I've assembled your meal plan for you!".to_string());
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
            }])
        } else if lower_message.contains("list") {
            // Return list_recipes tool call; the agent loop will execute the tool,
            // then call us again with the tool results, and we'll return Text above.
            LlmResponse::ToolUse(vec![ToolCall {
                id: "toolu_mock_list".to_string(),
                name: "list_recipes".to_string(),
                arguments: serde_json::json!({}),
                thought_signature: None,
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
        self.parse_gemini_response(response_json)
    }

    fn build_gemini_request(
        &self,
        messages: &[Message],
        tools: &[ToolDefinition],
        system_prompt: Option<&str>,
    ) -> serde_json::Value {
        let mut body = serde_json::json!({
            "contents": messages
                .iter()
                .map(|m| self.message_to_gemini(m))
                .collect::<Vec<_>>(),
            "generationConfig": {
                "maxOutputTokens": 4096
            }
        });

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

    fn message_to_gemini(&self, message: &Message) -> serde_json::Value {
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
                        serde_json::json!({
                            "functionResponse": {
                                "id": result.tool_use_id,
                                "name": result.name.as_deref().unwrap_or(&result.tool_use_id),
                                "response": {
                                    "result": result.content,
                                    "is_error": result.is_error
                                }
                            }
                        })
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
        let parts = response
            .get("candidates")
            .and_then(|c| c.as_array())
            .and_then(|arr| arr.first())
            .and_then(|candidate| candidate.get("content"))
            .and_then(|content| content.get("parts"))
            .and_then(|parts| parts.as_array())
            .ok_or_else(|| {
                LlmError::InvalidResponse("Missing candidates[0].content.parts".to_string())
            })?;

        let mut text_parts: Vec<String> = Vec::new();
        let mut tool_calls: Vec<ToolCall> = Vec::new();

        for (index, part) in parts.iter().enumerate() {
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
                let id = function_call
                    .get("id")
                    .and_then(|i| i.as_str())
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| format!("gemini_call_{}", index));
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
                });
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
