use axum::http::StatusCode;
use serde_json::json;

mod common;
use common::{create_test_db, create_test_app, send_request};

#[tokio::test]
async fn recipe_list_and_ordering() {
    let pool = create_test_db().await;
    let app = create_test_app(pool.clone());

    let r1 = json!({ "title": "Banana Bread" });
    let r2 = json!({ "title": "Apple Pie" });
    let r3 = json!({ "title": "Carrot Soup" });

    let (s, _) = send_request(&app, "POST", "/api/recipes", Some(r1)).await;
    assert_eq!(s, StatusCode::CREATED);
    let (s, _) = send_request(&app, "POST", "/api/recipes", Some(r2)).await;
    assert_eq!(s, StatusCode::CREATED);
    let (s, _) = send_request(&app, "POST", "/api/recipes", Some(r3)).await;
    assert_eq!(s, StatusCode::CREATED);

    // List recipes and verify alphabetical ordering by title
    let (s, body) = send_request(&app, "GET", "/api/recipes", None).await;
    assert_eq!(s, StatusCode::OK);
    let arr = body.expect("expected json array");
    let titles: Vec<String> = arr.as_array().unwrap().iter().map(|v| v["title"].as_str().unwrap().to_string()).collect();
    assert_eq!(titles, vec!["Apple Pie", "Banana Bread", "Carrot Soup"]);
}

#[tokio::test]
async fn deletion_fallback_and_creation_visibility() {
    let pool = create_test_db().await;
    let app = create_test_app(pool.clone());

    // Create two recipes
    let (s, body) = send_request(&app, "POST", "/api/recipes", Some(json!({ "title": "One" }))).await;
    assert_eq!(s, StatusCode::CREATED);
    let created1 = body.expect("created1");
    let id1 = created1["id"].as_str().unwrap().to_string();

    let (s, body) = send_request(&app, "POST", "/api/recipes", Some(json!({ "title": "Two" }))).await;
    assert_eq!(s, StatusCode::CREATED);
    let created2 = body.expect("created2");
    let id2 = created2["id"].as_str().unwrap().to_string();

    // Delete the first recipe
    let (s, _) = send_request(&app, "DELETE", &format!("/api/recipes/{}", id1), None).await;
    assert_eq!(s, StatusCode::NO_CONTENT);

    // Ensure fetching deleted recipe returns 404
    let (s, _) = send_request(&app, "GET", &format!("/api/recipes/{}", id1), None).await;
    assert_eq!(s, StatusCode::NOT_FOUND);

    // List should contain only second
    let (s, body) = send_request(&app, "GET", "/api/recipes", None).await;
    assert_eq!(s, StatusCode::OK);
    let arr = body.expect("expected json array");
    assert_eq!(arr.as_array().unwrap().len(), 1);
    assert_eq!(arr[0]["id"].as_str().unwrap(), id2.as_str());

    // Create a new recipe and ensure it appears
    let (s, _) = send_request(&app, "POST", "/api/recipes", Some(json!({ "title": "Zed" }))).await;
    assert_eq!(s, StatusCode::CREATED);
    // List should now have 2 items
    let (s, body) = send_request(&app, "GET", "/api/recipes", None).await;
    assert_eq!(s, StatusCode::OK);
    let arr = body.expect("expected json array");
    assert!(arr.as_array().unwrap().iter().any(|r| r["title"].as_str().unwrap() == "Zed"));
}
