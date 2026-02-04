use axum::{
    extract::State,
    http::{header::SET_COOKIE, HeaderMap, StatusCode},
    response::{Html, IntoResponse, Redirect, Response},
    Form,
};
use serde::Deserialize;
use std::sync::Arc;
use tracing::error;

use crate::auth::{clear_session_cookie, create_session_cookie, validate_session_cookie};

/// Shared state for UI handlers
#[derive(Clone)]
pub struct UiState {
    pub family_password: Option<Arc<String>>,
}

#[derive(Deserialize)]
pub struct LoginForm {
    password: String,
}

/// GET /chat - Render the chat page or login form
pub async fn chat_page(
    State(state): State<UiState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Check if user has valid session
    let has_valid_session = if let Some(ref password) = state.family_password {
        headers
            .get("Cookie")
            .and_then(|v| v.to_str().ok())
            .and_then(|cookies| extract_cookie(cookies, "rv_session"))
            .map(|session| validate_session_cookie(&session, password))
            .unwrap_or(false)
    } else {
        // No family password configured - web auth disabled
        false
    };

    if has_valid_session {
        match tokio::fs::read_to_string("static/chat.html").await {
            Ok(content) => Html(content).into_response(),
            Err(e) => {
                error!("Failed to load chat.html: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, Html("<h1>Error loading chat template</h1>".to_string())).into_response()
            }
        }
    } else if state.family_password.is_some() {
        Html(LOGIN_PAGE_HTML).into_response()
    } else {
        // No family password configured - show message
        Html(NO_AUTH_CONFIGURED_HTML).into_response()
    }
}

/// POST /login - Validate password and set session cookie
pub async fn login(
    State(state): State<UiState>,
    Form(form): Form<LoginForm>,
) -> Response {
    let Some(ref password) = state.family_password else {
        return (StatusCode::SERVICE_UNAVAILABLE, "Family password not configured").into_response();
    };

    if form.password == **password {
        // Valid password - set cookie and redirect
        let cookie = create_session_cookie(password);
        let mut headers = HeaderMap::new();
        headers.insert(SET_COOKIE, cookie.parse().unwrap());
        (headers, Redirect::to("/chat")).into_response()
    } else {
        // Invalid password - show login form with error
        Html(LOGIN_PAGE_ERROR_HTML).into_response()
    }
}

/// POST /logout - Clear session cookie
pub async fn logout() -> Response {
    let cookie = clear_session_cookie();
    let mut headers = HeaderMap::new();
    headers.insert(SET_COOKIE, cookie.parse().unwrap());
    (headers, Redirect::to("/chat")).into_response()
}

/// Extract a cookie value by name from the Cookie header
fn extract_cookie(cookie_header: &str, name: &str) -> Option<String> {
    for cookie in cookie_header.split(';') {
        let cookie = cookie.trim();
        if let Some((key, value)) = cookie.split_once('=') {
            if key.trim() == name {
                return Some(value.trim().to_string());
            }
        }
    }
    None
}

const LOGIN_PAGE_HTML: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recipe Vault - Login</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: #2c3e50;
            color: white;
            padding: 1rem;
            text-align: center;
        }
        .header h1 { font-size: 1.5rem; font-weight: 500; }
        .container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        .login-form {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .login-form h2 {
            margin-bottom: 1.5rem;
            color: #2c3e50;
            text-align: center;
        }
        .login-form input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 1rem;
            font-size: 1rem;
        }
        .login-form input:focus {
            outline: none;
            border-color: #3498db;
        }
        .login-form button {
            width: 100%;
            padding: 0.75rem;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            transition: background 0.2s;
        }
        .login-form button:hover { background: #2980b9; }
        .error { color: #e74c3c; margin-bottom: 1rem; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Recipe Vault</h1>
    </div>
    <div class="container">
        <form class="login-form" method="POST" action="/login">
            <h2>Family Login</h2>
            <input type="password" name="password" placeholder="Family password" autofocus required>
            <button type="submit">Enter</button>
        </form>
    </div>
</body>
</html>
"#;

const LOGIN_PAGE_ERROR_HTML: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recipe Vault - Login</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: #2c3e50;
            color: white;
            padding: 1rem;
            text-align: center;
        }
        .header h1 { font-size: 1.5rem; font-weight: 500; }
        .container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        .login-form {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .login-form h2 {
            margin-bottom: 1.5rem;
            color: #2c3e50;
            text-align: center;
        }
        .login-form input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 1rem;
            font-size: 1rem;
        }
        .login-form input:focus {
            outline: none;
            border-color: #3498db;
        }
        .login-form button {
            width: 100%;
            padding: 0.75rem;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            transition: background 0.2s;
        }
        .login-form button:hover { background: #2980b9; }
        .error { color: #e74c3c; margin-bottom: 1rem; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Recipe Vault</h1>
    </div>
    <div class="container">
        <form class="login-form" method="POST" action="/login">
            <h2>Family Login</h2>
            <p class="error">Incorrect password. Please try again.</p>
            <input type="password" name="password" placeholder="Family password" autofocus required>
            <button type="submit">Enter</button>
        </form>
    </div>
</body>
</html>
"#;

const NO_AUTH_CONFIGURED_HTML: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recipe Vault - Setup Required</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: #2c3e50;
            color: white;
            padding: 1rem;
            text-align: center;
        }
        .header h1 { font-size: 1.5rem; font-weight: 500; }
        .container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        .message {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            width: 100%;
            max-width: 500px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .message h2 { margin-bottom: 1rem; color: #2c3e50; }
        .message p { color: #7f8c8d; line-height: 1.6; }
        .message code {
            background: #ecf0f1;
            padding: 0.2rem 0.5rem;
            border-radius: 3px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Recipe Vault</h1>
    </div>
    <div class="container">
        <div class="message">
            <h2>Setup Required</h2>
            <p>Web authentication is not configured. Set <code>FAMILY_PASSWORD</code> in your environment variables and restart the server.</p>
        </div>
    </div>
</body>
</html>
"#;
