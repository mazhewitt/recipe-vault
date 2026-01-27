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
}

#[derive(Debug, Clone)]
pub struct LlmProvider {
    provider_type: LlmProviderType,
    api_key: String,
    model: String,
    client: reqwest::Client,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "role")]
pub enum Message {
    #[serde(rename = "user")]
    User { content: String },
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
        }
    }

    pub fn anthropic(api_key: String, model: String) -> Self {
        Self::new(LlmProviderType::Anthropic, api_key, model)
    }

    pub fn openai(api_key: String, model: String) -> Self {
        Self::new(LlmProviderType::OpenAi, api_key, model)
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
                serde_json::json!({
                    "role": "user",
                    "content": content
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
                serde_json::json!({
                    "role": "user",
                    "content": content
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
