pub fn log_err<E: std::fmt::Display>(context: &str) -> impl FnOnce(E) -> String + '_ {
    move |e| {
        log::error!("{context}: {e}");
        e.to_string()
    }
}
