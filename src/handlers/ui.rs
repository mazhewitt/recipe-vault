use axum::{
    extract::State,
    http::{header::SET_COOKIE, HeaderMap, StatusCode},
    response::{Html, IntoResponse, Redirect, Response},
    Form,
};
use serde::Deserialize;
use std::sync::Arc;

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
        Html(CHAT_PAGE_HTML)
    } else if state.family_password.is_some() {
        Html(LOGIN_PAGE_HTML)
    } else {
        // No family password configured - show message
        Html(NO_AUTH_CONFIGURED_HTML)
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

const CHAT_PAGE_HTML: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1200, initial-scale=1.0">
    <title>Recipe Vault</title>
    <link href="https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <script src="https://unpkg.com/htmx.org@1.9.10/dist/ext/sse.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        /* ==================== DESIGN TOKENS ==================== */
        :root {
            /* Colors - Wood */
            --color-wood-dark: #2a1f17;
            --color-wood-medium: #3d2c20;
            --color-wood-light: #4a3628;

            /* Colors - Leather */
            --color-leather: #8B2D1A;
            --color-leather-light: #a33520;
            --color-leather-bright: #b83d28;

            /* Colors - Paper */
            --color-paper-cream: #f8f4e8;
            --color-paper-aged-light: #f5edd8;
            --color-paper-aged: #f0e6cc;
            --color-paper-aged-medium: #ebe0c4;
            --color-paper-aged-dark: #e0d3b5;

            /* Colors - Text/Ink */
            --color-ink-dark: #2d2418;
            --color-ink-medium: #5a4a3a;
            --color-ink-light: #6b5a4a;
            --color-ink-muted: #8a7a60;
            --color-placeholder: #a0937a;

            /* Colors - UI */
            --color-border: #c9a86c;
            --color-border-light: #d4c4a8;
            --color-label-cream: #d4c4a8;
            --color-accent-brown: #6b4423;

            /* Typography */
            --font-handwritten: 'Kalam', 'Caveat', cursive;

            /* Spacing */
            --space-xs: 4px;
            --space-sm: 8px;
            --space-md: 16px;
            --space-lg: 24px;
            --space-xl: 40px;

            /* Shadows */
            --shadow-deep: 6px 6px 20px rgba(0,0,0,0.5);
            --shadow-medium: 4px 4px 15px rgba(0,0,0,0.4);
            --shadow-soft: 3px 3px 10px rgba(0,0,0,0.3);
            --shadow-inset-left: inset -4px 0 12px rgba(0,0,0,0.08);
            --shadow-inset-right: inset 4px 0 12px rgba(0,0,0,0.05);

            /* Border Radius */
            --radius-sm: 4px;
            --radius-md: 6px;
            --radius-lg: 8px;
            --radius-pill: 20px;
        }

        /* ==================== GLOBAL RESET ==================== */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        /* ==================== BODY & BACKGROUND ==================== */
        body {
            min-height: 100vh;
            background:
                url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.03' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"),
                linear-gradient(90deg,
                    var(--color-wood-dark) 0%,
                    var(--color-wood-medium) 15%,
                    var(--color-wood-light) 30%,
                    var(--color-wood-medium) 45%,
                    var(--color-wood-dark) 50%,
                    var(--color-wood-medium) 55%,
                    var(--color-wood-light) 70%,
                    var(--color-wood-medium) 85%,
                    var(--color-wood-dark) 100%
                );
            background-blend-mode: overlay, normal;
            background-color: var(--color-wood-dark);
            font-family: var(--font-handwritten);
            padding: 30px 50px;
            overflow-x: hidden;
        }

        /* Wood grain lines */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: repeating-linear-gradient(
                90deg,
                transparent 0px,
                transparent 80px,
                rgba(0,0,0,0.15) 80px,
                rgba(0,0,0,0.15) 82px,
                transparent 82px,
                transparent 160px,
                rgba(0,0,0,0.1) 160px,
                rgba(0,0,0,0.1) 161px
            );
            pointer-events: none;
            z-index: 0;
        }

        /* ==================== MAIN LAYOUT ==================== */
        .app-container {
            position: relative;
            z-index: 1;
            display: flex;
            gap: var(--space-xl);
            max-width: 1400px;
            margin: 0 auto;
            height: calc(100vh - 60px);
            align-items: flex-start;
        }

        /* Section labels */
        .section-label {
            font-family: var(--font-handwritten);
            font-size: 22px;
            color: var(--color-label-cream);
            text-align: center;
            margin-bottom: 12px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            letter-spacing: 1px;
        }

        /* ==================== TIMER WIDGET ==================== */
        .timer-widget {
            position: fixed;
            top: 25px;
            right: 50px;
            background: #f5f0e5;
            border: 2px solid var(--color-ink-dark);
            border-radius: var(--radius-pill);
            padding: 8px 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: var(--shadow-soft);
            z-index: 100;
        }

        .timer-widget::before {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 30px;
            width: 20px;
            height: 20px;
            background: #f5f0e5;
            border-right: 2px solid var(--color-ink-dark);
            border-bottom: 2px solid var(--color-ink-dark);
            transform: rotate(45deg);
        }

        .timer-widget::after {
            content: '';
            position: absolute;
            bottom: -6px;
            left: 32px;
            width: 16px;
            height: 16px;
            background: #f5f0e5;
            transform: rotate(45deg);
        }

        .timer-icon svg {
            width: 22px;
            height: 22px;
            stroke: var(--color-ink-dark);
            fill: none;
            stroke-width: 2;
        }

        .timer-text {
            font-family: var(--font-handwritten);
            font-size: 20px;
            color: var(--color-ink-dark);
            font-weight: 400;
        }

        /* ==================== NOTEPAD COMPONENT ==================== */
        .notepad-container {
            width: 380px;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
        }

        .notepad {
            flex: 1;
            display: flex;
            position: relative;
        }

        .notepad-paper {
            flex: 1;
            background: linear-gradient(180deg,
                var(--color-paper-aged-light) 0%,
                var(--color-paper-aged) 20%,
                var(--color-paper-aged-medium) 50%,
                #e5d9bc 80%,
                var(--color-paper-aged-dark) 100%
            );
            border-radius: var(--radius-md);
            box-shadow:
                var(--shadow-medium),
                0 0 30px rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
        }

        /* Paper texture */
        .notepad-paper::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='5'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)' opacity='0.03'/%3E%3C/svg%3E");
            pointer-events: none;
        }

        .notepad-header {
            padding: 16px 20px 12px 28px;
            border-bottom: 2px solid var(--color-border);
        }

        .notepad-header h2 {
            font-family: var(--font-handwritten);
            font-size: 18px;
            color: var(--color-ink-dark);
            font-weight: 400;
            letter-spacing: 0.5px;
        }

        .notepad-content {
            flex: 1;
            padding: 16px 20px 16px 28px;
            overflow-y: auto;
        }

        /* Custom scrollbar for notepad */
        .notepad-content::-webkit-scrollbar {
            width: 8px;
        }

        .notepad-content::-webkit-scrollbar-track {
            background: transparent;
        }

        .notepad-content::-webkit-scrollbar-thumb {
            background: var(--color-border);
            border-radius: 4px;
        }

        .notepad-content::-webkit-scrollbar-thumb:hover {
            background: var(--color-ink-muted);
        }

        /* Chat messages */
        .message {
            margin-bottom: var(--space-md);
            animation: fadeSlideIn 0.25s ease-out;
        }

        @keyframes fadeSlideIn {
            from {
                opacity: 0;
                transform: translateY(8px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .message-content {
            font-family: var(--font-handwritten);
            font-size: 15px;
            line-height: 1.6;
            color: var(--color-ink-dark);
        }

        .message-content strong {
            font-weight: 700;
        }

        .message.tool-use .message-content {
            color: var(--color-ink-light);
            font-style: italic;
            font-size: 14px;
        }

        .message.error .message-content {
            color: var(--color-leather);
        }

        .message.streaming {
            opacity: 0.8;
        }

        /* Markdown in messages */
        .message-content h1,
        .message-content h2,
        .message-content h3 {
            margin: 0.5rem 0;
            font-weight: 400;
        }

        .message-content ul,
        .message-content ol {
            margin: 0.5rem 0;
            padding-left: 1.2rem;
        }

        .message-content p {
            margin: 0.4rem 0;
        }

        .message-content p:first-child {
            margin-top: 0;
        }

        /* Notepad input */
        .notepad-input {
            padding: 12px 20px 16px 28px;
            margin-top: auto;
        }

        .text-input {
            width: 100%;
            height: 60px;
            padding: 12px;
            border: 2px solid var(--color-border);
            border-radius: var(--radius-sm);
            background: #fff;
            font-family: var(--font-handwritten);
            font-size: 15px;
            resize: none;
            outline: none;
            transition: border-color 0.15s ease;
        }

        .text-input::placeholder {
            color: var(--color-placeholder);
        }

        .text-input:focus {
            border-color: var(--color-ink-medium);
        }

        .text-input:disabled {
            background: var(--color-paper-aged-light);
            cursor: not-allowed;
        }

        /* Loading indicator */
        .loading {
            display: none;
            align-items: center;
            gap: 8px;
            padding: 8px 28px;
            font-size: 14px;
            color: var(--color-ink-light);
        }

        .loading.active {
            display: flex;
        }

        .loading .spinner {
            width: 14px;
            height: 14px;
            border: 2px solid var(--color-border);
            border-top-color: var(--color-ink-medium);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* ==================== RECIPE BOOK COMPONENT ==================== */
        .book-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-width: 700px;
        }

        .recipe-book {
            flex: 1;
            display: flex;
            position: relative;
        }

        /* Book cover */
        .book-cover {
            position: absolute;
            top: -8px;
            left: -12px;
            right: -12px;
            bottom: -8px;
            background: linear-gradient(180deg,
                var(--color-leather) 0%,
                var(--color-leather-light) 10%,
                var(--color-leather-bright) 50%,
                var(--color-leather-light) 90%,
                var(--color-leather) 100%
            );
            border-radius: var(--radius-lg);
            box-shadow:
                var(--shadow-deep),
                inset 0 0 20px rgba(0,0,0,0.2);
            z-index: 0;
        }

        /* Leather texture */
        .book-cover::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='leather'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.5' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23leather)' opacity='0.08'/%3E%3C/svg%3E");
            border-radius: var(--radius-lg);
        }

        /* Spine shadow */
        .book-cover::after {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 24px;
            background: linear-gradient(90deg,
                rgba(0,0,0,0.3) 0%,
                rgba(0,0,0,0.1) 30%,
                rgba(255,255,255,0.05) 50%,
                rgba(0,0,0,0.1) 70%,
                rgba(0,0,0,0.3) 100%
            );
        }

        /* Pages container */
        .pages-container {
            flex: 1;
            display: flex;
            position: relative;
            z-index: 1;
            margin: 6px;
        }

        /* Page styles */
        .page {
            flex: 1;
            background: linear-gradient(180deg,
                var(--color-paper-cream) 0%,
                #f5f0e0 50%,
                #f0ebd8 100%
            );
            padding: 20px 28px;
            position: relative;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
        }

        /* Page scrollbar */
        .page::-webkit-scrollbar {
            width: 6px;
        }

        .page::-webkit-scrollbar-track {
            background: transparent;
        }

        .page::-webkit-scrollbar-thumb {
            background: var(--color-border-light);
            border-radius: 3px;
        }

        .page-left {
            border-radius: var(--radius-sm) 0 0 var(--radius-sm);
            box-shadow: var(--shadow-inset-left);
        }

        .page-right {
            border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
            box-shadow: var(--shadow-inset-right);
        }

        /* Center binding shadows */
        .page-left::after {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 15px;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0,0,0,0.08));
            pointer-events: none;
        }

        .page-right::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 15px;
            height: 100%;
            background: linear-gradient(90deg, rgba(0,0,0,0.08), transparent);
            z-index: 1;
            pointer-events: none;
        }

        /* Page numbers */
        .page-number {
            font-family: var(--font-handwritten);
            font-size: 14px;
            color: var(--color-ink-muted);
            margin-bottom: 8px;
        }

        .page-left .page-number {
            text-align: left;
        }

        .page-right .page-number {
            text-align: right;
        }

        /* ==================== RECIPE CONTENT ==================== */
        .recipe-label {
            font-family: var(--font-handwritten);
            font-size: 14px;
            color: var(--color-ink-muted);
            margin-bottom: 4px;
        }

        .recipe-title {
            font-family: var(--font-handwritten);
            font-size: 27px;
            color: var(--color-ink-dark);
            margin-bottom: var(--space-md);
            font-weight: 400;
        }

        .section-header {
            font-family: var(--font-handwritten);
            font-size: 19px;
            color: var(--color-accent-brown);
            margin-bottom: 12px;
            padding-bottom: 4px;
            border-bottom: 1px solid var(--color-border);
            text-decoration: underline;
            text-underline-offset: 4px;
        }

        /* Ingredients list */
        .ingredients-list {
            font-family: var(--font-handwritten);
            font-size: 14px;
            line-height: 1.7;
            color: var(--color-ink-dark);
            margin-bottom: 20px;
        }

        .ingredient-line {
            margin-bottom: 2px;
        }

        .serving-note {
            font-style: italic;
            margin-top: 8px;
            color: var(--color-ink-medium);
        }

        /* Preparation steps */
        .prep-list {
            font-family: var(--font-handwritten);
            font-size: 13px;
            line-height: 1.65;
            color: var(--color-ink-dark);
        }

        .prep-step {
            margin-bottom: 6px;
            text-indent: -8px;
            padding-left: 8px;
        }

        .step-note {
            color: var(--color-ink-light);
            font-style: italic;
        }

        .step-duration {
            display: inline-block;
            background: var(--color-paper-aged);
            color: var(--color-ink-medium);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
            margin-left: 4px;
        }

        .recipe-note {
            margin-top: var(--space-md);
            font-style: italic;
            color: var(--color-ink-light);
            font-size: 13px;
        }

        /* ==================== RECIPE METADATA ==================== */
        .recipe-meta {
            display: flex;
            gap: 20px;
            margin-top: auto;
            padding-top: var(--space-md);
            border-top: 1px solid var(--color-border-light);
            flex-wrap: wrap;
        }

        .meta-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }

        .meta-label {
            font-family: var(--font-handwritten);
            font-size: 11px;
            color: var(--color-ink-muted);
            text-transform: capitalize;
        }

        .meta-icon {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .meta-icon svg {
            width: 28px;
            height: 28px;
            stroke: var(--color-ink-medium);
            fill: none;
            stroke-width: 1.5;
        }

        .difficulty-dots {
            display: flex;
            gap: 3px;
            margin-bottom: 2px;
        }

        .difficulty-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            border: 1px solid var(--color-ink-medium);
        }

        .difficulty-dot.filled {
            background: var(--color-leather);
            border-color: var(--color-leather);
        }

        .meta-value {
            font-family: var(--font-handwritten);
            font-size: 12px;
            color: var(--color-ink-medium);
        }

        /* ==================== PLACEHOLDER STATE ==================== */
        .recipe-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            text-align: center;
            color: var(--color-ink-muted);
            padding: 40px;
        }

        .recipe-placeholder-icon {
            width: 60px;
            height: 60px;
            margin-bottom: 16px;
            opacity: 0.5;
        }

        .recipe-placeholder-icon svg {
            width: 100%;
            height: 100%;
            stroke: var(--color-ink-muted);
            fill: none;
            stroke-width: 1;
        }

        .recipe-placeholder-text {
            font-size: 17px;
            line-height: 1.6;
        }

        /* ==================== LOADING SKELETON ==================== */
        .skeleton {
            background: linear-gradient(90deg,
                var(--color-paper-aged) 25%,
                var(--color-paper-aged-dark) 50%,
                var(--color-paper-aged) 75%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 4px;
            margin-bottom: 12px;
        }

        .skeleton-title { height: 26px; width: 70%; }
        .skeleton-line { height: 14px; width: 100%; margin-bottom: 8px; }
        .skeleton-short { height: 14px; width: 60%; }

        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }

        /* ==================== RESPONSIVE ==================== */
        @media (max-width: 1000px) {
            body {
                padding: 20px;
            }

            .app-container {
                flex-direction: column;
                height: auto;
                gap: 30px;
            }

            .notepad-container {
                width: 100%;
            }

            .book-container {
                min-width: 100%;
            }

            .notepad,
            .recipe-book {
                max-height: 500px;
            }

            .timer-widget {
                top: 10px;
                right: 20px;
            }
        }

        /* Logout button */
        .logout-btn {
            position: fixed;
            top: 25px;
            left: 50px;
            background: rgba(255,255,255,0.1);
            border: 1px solid var(--color-label-cream);
            color: var(--color-label-cream);
            padding: 6px 14px;
            border-radius: var(--radius-sm);
            font-family: var(--font-handwritten);
            font-size: 14px;
            cursor: pointer;
            transition: all 0.15s ease;
            z-index: 100;
        }

        .logout-btn:hover {
            background: rgba(255,255,255,0.2);
        }
    </style>
</head>
<body>
    <!-- Logout Button -->
    <form method="POST" action="/logout" style="margin: 0;">
        <button type="submit" class="logout-btn">Logout</button>
    </form>

    <!-- Timer Widget -->
    <div class="timer-widget" id="timer-widget" style="display: none;">
        <div class="timer-icon">
            <svg viewBox="0 0 24 24">
                <circle cx="12" cy="13" r="9"/>
                <polyline points="12 7 12 13 15 15"/>
                <path d="M9 2h6"/>
                <path d="M12 2v2"/>
            </svg>
        </div>
        <span class="timer-text" id="timer-text">Timer: 00:00</span>
    </div>

    <div class="app-container">
        <!-- Notepad Section -->
        <div class="notepad-container">
            <div class="section-label">Notepad</div>
            <div class="notepad">
                <div class="notepad-paper">
                    <div class="notepad-header">
                        <h2>Recipe Development & Search</h2>
                    </div>
                    <div class="notepad-content" id="messages">
                        <div class="message">
                            <div class="message-content">
                                <strong>AI:</strong> Hello! I'm your cooking assistant. I can help you manage your recipes - list them, get details, create new ones, or update existing recipes. What would you like to do?
                            </div>
                        </div>
                    </div>
                    <div id="loading" class="loading">
                        <div class="spinner"></div>
                        <span id="loading-text">Thinking...</span>
                    </div>
                    <div class="notepad-input">
                        <textarea class="text-input" id="message-input" placeholder="Type your message..." onkeypress="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); }"></textarea>
                    </div>
                </div>
            </div>
        </div>

        <!-- Recipe Book Section -->
        <div class="book-container">
            <div class="section-label">Recipe Book</div>
            <div class="recipe-book">
                <div class="book-cover"></div>
                <div class="pages-container">
                    <!-- Left Page - Ingredients -->
                    <div class="page page-left" id="page-left">
                        <div class="recipe-placeholder">
                            <div class="recipe-placeholder-icon">
                                <svg viewBox="0 0 24 24">
                                    <path d="M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                    <path d="M12 11v4"/>
                                    <path d="M9 14h6"/>
                                </svg>
                            </div>
                            <div class="recipe-placeholder-text">
                                Ask me to find or create a recipe, and it will appear here in your book.
                            </div>
                        </div>
                    </div>

                    <!-- Right Page - Preparation -->
                    <div class="page page-right" id="page-right">
                        <div class="recipe-placeholder">
                            <div class="recipe-placeholder-icon">
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 2a4 4 0 00-4 4v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2h-2V6a4 4 0 00-4-4z"/>
                                    <path d="M10 14h4"/>
                                    <path d="M12 12v4"/>
                                </svg>
                            </div>
                            <div class="recipe-placeholder-text">
                                Your preparation steps will appear on this page.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let conversationId = null;

        function scrollToBottom() {
            const messages = document.getElementById('messages');
            messages.scrollTop = messages.scrollHeight;
        }

        function renderMarkdown(text) {
            try {
                if (typeof marked !== 'undefined' && marked.parse) {
                    return marked.parse(text);
                }
            } catch (e) {
                console.error('Markdown parsing error:', e);
            }
            // Fallback: basic markdown rendering
            return text
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                .replace(/^- (.+)$/gm, '<li>$1</li>')
                .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
                .replace(/\n/g, '<br>');
        }

        function addMessage(content, role, isStreaming = false) {
            const messages = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = `message ${role}` + (isStreaming ? ' streaming' : '');

            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';

            // Format with speaker label
            const speaker = role === 'user' ? 'User' : (role === 'assistant' ? 'AI' : '');
            const prefix = speaker ? `<strong>${speaker}:</strong> ` : '';

            if (role === 'assistant') {
                contentDiv.innerHTML = prefix + renderMarkdown(content);
            } else if (role === 'tool-use') {
                contentDiv.innerHTML = `<em>${content}</em>`;
            } else if (role === 'error') {
                contentDiv.innerHTML = `<strong>Error:</strong> ${content}`;
            } else {
                contentDiv.innerHTML = prefix + content;
            }

            div.appendChild(contentDiv);

            if (isStreaming) {
                div.id = 'streaming-message';
            }
            messages.appendChild(div);
            scrollToBottom();
            return div;
        }

        function updateStreamingMessage(content) {
            let msg = document.getElementById('streaming-message');
            if (msg) {
                const contentDiv = msg.querySelector('.message-content');
                contentDiv.innerHTML = '<strong>AI:</strong> ' + renderMarkdown(content);
            } else {
                msg = addMessage(content, 'assistant', true);
            }
            scrollToBottom();
        }

        function finalizeStreamingMessage() {
            const msg = document.getElementById('streaming-message');
            if (msg) {
                msg.classList.remove('streaming');
                msg.removeAttribute('id');
            }
        }

        function setLoading(loading, text = 'Thinking...') {
            const loadingEl = document.getElementById('loading');
            const loadingText = document.getElementById('loading-text');
            const input = document.getElementById('message-input');

            loadingEl.classList.toggle('active', loading);
            loadingText.textContent = text;
            input.disabled = loading;
        }

        // Recipe Display Functions
        function showRecipeLoading() {
            const leftPage = document.getElementById('page-left');
            const rightPage = document.getElementById('page-right');

            leftPage.innerHTML = `
                <div class="page-number">...</div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-short"></div>
            `;

            rightPage.innerHTML = `
                <div class="page-number">...</div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line"></div>
            `;
        }

        function showRecipeError(message) {
            const leftPage = document.getElementById('page-left');
            leftPage.innerHTML = `
                <div class="recipe-placeholder">
                    <div class="recipe-placeholder-text" style="color: var(--color-leather);">
                        ${message}
                    </div>
                </div>
            `;
        }

        async function fetchAndDisplayRecipe(recipeId) {
            showRecipeLoading();
            try {
                const response = await fetch(`/api/recipes/${recipeId}`, {
                    credentials: 'same-origin'
                });
                if (!response.ok) {
                    if (response.status === 404) {
                        showRecipeError('Recipe not found');
                    } else {
                        showRecipeError('Failed to load recipe');
                    }
                    return;
                }
                const recipe = await response.json();
                renderRecipe(recipe);
            } catch (error) {
                console.error('Error fetching recipe:', error);
                showRecipeError('Failed to load recipe');
            }
        }

        function renderRecipe(recipe) {
            const leftPage = document.getElementById('page-left');
            const rightPage = document.getElementById('page-right');

            // Build ingredients list
            const ingredientsList = (recipe.ingredients || []).map(ing => {
                const qty = ing.quantity ? `${ing.quantity} ` : '';
                const unit = ing.unit ? `${ing.unit} ` : '';
                const notes = ing.notes ? ` <span class="step-note">(${ing.notes})</span>` : '';
                return `<div class="ingredient-line">${qty}${unit}${ing.name}${notes}</div>`;
            }).join('');

            // Build difficulty dots
            const difficulty = recipe.difficulty || 1;
            const difficultyDots = Array(5).fill(0).map((_, i) =>
                `<span class="difficulty-dot${i < difficulty ? ' filled' : ''}"></span>`
            ).join('');

            // Left page - Ingredients & Metadata
            leftPage.innerHTML = `
                <div class="page-number">${recipe.id || '?'}</div>
                <div class="recipe-label">recipe</div>
                <div class="recipe-title">${recipe.title || 'Untitled Recipe'}</div>

                <div class="section-header">ingredients:</div>
                <div class="ingredients-list">
                    ${ingredientsList || '<div class="ingredient-line">No ingredients listed</div>'}
                    ${recipe.servings ? `<div class="serving-note">--> serves ${recipe.servings}</div>` : ''}
                </div>

                <div class="recipe-meta">
                    <div class="meta-item">
                        <span class="meta-label">Difficulty</span>
                        <div class="difficulty-dots">${difficultyDots}</div>
                        <span class="meta-value">${difficulty}/5</span>
                    </div>
                    ${recipe.servings ? `
                    <div class="meta-item">
                        <span class="meta-label">Serves</span>
                        <div class="meta-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M3 11h18v2H3z"/>
                                <path d="M5 11V8a7 7 0 0114 0v3"/>
                                <path d="M7 13v4a2 2 0 002 2h6a2 2 0 002-2v-4"/>
                            </svg>
                        </div>
                        <span class="meta-value">${recipe.servings}</span>
                    </div>
                    ` : ''}
                    ${recipe.prep_time ? `
                    <div class="meta-item">
                        <span class="meta-label">Prep time</span>
                        <div class="meta-icon">
                            <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                        </div>
                        <span class="meta-value">${recipe.prep_time} min</span>
                    </div>
                    ` : ''}
                    ${recipe.cook_time ? `
                    <div class="meta-item">
                        <span class="meta-label">Cook time</span>
                        <div class="meta-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 2a4 4 0 00-4 4v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2h-2V6a4 4 0 00-4-4z"/>
                                <path d="M10 14h4"/>
                                <path d="M12 12v4"/>
                            </svg>
                        </div>
                        <span class="meta-value">${recipe.cook_time} min</span>
                    </div>
                    ` : ''}
                </div>
            `;

            // Build preparation steps
            const stepsList = (recipe.steps || []).map((step, i) => {
                const duration = step.duration_minutes
                    ? `<span class="step-duration">${step.duration_minutes} min</span>`
                    : '';
                return `<div class="prep-step">${i + 1}. ${step.instruction}${duration}</div>`;
            }).join('');

            // Right page - Preparation
            rightPage.innerHTML = `
                <div class="page-number">${(recipe.id || 0) + 1}</div>
                <div class="section-header">preparation</div>

                <div class="prep-list">
                    ${stepsList || '<div class="prep-step">No preparation steps listed</div>'}
                </div>

                ${recipe.notes ? `<div class="recipe-note">Note: ${recipe.notes}</div>` : ''}
                ${recipe.description ? `<div class="recipe-note">${recipe.description}</div>` : ''}
            `;
        }

        async function sendMessage() {
            const input = document.getElementById('message-input');
            const message = input.value.trim();

            if (!message) return;

            input.value = '';
            addMessage(message, 'user');
            setLoading(true);

            let streamedText = '';

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        message: message,
                        conversation_id: conversationId
                    })
                });

                if (response.status === 401) {
                    window.location.href = '/chat';
                    return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('event:')) {
                            continue;
                        }

                        if (line.startsWith('data:')) {
                            const data = line.substring(5).trim();
                            if (!data) continue;

                            try {
                                const parsed = JSON.parse(data);

                                if (parsed.text !== undefined) {
                                    if (parsed.text) {
                                        streamedText += parsed.text;
                                        updateStreamingMessage(streamedText);
                                    }
                                } else if (parsed.recipe_id !== undefined) {
                                    fetchAndDisplayRecipe(parsed.recipe_id);
                                } else if (parsed.tool) {
                                    setLoading(true, `Using ${parsed.tool}...`);
                                    addMessage(`Using tool: ${parsed.tool}`, 'tool-use');
                                } else if (parsed.conversation_id) {
                                    conversationId = parsed.conversation_id;
                                    finalizeStreamingMessage();
                                } else if (parsed.message && parsed.recoverable !== undefined) {
                                    addMessage(parsed.message, 'error');
                                }
                            } catch (e) {
                                console.log('Parse error:', e, data);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                addMessage('Connection error. Please try again.', 'error');
            }

            setLoading(false);
        }
    </script>
</body>
</html>
"#;
