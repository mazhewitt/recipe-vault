use axum::{
    response::{Html, IntoResponse},
};

/// GET /chat - Render the chat page
pub async fn chat_page() -> impl IntoResponse {
    Html(CHAT_PAGE_HTML)
}

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
            text-align: center;
        }

        .header h1 {
            font-size: 1.5rem;
            font-weight: 500;
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

        .api-key-form {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            max-width: 400px;
            margin: 2rem auto;
        }

        .api-key-form h2 {
            margin-bottom: 1rem;
            color: #2c3e50;
        }

        .api-key-form input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 1rem;
        }

        .api-key-form button {
            width: 100%;
            padding: 0.75rem;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
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
    </div>

    <div class="container">
        <div id="api-key-form" class="api-key-form" style="display: none;">
            <h2>Enter API Key</h2>
            <input type="password" id="api-key-input" placeholder="Your API key">
            <button onclick="saveApiKey()">Save</button>
        </div>

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

    <script>
        let conversationId = null;
        let apiKey = localStorage.getItem('recipe_vault_api_key');

        // Check for API key
        if (!apiKey) {
            document.getElementById('api-key-form').style.display = 'block';
            document.getElementById('chat-container').style.display = 'none';
        }

        function saveApiKey() {
            const key = document.getElementById('api-key-input').value;
            if (key) {
                localStorage.setItem('recipe_vault_api_key', key);
                apiKey = key;
                document.getElementById('api-key-form').style.display = 'none';
                document.getElementById('chat-container').style.display = 'flex';
            }
        }

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

        async function sendMessage() {
            const input = document.getElementById('message-input');
            const message = input.value.trim();

            if (!message || !apiKey) return;

            input.value = '';
            addMessage(message, 'user');
            setLoading(true);

            let streamedText = '';

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey
                    },
                    body: JSON.stringify({
                        message: message,
                        conversation_id: conversationId
                    })
                });

                if (response.status === 401) {
                    addMessage('Invalid API key. Please refresh and try again.', 'error');
                    localStorage.removeItem('recipe_vault_api_key');
                    setLoading(false);
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
