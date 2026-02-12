use std::collections::HashMap;
use std::sync::Arc;

use tokio::sync::RwLock;

use crate::ai::Message;

#[derive(Clone, Default)]
pub struct SessionStore {
    sessions: Arc<RwLock<HashMap<String, Vec<Message>>>>,
}

impl SessionStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub async fn append_user_message(
        &self,
        conversation_id: &str,
        message: Message,
    ) -> Vec<Message> {
        let mut sessions = self.sessions.write().await;
        let history = sessions
            .entry(conversation_id.to_string())
            .or_insert_with(Vec::new);
        history.push(message);
        history.clone()
    }

    pub async fn append_messages(&self, conversation_id: &str, messages: Vec<Message>) {
        let mut sessions = self.sessions.write().await;
        if let Some(history) = sessions.get_mut(conversation_id) {
            history.extend(messages);
        }
    }

    pub async fn remove(&self, conversation_id: &str) {
        let mut sessions = self.sessions.write().await;
        sessions.remove(conversation_id);
    }
}
