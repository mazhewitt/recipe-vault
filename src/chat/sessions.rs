use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use tokio::sync::RwLock;

use crate::ai::Message;

const MAX_SESSIONS: usize = 200;
const SESSION_TTL: Duration = Duration::from_secs(60 * 60 * 12);

#[derive(Clone, Default)]
pub struct SessionStore {
    sessions: Arc<RwLock<HashMap<String, SessionEntry>>>,
}

#[derive(Clone)]
struct SessionEntry {
    history: Vec<Message>,
    last_access: Instant,
}

impl SessionStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub async fn append_user_message(
        &self,
        conversation_id: &str,
        message: Message,
    ) -> (Vec<Message>, bool) {
        let mut sessions = self.sessions.write().await;
        let now = Instant::now();
        prune_sessions(&mut sessions, now);

        let mut is_new_session = false;
        let entry = sessions
            .entry(conversation_id.to_string())
            .or_insert_with(|| {
                is_new_session = true;
                SessionEntry {
                    history: Vec::new(),
                    last_access: now,
                }
            });
        entry.last_access = now;
        entry.history.push(message);
        (entry.history.clone(), is_new_session)
    }

    pub async fn append_messages(&self, conversation_id: &str, messages: Vec<Message>) {
        let mut sessions = self.sessions.write().await;
        if let Some(entry) = sessions.get_mut(conversation_id) {
            entry.history.extend(messages);
            entry.last_access = Instant::now();
        }
    }

    pub async fn remove(&self, conversation_id: &str) {
        let mut sessions = self.sessions.write().await;
        sessions.remove(conversation_id);
    }
}

fn prune_sessions(sessions: &mut HashMap<String, SessionEntry>, now: Instant) {
    sessions.retain(|_, entry| now.duration_since(entry.last_access) <= SESSION_TTL);

    if sessions.len() <= MAX_SESSIONS {
        return;
    }

    let mut by_access: Vec<(String, Instant)> = sessions
        .iter()
        .map(|(key, entry)| (key.clone(), entry.last_access))
        .collect();
    by_access.sort_by_key(|(_, last_access)| *last_access);

    let excess = sessions.len().saturating_sub(MAX_SESSIONS);
    for (key, _) in by_access.into_iter().take(excess) {
        sessions.remove(&key);
    }
}
