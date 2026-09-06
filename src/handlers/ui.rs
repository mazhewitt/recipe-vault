use axum::{
    extract::State,
    http::StatusCode,
    response::{Html, IntoResponse, Redirect},
};
use tracing::error;

use crate::auth::UserIdentity;

/// Shared state for UI handlers
#[derive(Clone)]
pub struct UiState {}

/// Version string appended to static asset URLs (`?v=...`) so a new
/// release invalidates cached CSS/JS in browsers and CDNs.
pub const ASSET_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Substitute template placeholders in the chat page HTML.
pub fn render_chat_template(template: &str, email: &str) -> String {
    template
        .replace("{{user_email}}", email)
        .replace("{{asset_version}}", ASSET_VERSION)
}

/// GET / - Redirect to /chat
pub async fn root() -> impl IntoResponse {
    Redirect::permanent("/chat")
}

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
                let rendered = render_chat_template(&content, email);
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
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chat_template_substitutes_email_and_asset_version() {
        let template = r#"<span>{{user_email}}</span>
<link rel="stylesheet" href="/static/styles.css?v={{asset_version}}">
<script type="module" src="/static/app.js?v={{asset_version}}"></script>"#;
        let rendered = render_chat_template(template, "cook@example.com");
        assert!(rendered.contains("<span>cook@example.com</span>"));
        assert!(rendered.contains(&format!("styles.css?v={}", ASSET_VERSION)));
        assert!(rendered.contains(&format!("app.js?v={}", ASSET_VERSION)));
        assert!(!rendered.contains("{{"));
    }

    #[tokio::test]
    async fn shipped_chat_html_uses_versioned_asset_urls() {
        let content = tokio::fs::read_to_string("static/chat.html").await.unwrap();
        let rendered = render_chat_template(&content, "cook@example.com");
        assert!(rendered.contains(&format!("/static/styles.css?v={}", ASSET_VERSION)));
        assert!(rendered.contains(&format!("/static/app.js?v={}", ASSET_VERSION)));
    }
}
