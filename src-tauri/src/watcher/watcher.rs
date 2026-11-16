use std::time::Duration;

use notify_debouncer_full::{DebounceEventResult, new_debouncer, notify::*};

pub struct Watcher {
    pub debouncer: notify_debouncer_full::Debouncer<
        RecommendedWatcher,
        notify_debouncer_full::RecommendedCache,
    >,
}

impl Watcher {
    pub fn setup() {
        let mut debouncer = new_debouncer(
            Duration::from_secs(2),
            None,
            |result: DebounceEventResult| match result {
                Ok(events) => events.iter().for_each(|event| println!("{event:?}")),
                Err(errors) => errors.iter().for_each(|error| println!("{error:?}")),
            },
        )
        .unwrap();
    }
}
