use serde::Deserialize;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub bind_address: String,
    pub anthropic_api_key: String,
    pub ai_model: String,
    pub dev_user_email: Option<String>,
    pub mock_llm: bool,
    pub mock_recipe_id: Option<String>,
    pub families_config: FamiliesConfig,
    pub photos_dir: String,
}

/// Configuration for family-based multi-tenancy, loaded from families.yaml
#[derive(Debug, Clone)]
pub struct FamiliesConfig {
    /// Reverse lookup: normalized email -> list of all family member emails
    email_to_family: HashMap<String, Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct FamiliesConfigYaml {
    families: HashMap<String, FamilyInfoYaml>,
}

#[derive(Debug, Deserialize)]
struct FamilyInfoYaml {
    members: Vec<String>,
}

impl FamiliesConfig {
    /// Load and parse families config from a YAML file.
    /// All emails are normalized to lowercase.
    pub fn load(path: &Path) -> Result<Self, String> {
        let content = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read families config at {}: {}", path.display(), e))?;

        let yaml: FamiliesConfigYaml = serde_yaml::from_str(&content)
            .map_err(|e| format!("Failed to parse families config: {}", e))?;

        let mut email_to_family = HashMap::new();

        for (_family_name, info) in yaml.families {
            let members: Vec<String> = info.members.iter().map(|e| e.to_lowercase()).collect();

            for email in &members {
                email_to_family.insert(email.clone(), members.clone());
            }
        }

        Ok(FamiliesConfig {
            email_to_family,
        })
    }

    /// Get all family members for a given email address.
    /// Returns None if the email is not in any family.
    /// The email is normalized to lowercase before lookup.
    pub fn get_family_members(&self, email: &str) -> Option<&Vec<String>> {
        self.email_to_family.get(&email.to_lowercase())
    }
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        let database_url = env::var("DATABASE_URL")
            .map_err(|_| "DATABASE_URL must be set".to_string())?;

        let bind_address = env::var("BIND_ADDRESS")
            .unwrap_or_else(|_| "127.0.0.1:3000".to_string());

        let anthropic_api_key = env::var("ANTHROPIC_API_KEY")
            .map_err(|_| "ANTHROPIC_API_KEY must be set".to_string())?;

        let ai_model = env::var("AI_MODEL")
            .unwrap_or_else(|_| "claude-sonnet-4-5".to_string());

        let dev_user_email = env::var("DEV_USER_EMAIL").ok();

        let mock_llm = env::var("MOCK_LLM")
            .unwrap_or_else(|_| "false".to_string())
            .to_lowercase() == "true";

        let mock_recipe_id = env::var("MOCK_RECIPE_ID").ok();

        let families_config_path = env::var("FAMILIES_CONFIG_PATH")
            .unwrap_or_else(|_| "/app/data/families.yaml".to_string());
        let families_config = FamiliesConfig::load(Path::new(&families_config_path))?;

        let photos_dir = env::var("PHOTOS_DIR")
            .unwrap_or_else(|_| "./data/photos".to_string());

        Ok(Config {
            database_url,
            bind_address,
            anthropic_api_key,
            ai_model,
            dev_user_email,
            mock_llm,
            mock_recipe_id,
            families_config,
            photos_dir,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn write_temp_yaml(content: &str) -> tempfile::NamedTempFile {
        let mut file = tempfile::NamedTempFile::new().unwrap();
        file.write_all(content.as_bytes()).unwrap();
        file
    }

    #[test]
    fn test_load_valid_families_config() {
        let yaml = r#"
families:
  hewitt-family:
    members:
      - alice@example.com
      - bob@example.com
  friend-family:
    members:
      - charlie@example.com
"#;
        let file = write_temp_yaml(yaml);
        let config = FamiliesConfig::load(file.path()).unwrap();

        assert!(config.get_family_members("alice@example.com").is_some());
        assert!(config.get_family_members("charlie@example.com").is_some());
    }

    #[test]
    fn test_load_malformed_yaml() {
        let yaml = "this is not: [valid yaml: {{{";
        let file = write_temp_yaml(yaml);
        let result = FamiliesConfig::load(file.path());
        assert!(result.is_err());
    }

    #[test]
    fn test_get_family_members_lowercase() {
        let yaml = r#"
families:
  test-family:
    members:
      - alice@example.com
      - bob@example.com
"#;
        let file = write_temp_yaml(yaml);
        let config = FamiliesConfig::load(file.path()).unwrap();

        let members = config.get_family_members("alice@example.com").unwrap();
        assert_eq!(members.len(), 2);
        assert!(members.contains(&"alice@example.com".to_string()));
        assert!(members.contains(&"bob@example.com".to_string()));
    }

    #[test]
    fn test_get_family_members_mixed_case() {
        let yaml = r#"
families:
  test-family:
    members:
      - Alice@Example.COM
      - bob@example.com
"#;
        let file = write_temp_yaml(yaml);
        let config = FamiliesConfig::load(file.path()).unwrap();

        // Lookup with mixed case should work
        let members = config.get_family_members("ALICE@EXAMPLE.COM").unwrap();
        assert_eq!(members.len(), 2);
        // All stored as lowercase
        assert!(members.contains(&"alice@example.com".to_string()));
        assert!(members.contains(&"bob@example.com".to_string()));
    }

    #[test]
    fn test_get_family_members_not_in_config() {
        let yaml = r#"
families:
  test-family:
    members:
      - alice@example.com
"#;
        let file = write_temp_yaml(yaml);
        let config = FamiliesConfig::load(file.path()).unwrap();

        assert!(config.get_family_members("unknown@example.com").is_none());
    }

    #[test]
    fn test_config_file_missing() {
        let result = FamiliesConfig::load(Path::new("/nonexistent/families.yaml"));
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Failed to read"));
    }
}
