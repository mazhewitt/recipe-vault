use axum::{
    extract::State,
    http::StatusCode,
    response::{Html, IntoResponse},
};
use tracing::error;

use crate::auth::UserIdentity;

/// Shared state for UI handlers
#[derive(Clone)]
pub struct UiState {}

/// GET /chat - Render the chat page
pub async fn chat_page(
    _state: State<UiState>,
    extensions: axum::http::Extensions,
) -> impl IntoResponse {
    // Identity is extracted by cloudflare_auth middleware
    let identity = extensions.get::<UserIdentity>();
    
    let authenticated = identity.map(|i| i.email.is_some()).unwrap_or(false);

    if authenticated {
        match tokio::fs::read_to_string("static/chat.html").await {
            Ok(content) => {
                let email = identity.and_then(|i| i.email.as_ref()).map(|s| s.as_str()).unwrap_or("Unknown");
                let rendered = content.replace("{{user_email}}", email);
                Html(rendered).into_response()
            },
            Err(e) => {
                error!("Failed to load chat.html: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, Html("<h1>Error loading chat template</h1>".to_string())).into_response()
            }
        }
    } else {
        // This should normally be caught by Cloudflare Access or the middleware
        (StatusCode::UNAUTHORIZED, Html("<h1>Authentication required via Cloudflare Access</h1>".to_string())).into_response()
    }
}