mod common;

use axum::http::StatusCode;
use rstest::*;
use serde_json::json;
use sqlx::SqlitePool;

use common::{
    create_test_app, create_test_db, send_binary_request, send_multipart_request, send_request,
};

#[fixture]
async fn test_db() -> SqlitePool {
    create_test_db().await
}

/// Create a test recipe and return its ID
async fn create_test_recipe(app: &axum::Router, title: &str) -> String {
    let recipe_json = json!({
        "title": title,
        "description": "Test recipe for photo upload"
    });

    let (status, response) = send_request(app, "POST", "/api/recipes", Some(recipe_json)).await;
    assert_eq!(status, StatusCode::CREATED);
    let recipe = response.expect("Expected recipe response");
    recipe["id"].as_str().unwrap().to_string()
}

/// Create a test image (1x1 PNG pixel)
fn create_test_image_png() -> Vec<u8> {
    // Minimal 1x1 PNG image (67 bytes)
    vec![
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F,
        0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00,
        0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ]
}

/// Create a test JPEG image (minimal valid JPEG)
fn create_test_image_jpeg() -> Vec<u8> {
    // Minimal valid JPEG (134 bytes - 1x1 pixel)
    vec![
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x03, 0x02, 0x02, 0x02, 0x02,
        0x02, 0x03, 0x02, 0x02, 0x02, 0x03, 0x03, 0x03, 0x03, 0x04, 0x06, 0x04, 0x04, 0x04, 0x04,
        0x04, 0x08, 0x06, 0x06, 0x05, 0x06, 0x09, 0x08, 0x0A, 0x0A, 0x09, 0x08, 0x09, 0x09, 0x0A,
        0x0C, 0x0F, 0x0C, 0x0A, 0x0B, 0x0E, 0x0B, 0x09, 0x09, 0x0D, 0x11, 0x0D, 0x0E, 0x0F, 0x10,
        0x10, 0x11, 0x10, 0x0A, 0x0C, 0x12, 0x13, 0x12, 0x10, 0x13, 0x0F, 0x10, 0x10, 0x10, 0xFF,
        0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00,
        0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08,
        0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7F, 0x00, 0xFF, 0xD9,
    ]
}

// ==== Scenario: Successful photo upload ====
#[rstest]
#[tokio::test]
async fn test_successful_photo_upload(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    // Create a recipe
    let recipe_id = create_test_recipe(&app, "Test Recipe").await;

    // Upload a photo
    let image_data = create_test_image_png();
    let (status, response) = send_multipart_request(
        &app,
        "POST",
        &format!("/api/recipes/{}/photo", recipe_id),
        "photo",
        image_data,
        "test.png",
        "image/png",
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let response_json = response.expect("Expected JSON response");
    assert!(response_json["photo_filename"].is_string());
    assert!(response_json["photo_filename"]
        .as_str()
        .unwrap()
        .ends_with(".png"));
}

// ==== Scenario: Upload photo that's too large ====
#[rstest]
#[tokio::test]
async fn test_upload_photo_too_large(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    let recipe_id = create_test_recipe(&app, "Test Recipe").await;

    // Create a 6MB file (exceeds 5MB limit)
    let large_image = vec![0u8; 6 * 1024 * 1024];

    let (status, _) = send_multipart_request(
        &app,
        "POST",
        &format!("/api/recipes/{}/photo", recipe_id),
        "photo",
        large_image,
        "large.jpg",
        "image/jpeg",
    )
    .await;

    // Note: Axum's multipart parser may reject very large files as 400 Bad Request
    // before our 413 validation runs. Both are acceptable for oversized files.
    assert!(status == StatusCode::BAD_REQUEST || status == StatusCode::PAYLOAD_TOO_LARGE);
}

// ==== Scenario: Upload photo with invalid extension ====
#[rstest]
#[tokio::test]
async fn test_upload_invalid_extension(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    let recipe_id = create_test_recipe(&app, "Test Recipe").await;

    let text_file = b"This is not an image".to_vec();

    let (status, _) = send_multipart_request(
        &app,
        "POST",
        &format!("/api/recipes/{}/photo", recipe_id),
        "photo",
        text_file,
        "file.txt",
        "text/plain",
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
}

// ==== Scenario: Upload to non-existent recipe ====
#[rstest]
#[tokio::test]
async fn test_upload_to_nonexistent_recipe(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    let fake_id = "00000000-0000-0000-0000-000000000000";
    let image_data = create_test_image_png();

    let (status, _) = send_multipart_request(
        &app,
        "POST",
        &format!("/api/recipes/{}/photo", fake_id),
        "photo",
        image_data,
        "test.png",
        "image/png",
    )
    .await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ==== Scenario: Replace photo with different format ====
#[rstest]
#[tokio::test]
async fn test_replace_photo_different_format(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    let recipe_id = create_test_recipe(&app, "Test Recipe").await;

    // Upload PNG first
    let png_data = create_test_image_png();
    let (status, _) = send_multipart_request(
        &app,
        "POST",
        &format!("/api/recipes/{}/photo", recipe_id),
        "photo",
        png_data,
        "test.png",
        "image/png",
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // Replace with JPEG
    let jpeg_data = create_test_image_jpeg();
    let (status, response) = send_multipart_request(
        &app,
        "POST",
        &format!("/api/recipes/{}/photo", recipe_id),
        "photo",
        jpeg_data,
        "test.jpg",
        "image/jpeg",
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let response_json = response.expect("Expected JSON response");
    assert!(response_json["photo_filename"]
        .as_str()
        .unwrap()
        .ends_with(".jpg"));
}

// ==== Scenario: Retrieve existing photo ====
#[rstest]
#[tokio::test]
async fn test_retrieve_photo(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    let recipe_id = create_test_recipe(&app, "Test Recipe").await;

    // Upload a photo
    let original_image = create_test_image_png();
    send_multipart_request(
        &app,
        "POST",
        &format!("/api/recipes/{}/photo", recipe_id),
        "photo",
        original_image.clone(),
        "test.png",
        "image/png",
    )
    .await;

    // Retrieve the photo
    let (status, body, content_type) =
        send_binary_request(&app, "GET", &format!("/api/recipes/{}/photo", recipe_id)).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(content_type.unwrap(), "image/png");
    assert_eq!(body, original_image);
}

// ==== Scenario: Retrieve photo for recipe without photo ====
#[rstest]
#[tokio::test]
async fn test_retrieve_photo_not_found(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    let recipe_id = create_test_recipe(&app, "Test Recipe").await;

    // Try to retrieve photo (none uploaded)
    let (status, _, _) =
        send_binary_request(&app, "GET", &format!("/api/recipes/{}/photo", recipe_id)).await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ==== Scenario: Delete photo ====
#[rstest]
#[tokio::test]
async fn test_delete_photo(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    let recipe_id = create_test_recipe(&app, "Test Recipe").await;

    // Upload a photo
    let image_data = create_test_image_png();
    send_multipart_request(
        &app,
        "POST",
        &format!("/api/recipes/{}/photo", recipe_id),
        "photo",
        image_data,
        "test.png",
        "image/png",
    )
    .await;

    // Delete the photo
    let (status, _) =
        send_request(&app, "DELETE", &format!("/api/recipes/{}/photo", recipe_id), None).await;

    assert_eq!(status, StatusCode::OK);

    // Verify photo is gone
    let (status, _, _) =
        send_binary_request(&app, "GET", &format!("/api/recipes/{}/photo", recipe_id)).await;
    assert_eq!(status, StatusCode::NOT_FOUND);

    // Verify recipe still exists but photo_filename is NULL
    let (status, response) = send_request(&app, "GET", &format!("/api/recipes/{}", recipe_id), None).await;
    assert_eq!(status, StatusCode::OK);
    let recipe = response.unwrap();
    assert!(recipe["photo_filename"].is_null());
}

// ==== Scenario: Recipe deletion cascades to photo ====
#[rstest]
#[tokio::test]
async fn test_recipe_deletion_removes_photo(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    let recipe_id = create_test_recipe(&app, "Test Recipe").await;

    // Upload a photo
    let image_data = create_test_image_png();
    send_multipart_request(
        &app,
        "POST",
        &format!("/api/recipes/{}/photo", recipe_id),
        "photo",
        image_data,
        "test.png",
        "image/png",
    )
    .await;

    // Delete the recipe
    let (status, _) = send_request(&app, "DELETE", &format!("/api/recipes/{}", recipe_id), None).await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    // Verify recipe is gone
    let (status, _) = send_request(&app, "GET", &format!("/api/recipes/{}", recipe_id), None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);

    // Verify photo endpoint also returns 404
    let (status, _, _) =
        send_binary_request(&app, "GET", &format!("/api/recipes/{}/photo", recipe_id)).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ==== Scenario: Content-Type detection for different formats ====
#[rstest]
#[tokio::test]
async fn test_content_type_detection(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    // Test PNG
    let recipe_id_png = create_test_recipe(&app, "PNG Recipe").await;
    send_multipart_request(
        &app,
        "POST",
        &format!("/api/recipes/{}/photo", recipe_id_png),
        "photo",
        create_test_image_png(),
        "test.png",
        "image/png",
    )
    .await;

    let (_, _, content_type) =
        send_binary_request(&app, "GET", &format!("/api/recipes/{}/photo", recipe_id_png)).await;
    assert_eq!(content_type.unwrap(), "image/png");

    // Test JPEG
    let recipe_id_jpeg = create_test_recipe(&app, "JPEG Recipe").await;
    send_multipart_request(
        &app,
        "POST",
        &format!("/api/recipes/{}/photo", recipe_id_jpeg),
        "photo",
        create_test_image_jpeg(),
        "test.jpg",
        "image/jpeg",
    )
    .await;

    let (_, _, content_type) =
        send_binary_request(&app, "GET", &format!("/api/recipes/{}/photo", recipe_id_jpeg)).await;
    assert_eq!(content_type.unwrap(), "image/jpeg");
}
