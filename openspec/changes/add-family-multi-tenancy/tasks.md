## 1. Dependencies and Configuration Structure

- [ ] 1.1 Add serde_yaml dependency to Cargo.toml
- [ ] 1.2 Create FamiliesConfig struct in src/config.rs with families HashMap
- [ ] 1.3 Create FamilyInfo struct with members Vec<String>
- [ ] 1.4 Implement load_families_config() function to read and parse families.yaml
- [ ] 1.5 Add get_family_members(&self, email: &str) method to FamiliesConfig
- [ ] 1.6 Add families_config field to Config struct
- [ ] 1.7 Load families config in main.rs during startup

## 2. Email Normalization

- [ ] 2.1 Create normalize_email() utility function in src/auth.rs
- [ ] 2.2 Normalize emails when loading families.yaml config
- [ ] 2.3 Update cloudflare_auth middleware to normalize extracted email
- [ ] 2.4 Update api_key_auth middleware to normalize X-User-Email header

## 3. Auth Middleware Updates

- [ ] 3.1 Add family_members: Option<Vec<String>> field to UserIdentity struct
- [ ] 3.2 Pass FamiliesConfig to cloudflare_auth middleware as state
- [ ] 3.3 Look up family members for authenticated email in cloudflare_auth
- [ ] 3.4 Set family_members in UserIdentity extensions
- [ ] 3.5 Handle user not in config case (set family_members to None, log)
- [ ] 3.6 Update api_key_auth to check for X-User-Email header
- [ ] 3.7 Implement X-User-Email scoping (look up family, set in UserIdentity)
- [ ] 3.8 Implement god mode (no X-User-Email = family_members is None)

## 4. Recipe Query Filtering

- [ ] 4.1 Update list_recipes() signature to accept family_members: Option<&[String]>
- [ ] 4.2 Modify list_recipes SQL query to use IN clause when family_members provided
- [ ] 4.3 Implement god mode in list_recipes (None = no filtering, return all)
- [ ] 4.4 Update get_recipe() signature to accept family_members: Option<&[String]>
- [ ] 4.5 Add family filtering to get_recipe query (created_by IN clause)
- [ ] 4.6 Return NotFound error (not Forbidden) when recipe not in family
- [ ] 4.7 Update update_recipe() to accept and filter by family_members
- [ ] 4.8 Add family filtering to update_recipe query
- [ ] 4.9 Update delete_recipe() to accept and filter by family_members
- [ ] 4.10 Add family filtering to delete_recipe query

## 5. Handler Updates

- [ ] 5.1 Update list_recipes handler to extract family_members from UserIdentity
- [ ] 5.2 Pass family_members to list_recipes query function
- [ ] 5.3 Update get_recipe handler to extract and pass family_members
- [ ] 5.4 Update create_recipe handler to extract user email for created_by
- [ ] 5.5 Update update_recipe handler to extract and pass family_members
- [ ] 5.6 Update delete_recipe handler to extract and pass family_members
- [ ] 5.7 Add middleware to return 403 when family_members is None and not god mode
- [ ] 5.8 Create user-friendly 403 error response ("Contact administrator" message)

## 6. MCP Interface Updates

- [ ] 6.1 Add USER_EMAIL environment variable support to MCP server
- [ ] 6.2 Include X-User-Email header when USER_EMAIL is set
- [ ] 6.3 Normalize USER_EMAIL value to lowercase
- [ ] 6.4 Update MCP server documentation for USER_EMAIL configuration

## 7. Unit Tests

- [ ] 7.1 Test normalize_email() with various case combinations
- [ ] 7.2 Test FamiliesConfig loading from valid YAML file (use temp file)
- [ ] 7.3 Test FamiliesConfig loading from malformed YAML (expect error)
- [ ] 7.4 Test get_family_members() with email in config (lowercase)
- [ ] 7.5 Test get_family_members() with email in config (mixed case)
- [ ] 7.6 Test get_family_members() with email not in config (returns None)
- [ ] 7.7 Test cloudflare_auth normalizes and looks up family members
- [ ] 7.8 Test api_key_auth god mode (no X-User-Email header)
- [ ] 7.9 Test api_key_auth scoped mode (with X-User-Email header)

## 8. Integration Tests

- [ ] 8.1 Create test families.yaml fixture with 2 families
- [ ] 8.2 Seed test database with recipes from different families
- [ ] 8.3 Test Family A user lists recipes (sees only Family A recipes)
- [ ] 8.4 Test Family A user gets Family A recipe (success)
- [ ] 8.5 Test Family A user gets Family B recipe (404)
- [ ] 8.6 Test Family A user updates Family A recipe (success)
- [ ] 8.7 Test Family A user updates Family B recipe (404)
- [ ] 8.8 Test Family A user deletes Family A recipe (success)
- [ ] 8.9 Test Family A user deletes Family B recipe (404)
- [ ] 8.10 Test god mode lists all recipes from all families
- [ ] 8.11 Test god mode gets any recipe by ID
- [ ] 8.12 Test god mode creates recipe with DEV_USER_EMAIL as created_by
- [ ] 8.13 Test scoped mode (API key + X-User-Email) sees only that family
- [ ] 8.14 Test user not in config receives 403 error
- [ ] 8.15 Test case-insensitive email matching in queries

## 9. Deployment Configuration

- [ ] 9.1 Create families.yaml template file in repository
- [ ] 9.2 Document families.yaml format in README or deployment docs
- [ ] 9.3 Add families.yaml to .gitignore (avoid committing real emails)
- [ ] 9.4 Create production families.yaml with real family mappings
- [ ] 9.5 Deploy families.yaml to /app/data/ in production

## 10. Documentation and Verification

- [ ] 10.1 Update API documentation with family filtering behavior
- [ ] 10.2 Document god mode vs scoped mode for API key auth
- [ ] 10.3 Document X-User-Email header usage
- [ ] 10.4 Verify all existing recipes belong to correct family (hewitt-family)
- [ ] 10.5 Manual test: Log in as Family A user, verify isolation
- [ ] 10.6 Manual test: Log in as Family B user, verify isolation
- [ ] 10.7 Manual test: MCP client in god mode sees all recipes
- [ ] 10.8 Manual test: MCP client with USER_EMAIL sees only that family
