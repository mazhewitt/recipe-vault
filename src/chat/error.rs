use axum::response::IntoResponse;

#[derive(Debug, thiserror::Error)]
pub enum ChatError {
    #[error("Agent error: {0}")]
    Agent(String),
    #[error("Session error: {0}")]
    Session(String),
}

impl IntoResponse for ChatError {
    fn into_response(self) -> axum::response::Response {
        let body = serde_json::json!({
            "error": self.to_string()
        });
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(body),
        )
            .into_response()
    }
}
