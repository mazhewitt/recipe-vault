use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Step {
    pub id: String,
    pub recipe_id: String,
    pub position: i32,
    pub instruction: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_minutes: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature_value: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature_unit: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TemperatureUnit {
    Celsius,
    Fahrenheit,
}

impl TemperatureUnit {
    pub fn as_str(&self) -> &'static str {
        match self {
            TemperatureUnit::Celsius => "Celsius",
            TemperatureUnit::Fahrenheit => "Fahrenheit",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "Celsius" => Some(TemperatureUnit::Celsius),
            "Fahrenheit" => Some(TemperatureUnit::Fahrenheit),
            _ => None,
        }
    }
}
