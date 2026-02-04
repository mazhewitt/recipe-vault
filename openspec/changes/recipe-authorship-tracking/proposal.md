## Why

Now that Cloudflare Access provides user identity, we want to track which family member created or modified each recipe. This helps family members see who added recipes and who last updated them.

## What Changes

- Add `created_by` and `updated_by` fields to recipes database schema
- Update recipe handlers to capture user identity on create/update operations
- Display authorship information in the recipe UI

## Dependencies

- Requires `cloudflare-identity-auth` change to be deployed first (provides user identity)

## Capabilities

### Modified Capabilities

- `recipe-domain`: Recipes gain `created_by` and `updated_by` email fields tracked on create/update operations

## Impact

- **Database**: Migration to add `created_by` (nullable, string) and `updated_by` (nullable, string) columns to recipes table
- **Recipe handlers**: Capture user email on create/update operations
- **UI templates**: Display who created/updated recipes
- **Backward compatible**: Nullable fields allow recipes created before this change or via API to work normally
