use crate::mcp::http_client::ApiClient;
use crate::mcp::protocol::{JsonRpcError, JsonRpcRequest, JsonRpcResponse};
use crate::mcp::tools;
use serde_json::json;
use std::io::{self, BufRead, Write};
use tracing::{error, info, warn};

/// Run the MCP server, reading JSON-RPC requests from stdin and writing responses to stdout
pub fn run_server(client: ApiClient) -> io::Result<()> {
    info!("MCP server starting, listening on stdin...");

    let stdin = io::stdin();
    let mut stdout = io::stdout();
    let reader = stdin.lock();

    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(e) => {
                error!("Failed to read line from stdin: {}", e);
                continue;
            }
        };

        // Skip empty lines
        if line.trim().is_empty() {
            continue;
        }

        // Parse JSON-RPC request
        let request: JsonRpcRequest = match serde_json::from_str(&line) {
            Ok(req) => req,
            Err(e) => {
                error!("Failed to parse JSON-RPC request: {}", e);
                let error_response = JsonRpcResponse::error(
                    0,
                    JsonRpcError::parse_error(format!("Invalid JSON: {}", e)),
                );
                write_response(&mut stdout, &error_response)?;
                continue;
            }
        };

        info!("Received request: method={}, id={:?}", request.method, request.id);

        // Handle the request
        let response = handle_request(&client, request);

        // Write response only if it's not a notification (has an ID)
        if let Some(response) = response {
            write_response(&mut stdout, &response)?;
        }
    }

    info!("MCP server shutting down");
    Ok(())
}

/// Handle a JSON-RPC request and return a response (None for notifications)
fn handle_request(client: &ApiClient, request: JsonRpcRequest) -> Option<JsonRpcResponse> {
    let request_id = request.id?;

    Some(match request.method.as_str() {
        "initialize" => {
            // MCP initialization handshake
            JsonRpcResponse::success(
                request_id,
                json!({
                    "protocolVersion": "2024-11-05",
                    "serverInfo": {
                        "name": "recipe-vault-mcp",
                        "version": "0.1.0"
                    },
                    "capabilities": {
                        "tools": {}
                    }
                }),
            )
        }
        "tools/list" => {
            // Return list of available tools
            let tools = tools::get_all_tools();
            JsonRpcResponse::success(
                request_id,
                json!({
                    "tools": tools
                }),
            )
        }
        "tools/call" => {
            // Call a specific tool
            let tool_name = match request.params.get("name").and_then(|v| v.as_str()) {
                Some(name) => name,
                None => {
                    return Some(JsonRpcResponse::error(
                        request_id,
                        JsonRpcError::invalid_params("Missing tool name in tools/call"),
                    ));
                }
            };

            let arguments = request.params.get("arguments").cloned().unwrap_or(json!({}));

            let result = match tool_name {
                "list_recipes" => tools::handle_list_recipes(client, arguments),
                "get_recipe" => tools::handle_get_recipe(client, arguments),
                "create_recipe" => tools::handle_create_recipe(client, arguments),
                "update_recipe" => tools::handle_update_recipe(client, arguments),
                "delete_recipe" => tools::handle_delete_recipe(client, arguments),
                "start_timer" => tools::handle_start_timer(client, arguments),
                _ => {
                    return Some(JsonRpcResponse::error(
                        request_id,
                        JsonRpcError::method_not_found(tool_name),
                    ));
                }
            };

            match result {
                Ok(data) => JsonRpcResponse::success(
                    request_id,
                    json!({
                        "content": [{
                            "type": "text",
                            "text": serde_json::to_string_pretty(&data).unwrap_or_else(|_| data.to_string())
                        }]
                    }),
                ),
                Err(error) => JsonRpcResponse::error(request_id, error),
            }
        }
        _ => {
            warn!("Unknown method: {}", request.method);
            JsonRpcResponse::error(request_id, JsonRpcError::method_not_found(request.method))
        }
    })
}

/// Write a JSON-RPC response to stdout
fn write_response(stdout: &mut io::Stdout, response: &JsonRpcResponse) -> io::Result<()> {
    let json = serde_json::to_string(response).map_err(|e| {
        error!("Failed to serialize response: {}", e);
        io::Error::new(io::ErrorKind::Other, e)
    })?;

    writeln!(stdout, "{}", json)?;
    stdout.flush()?;

    info!("Sent response: id={}", response.id);
    Ok(())
}
