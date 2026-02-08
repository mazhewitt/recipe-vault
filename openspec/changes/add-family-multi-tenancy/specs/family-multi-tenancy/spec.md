# Family Multi-Tenancy Specification

## Purpose

The Family Multi-Tenancy capability provides configuration-based family groups that allow multiple families to use Recipe Vault while keeping their recipes isolated. Each family consists of one or more user email addresses that share access to the same set of recipes.

## Requirements

### Requirement: Family Configuration File

The system SHALL read family membership from a YAML configuration file at `/app/data/families.yaml`.

#### Scenario: Valid configuration file loaded
- **WHEN** the server starts with a valid `families.yaml` file
- **THEN** the family configuration is loaded into memory
- **AND** all family mappings are available for lookup

#### Scenario: Configuration file missing
- **WHEN** the server starts without a `families.yaml` file
- **THEN** the server logs an error
- **AND** the server fails to start

#### Scenario: Malformed YAML file
- **WHEN** the server starts with an invalid YAML file
- **THEN** the server logs a clear error indicating the syntax issue
- **AND** the server fails to start

### Requirement: Family Member Lookup

The system SHALL provide a method to find all family members for a given email address.

#### Scenario: Email exists in configuration
- **WHEN** looking up an email that is in a family
- **THEN** the system returns a list of all email addresses in that family
- **AND** the list includes the queried email itself

#### Scenario: Email not in any family
- **WHEN** looking up an email that is not in the configuration
- **THEN** the system returns None or empty result
- **AND** no error is logged

#### Scenario: Case-insensitive email matching
- **WHEN** looking up "Alice@Example.com" and config has "alice@example.com"
- **THEN** the lookup succeeds
- **AND** returns all family members

### Requirement: Email Normalization

The system SHALL normalize all email addresses to lowercase for consistent matching.

#### Scenario: Config file emails normalized on load
- **WHEN** the config file contains "Alice@Example.COM"
- **THEN** it is stored internally as "alice@example.com"
- **AND** all lookups use the normalized form

#### Scenario: User email normalized in auth middleware
- **WHEN** a user authenticates with email "Bob@GMAIL.com"
- **THEN** it is normalized to "bob@gmail.com" before family lookup
- **AND** the normalized email is used in all queries

### Requirement: Recipe Query Filtering

The system SHALL filter all recipe queries to only include recipes created by family members.

#### Scenario: List recipes for family member
- **WHEN** a user from Family A requests the recipe list
- **THEN** only recipes where `created_by` is a Family A member email are returned
- **AND** recipes from other families are excluded

#### Scenario: Get recipe owned by family member
- **WHEN** a user from Family A requests a recipe created by a Family A member
- **THEN** the recipe is returned with full details

#### Scenario: Get recipe owned by different family
- **WHEN** a user from Family A requests a recipe created by a Family B member
- **THEN** the system returns 404 Not Found
- **AND** does not reveal the recipe exists

#### Scenario: Update recipe owned by family member
- **WHEN** a user from Family A updates a recipe created by a Family A member
- **THEN** the update succeeds
- **AND** the `updated_by` field is set to the current user's email

#### Scenario: Update recipe owned by different family
- **WHEN** a user from Family A attempts to update a recipe created by a Family B member
- **THEN** the system returns 404 Not Found
- **AND** no changes are made

#### Scenario: Delete recipe owned by family member
- **WHEN** a user from Family A deletes a recipe created by a Family A member
- **THEN** the deletion succeeds
- **AND** the recipe is removed for all Family A members

#### Scenario: Delete recipe owned by different family
- **WHEN** a user from Family A attempts to delete a recipe created by a Family B member
- **THEN** the system returns 404 Not Found
- **AND** the recipe is not deleted

### Requirement: User Not in Configuration

The system SHALL reject requests from users whose email is not in the family configuration.

#### Scenario: Authenticated user not in families.yaml
- **WHEN** a user authenticates with an email not in the configuration
- **THEN** the system returns 403 Forbidden
- **AND** displays a message "Your email is not configured for access. Please contact the administrator."
- **AND** no recipe operations are allowed

### Requirement: God Mode for API Key

The system SHALL allow API key authentication without X-User-Email header to access all recipes regardless of family.

#### Scenario: API key without X-User-Email header
- **WHEN** a request uses a valid API key without X-User-Email header
- **THEN** the request has god mode access
- **AND** can list all recipes from all families
- **AND** can get any recipe by ID
- **AND** can update any recipe (updated_by set to DEV_USER_EMAIL)
- **AND** can delete any recipe

#### Scenario: API key creates recipe in god mode
- **WHEN** a request uses a valid API key without X-User-Email header
- **AND** creates a new recipe
- **THEN** the recipe `created_by` field is set to DEV_USER_EMAIL
- **AND** the recipe `updated_by` field is set to DEV_USER_EMAIL

### Requirement: Scoped Mode for API Key with X-User-Email

The system SHALL scope API key requests to a family when X-User-Email header is provided.

#### Scenario: API key with X-User-Email in configuration
- **WHEN** a request uses a valid API key with X-User-Email header
- **AND** the email is in the family configuration
- **THEN** the request is scoped to that user's family
- **AND** follows the same filtering rules as Cloudflare authentication

#### Scenario: API key with X-User-Email not in configuration
- **WHEN** a request uses a valid API key with X-User-Email header
- **AND** the email is not in the family configuration
- **THEN** the system returns 403 Forbidden
- **AND** displays the "contact administrator" message

## Data Types

### FamiliesConfig
```
FamiliesConfig {
    families: Map<String, FamilyInfo>
}
```

### FamilyInfo
```
FamilyInfo {
    members: Vec<String>  // lowercase normalized email addresses
}
```

### UserIdentity
```
UserIdentity {
    email: Option<String>
    family_members: Option<Vec<String>>  // All emails in user's family (normalized)
}
```

## Related Capabilities

- **api-security**: Family scoping integrated with authentication middleware
- **recipe-domain**: Recipe queries filtered by family membership
- **mcp-interface**: MCP client can pass X-User-Email for scoped access or omit for god mode
