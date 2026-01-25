use crate::mcp::protocol::JsonRpcError;
use crate::models::{CreateRecipeInput, Recipe, RecipeWithDetails, UpdateRecipeInput};
use reqwest::blocking::Client;
use reqwest::StatusCode;
use std::time::Duration;

/// HTTP client for communicating with the Recipe Vault API server
pub struct ApiClient {
    base_url: String,
    client: Client,
    api_key: Option<String>,
}

impl ApiClient {
    /// Create a new API client with the given base URL and optional API key
    pub fn new(base_url: String, api_key: Option<String>) -> Result<Self, String> {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        Ok(Self {
            base_url,
            client,
            api_key,
        })
    }

    /// Add API key header to a request if configured
    fn add_auth_header(
        &self,
        request: reqwest::blocking::RequestBuilder,
    ) -> reqwest::blocking::RequestBuilder {
        match &self.api_key {
            Some(key) => request.header("X-API-Key", key),
            None => request,
        }
    }

    /// List all recipes
    pub fn list_recipes(&self) -> Result<Vec<Recipe>, JsonRpcError> {
        let url = format!("{}/api/recipes", self.base_url);

        let request = self.client.get(&url);
        let response = self
            .add_auth_header(request)
            .send()
            .map_err(|e| self.map_request_error(e))?;

        self.handle_response(response)
    }

    /// Get a recipe by ID
    pub fn get_recipe(&self, recipe_id: &str) -> Result<RecipeWithDetails, JsonRpcError> {
        let url = format!("{}/api/recipes/{}", self.base_url, recipe_id);

        let request = self.client.get(&url);
        let response = self
            .add_auth_header(request)
            .send()
            .map_err(|e| self.map_request_error(e))?;

        self.handle_response(response)
    }

    /// Create a new recipe
    pub fn create_recipe(&self, input: CreateRecipeInput) -> Result<RecipeWithDetails, JsonRpcError> {
        let url = format!("{}/api/recipes", self.base_url);

        let request = self.client.post(&url).json(&input);
        let response = self
            .add_auth_header(request)
            .send()
            .map_err(|e| self.map_request_error(e))?;

        self.handle_response(response)
    }

    /// Update an existing recipe
    pub fn update_recipe(
        &self,
        recipe_id: &str,
        input: UpdateRecipeInput,
    ) -> Result<RecipeWithDetails, JsonRpcError> {
        let url = format!("{}/api/recipes/{}", self.base_url, recipe_id);

        let request = self.client.put(&url).json(&input);
        let response = self
            .add_auth_header(request)
            .send()
            .map_err(|e| self.map_request_error(e))?;

        self.handle_response(response)
    }

    /// Delete a recipe by ID
    pub fn delete_recipe(&self, recipe_id: &str) -> Result<(), JsonRpcError> {
        let url = format!("{}/api/recipes/{}", self.base_url, recipe_id);

        let request = self.client.delete(&url);
        let response = self
            .add_auth_header(request)
            .send()
            .map_err(|e| self.map_request_error(e))?;

        let status = response.status();
        if status.is_success() {
            Ok(())
        } else {
            Err(self.map_status_error(status, response.text().ok()))
        }
    }

    /// Handle response and deserialize JSON
    fn handle_response<T: serde::de::DeserializeOwned>(
        &self,
        response: reqwest::blocking::Response,
    ) -> Result<T, JsonRpcError> {
        let status = response.status();

        if status.is_success() {
            response
                .json()
                .map_err(|e| JsonRpcError::internal_error(format!("Failed to parse response: {}", e)))
        } else {
            let body = response.text().ok();
            Err(self.map_status_error(status, body))
        }
    }

    /// Map HTTP status codes to JSON-RPC errors
    fn map_status_error(&self, status: StatusCode, body: Option<String>) -> JsonRpcError {
        let message = body.unwrap_or_else(|| status.to_string());

        match status {
            StatusCode::UNAUTHORIZED => {
                JsonRpcError::internal_error("API authentication failed. Check API_KEY configuration.")
            }
            StatusCode::NOT_FOUND => JsonRpcError::not_found(message),
            StatusCode::CONFLICT => JsonRpcError::conflict(message),
            StatusCode::BAD_REQUEST => JsonRpcError::invalid_params(message),
            StatusCode::UNPROCESSABLE_ENTITY => JsonRpcError::invalid_params(message),
            _ if status.is_server_error() => {
                JsonRpcError::internal_error(format!("API server error: {}", message))
            }
            _ => JsonRpcError::internal_error(format!("Unexpected response: {} - {}", status, message)),
        }
    }

    /// Map request errors (network, timeout, etc.) to JSON-RPC errors
    fn map_request_error(&self, error: reqwest::Error) -> JsonRpcError {
        if error.is_timeout() {
            JsonRpcError::internal_error("API request timed out")
        } else if error.is_connect() {
            JsonRpcError::internal_error(format!(
                "Failed to connect to API server at {}: {}",
                self.base_url, error
            ))
        } else {
            JsonRpcError::internal_error(format!("API request failed: {}", error))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_client() -> ApiClient {
        ApiClient::new("http://localhost:3000".to_string(), None).unwrap()
    }

    #[test]
    fn test_map_status_error_unauthorized() {
        let client = test_client();
        let error = client.map_status_error(StatusCode::UNAUTHORIZED, Some("Invalid API key".to_string()));
        assert_eq!(error.code, -32603);
        assert!(error.message.contains("authentication"));
    }

    #[test]
    fn test_map_status_error_not_found() {
        let client = test_client();
        let error = client.map_status_error(StatusCode::NOT_FOUND, Some("Recipe not found".to_string()));
        assert_eq!(error.code, -32001);
    }

    #[test]
    fn test_map_status_error_conflict() {
        let client = test_client();
        let error = client.map_status_error(StatusCode::CONFLICT, Some("Title already exists".to_string()));
        assert_eq!(error.code, -32002);
    }

    #[test]
    fn test_map_status_error_bad_request() {
        let client = test_client();
        let error = client.map_status_error(StatusCode::BAD_REQUEST, Some("Invalid input".to_string()));
        assert_eq!(error.code, -32602);
    }

    #[test]
    fn test_map_status_error_server_error() {
        let client = test_client();
        let error = client.map_status_error(StatusCode::INTERNAL_SERVER_ERROR, Some("Database error".to_string()));
        assert_eq!(error.code, -32603);
    }

    #[test]
    fn test_client_with_api_key() {
        let client = ApiClient::new(
            "http://localhost:3000".to_string(),
            Some("test-api-key".to_string()),
        )
        .unwrap();
        assert!(client.api_key.is_some());
    }

    #[test]
    fn test_client_without_api_key() {
        let client = ApiClient::new("http://localhost:3000".to_string(), None).unwrap();
        assert!(client.api_key.is_none());
    }
}
