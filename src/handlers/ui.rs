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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recipe Vault - Chat</title>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <script src="https://unpkg.com/htmx.org@1.9.10/dist/ext/sse.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #f5f5f5;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .header {
            background: #2c3e50;
            color: white;
            padding: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .header h1 {
            font-size: 1.5rem;
            font-weight: 500;
        }

        .header .logout-btn {
            background: transparent;
            border: 1px solid rgba(255,255,255,0.5);
            color: white;
            padding: 0.4rem 0.8rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: background 0.2s;
        }

        .header .logout-btn:hover {
            background: rgba(255,255,255,0.1);
        }

        .main-content {
            flex: 1;
            display: flex;
            overflow: hidden;
        }

        .chat-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            max-width: 800px;
            margin: 0 auto;
            width: 100%;
            padding: 1rem 1rem 0.5rem 1rem;
            transition: max-width 0.3s ease;
        }

        .main-content.has-recipe .chat-section {
            max-width: 100%;
            flex: 0 0 60%;
        }

        .recipe-panel {
            display: none;
            flex: 0 0 40%;
            background: white;
            border-left: 1px solid #ddd;
            overflow-y: auto;
            padding: 1rem;
        }

        .main-content.has-recipe .recipe-panel {
            display: block;
        }

        .recipe-panel .close-btn {
            display: none;
        }

        /* Recipe panel content styles */
        .recipe-loading {
            padding: 2rem;
            text-align: center;
            color: #7f8c8d;
        }

        .recipe-loading .skeleton {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 4px;
            margin-bottom: 1rem;
        }

        .recipe-loading .skeleton-title { height: 2rem; width: 70%; }
        .recipe-loading .skeleton-meta { height: 1rem; width: 50%; }
        .recipe-loading .skeleton-line { height: 1rem; width: 100%; margin-bottom: 0.5rem; }

        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }

        .recipe-error {
            padding: 2rem;
            text-align: center;
            color: #e74c3c;
        }

        .recipe-content h2 {
            margin: 0 0 0.5rem 0;
            color: #2c3e50;
        }

        .recipe-content .recipe-meta {
            color: #7f8c8d;
            font-size: 0.9rem;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #eee;
        }

        .recipe-content .recipe-description {
            margin-bottom: 1rem;
            color: #555;
        }

        .recipe-content h3 {
            margin: 1rem 0 0.5rem 0;
            color: #2c3e50;
            font-size: 1.1rem;
        }

        .recipe-content .ingredients-list {
            list-style: none;
            padding: 0;
        }

        .recipe-content .ingredients-list li {
            padding: 0.5rem 0;
            border-bottom: 1px solid #f0f0f0;
        }

        .recipe-content .ingredient-notes {
            color: #7f8c8d;
            font-size: 0.9rem;
            font-style: italic;
        }

        .recipe-content .steps-list {
            list-style: none;
            padding: 0;
            counter-reset: step-counter;
        }

        .recipe-content .steps-list li {
            padding: 0.75rem 0 0.75rem 2.5rem;
            border-bottom: 1px solid #f0f0f0;
            position: relative;
        }

        .recipe-content .steps-list li::before {
            content: counter(step-counter);
            counter-increment: step-counter;
            position: absolute;
            left: 0;
            top: 0.75rem;
            width: 1.75rem;
            height: 1.75rem;
            background: #3498db;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
            font-weight: 500;
        }

        .recipe-content .step-duration {
            display: inline-block;
            background: #e8f4fc;
            color: #3498db;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
            margin-top: 0.5rem;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
            .main-content.has-recipe .chat-section {
                flex: 1;
                max-width: 100%;
            }

            .recipe-panel {
                position: fixed;
                top: 0;
                right: 0;
                bottom: 0;
                width: 100%;
                max-width: 400px;
                z-index: 100;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                border-left: none;
                box-shadow: -4px 0 20px rgba(0,0,0,0.15);
            }

            .main-content.has-recipe .recipe-panel {
                transform: translateX(0);
            }

            .recipe-panel .close-btn {
                display: block;
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: #f0f0f0;
                border: none;
                width: 2rem;
                height: 2rem;
                border-radius: 50%;
                cursor: pointer;
                font-size: 1.2rem;
                line-height: 1;
            }

            .recipe-panel .close-btn:hover {
                background: #e0e0e0;
            }
        }

        .container {
            flex: 1;
            max-width: 800px;
            margin: 0 auto;
            width: 100%;
            display: flex;
            flex-direction: column;
            padding: 1rem 1rem 0.5rem 1rem;
        }

        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
            background: white;
            border-radius: 8px;
            margin-bottom: 1rem;
            min-height: 400px;
            max-height: calc(100vh - 150px);
        }

        .message {
            margin-bottom: 1rem;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            max-width: 85%;
            word-wrap: break-word;
        }

        .message.user {
            background: #3498db;
            color: white;
            margin-left: auto;
        }

        .message.assistant {
            background: #ecf0f1;
            color: #2c3e50;
        }

        .message.tool-use {
            background: #fff3cd;
            color: #856404;
            font-size: 0.9rem;
            padding: 0.5rem 0.75rem;
            font-style: italic;
        }

        .message.error {
            background: #f8d7da;
            color: #721c24;
        }

        .message.streaming {
            opacity: 0.8;
        }

        /* Markdown styles for assistant messages */
        .message.assistant h1,
        .message.assistant h2,
        .message.assistant h3,
        .message.assistant h4 {
            margin: 0.75rem 0 0.5rem 0;
            font-weight: 600;
            line-height: 1.3;
        }

        .message.assistant h1:first-child,
        .message.assistant h2:first-child,
        .message.assistant h3:first-child,
        .message.assistant h4:first-child {
            margin-top: 0;
        }

        .message.assistant h1 { font-size: 1.3rem; }
        .message.assistant h2 { font-size: 1.15rem; }
        .message.assistant h3 { font-size: 1.05rem; }
        .message.assistant h4 { font-size: 1rem; }

        .message.assistant p {
            margin: 0.5rem 0;
        }

        .message.assistant p:first-child {
            margin-top: 0;
        }

        .message.assistant p:last-child {
            margin-bottom: 0;
        }

        .message.assistant ul,
        .message.assistant ol {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
        }

        .message.assistant li {
            margin: 0.25rem 0;
        }

        .message.assistant strong {
            font-weight: 600;
        }

        .message.assistant em {
            font-style: italic;
        }

        .message.assistant hr {
            border: none;
            border-top: 1px solid #ccc;
            margin: 0.75rem 0;
        }

        .input-area {
            display: flex;
            gap: 0.5rem;
            background: white;
            padding: 0.75rem;
            border-radius: 8px;
        }

        .input-area input {
            flex: 1;
            padding: 0.75rem 1rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
        }

        .input-area input:focus {
            outline: none;
            border-color: #3498db;
        }

        .input-area button {
            padding: 0.75rem 1.5rem;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            transition: background 0.2s;
        }

        .input-area button:hover {
            background: #2980b9;
        }

        .input-area button:disabled {
            background: #bdc3c7;
            cursor: not-allowed;
        }

        .loading {
            display: none;
            align-items: center;
            gap: 0.5rem;
            color: #7f8c8d;
            font-size: 0.9rem;
            margin-bottom: 1rem;
        }

        .loading.active {
            display: flex;
        }

        .loading .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #ddd;
            border-top-color: #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        @media (max-width: 600px) {
            .container {
                padding: 0.5rem 0.5rem 0.25rem 0.5rem;
            }

            .messages {
                min-height: 300px;
            }

            .message {
                max-width: 95%;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Recipe Vault Chat</h1>
        <form method="POST" action="/logout" style="margin: 0;">
            <button type="submit" class="logout-btn">Logout</button>
        </form>
    </div>

    <div id="main-content" class="main-content">
        <div class="chat-section">
            <div id="chat-container" style="display: flex; flex-direction: column; flex: 1;">
                <div id="messages" class="messages">
                    <div class="message assistant">
                        Hello! I'm your cooking assistant. I can help you manage your recipes -
                        list them, get details, create new ones, or update existing recipes.
                        What would you like to do?
                    </div>
                </div>

                <div id="loading" class="loading">
                    <div class="spinner"></div>
                    <span id="loading-text">Thinking...</span>
                </div>

                <div class="input-area">
                    <input type="text" id="message-input" placeholder="Ask about your recipes..."
                           onkeypress="if(event.key === 'Enter') sendMessage()">
                    <button id="send-btn" onclick="sendMessage()">Send</button>
                </div>
            </div>
        </div>

        <div id="recipe-panel" class="recipe-panel">
            <button class="close-btn" onclick="closeRecipePanel()">&times;</button>
            <div id="recipe-panel-content">
                <!-- Recipe content will be inserted here -->
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
            // Use markdown rendering for assistant messages, plain text for user
            if (role === 'assistant') {
                div.innerHTML = renderMarkdown(content);
            } else {
                div.textContent = content;
            }
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
                msg.innerHTML = renderMarkdown(content);
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
            const sendBtn = document.getElementById('send-btn');
            const input = document.getElementById('message-input');

            loadingEl.classList.toggle('active', loading);
            loadingText.textContent = text;
            sendBtn.disabled = loading;
            input.disabled = loading;
        }

        // Recipe Panel Functions
        function showRecipeLoading() {
            const mainContent = document.getElementById('main-content');
            const panelContent = document.getElementById('recipe-panel-content');
            mainContent.classList.add('has-recipe');
            panelContent.innerHTML = `
                <div class="recipe-loading">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-meta"></div>
                    <div class="skeleton skeleton-line"></div>
                    <div class="skeleton skeleton-line"></div>
                    <div class="skeleton skeleton-line"></div>
                    <div class="skeleton skeleton-line"></div>
                    <p style="margin-top: 1rem;">Loading recipe...</p>
                </div>
            `;
        }

        function showRecipeError(message) {
            const panelContent = document.getElementById('recipe-panel-content');
            panelContent.innerHTML = `
                <div class="recipe-error">
                    <p>${message}</p>
                </div>
            `;
        }

        function closeRecipePanel() {
            const mainContent = document.getElementById('main-content');
            mainContent.classList.remove('has-recipe');
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
            const panelContent = document.getElementById('recipe-panel-content');

            // Build metadata string
            const metaParts = [];
            if (recipe.prep_time) metaParts.push(`Prep: ${recipe.prep_time} min`);
            if (recipe.cook_time) metaParts.push(`Cook: ${recipe.cook_time} min`);
            if (recipe.servings) metaParts.push(`Serves: ${recipe.servings}`);
            const metaStr = metaParts.join(' | ');

            // Build ingredients list
            const ingredientsList = (recipe.ingredients || []).map(ing => {
                const qty = ing.quantity ? `${ing.quantity} ` : '';
                const unit = ing.unit ? `${ing.unit} ` : '';
                const notes = ing.notes ? `<span class="ingredient-notes">(${ing.notes})</span>` : '';
                return `<li>${qty}${unit}${ing.name} ${notes}</li>`;
            }).join('');

            // Build steps list
            const stepsList = (recipe.steps || []).map(step => {
                const duration = step.duration_minutes
                    ? `<span class="step-duration">${step.duration_minutes} min</span>`
                    : '';
                return `<li>${step.instruction}${duration}</li>`;
            }).join('');

            panelContent.innerHTML = `
                <div class="recipe-content">
                    <h2>${recipe.title || 'Untitled Recipe'}</h2>
                    ${metaStr ? `<div class="recipe-meta">${metaStr}</div>` : ''}
                    ${recipe.description ? `<p class="recipe-description">${recipe.description}</p>` : ''}

                    ${ingredientsList ? `
                        <h3>Ingredients</h3>
                        <ul class="ingredients-list">${ingredientsList}</ul>
                    ` : ''}

                    ${stepsList ? `
                        <h3>Instructions</h3>
                        <ol class="steps-list">${stepsList}</ol>
                    ` : ''}
                </div>
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
                    // Session expired - redirect to login
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
                            const eventType = line.substring(6).trim();
                            continue;
                        }

                        if (line.startsWith('data:')) {
                            const data = line.substring(5).trim();
                            if (!data) continue;

                            try {
                                const parsed = JSON.parse(data);

                                if (parsed.text !== undefined) {
                                    // Text chunk
                                    if (parsed.text) {
                                        streamedText += parsed.text;
                                        updateStreamingMessage(streamedText);
                                    }
                                } else if (parsed.recipe_id !== undefined) {
                                    // Recipe artifact event - fetch and display
                                    fetchAndDisplayRecipe(parsed.recipe_id);
                                } else if (parsed.tool) {
                                    // Tool use notification
                                    setLoading(true, `Using ${parsed.tool}...`);
                                    addMessage(`Using tool: ${parsed.tool}`, 'tool-use');
                                } else if (parsed.conversation_id) {
                                    // Done event
                                    conversationId = parsed.conversation_id;
                                    finalizeStreamingMessage();
                                } else if (parsed.message && parsed.recoverable !== undefined) {
                                    // Error event
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
