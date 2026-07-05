mod commands;
mod db;
mod detector;
mod fs_tree;
mod models;
mod search;
mod watcher;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let db = db::AppDb::new(app.handle())?;
            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::add_project,
            commands::check_for_updates,
            commands::close_window,
            commands::get_app_state,
            commands::get_app_version,
            commands::get_file_tree,
            commands::get_file_tree_stream,
            commands::get_setting,
            commands::install_update,
            commands::minimize_window,
            commands::open_external,
            commands::open_path,
            commands::read_file,
            commands::remove_project,
            commands::save_project_state,
            commands::search_files,
            commands::select_folder,
            commands::set_setting,
            commands::set_title_bar_overlay,
            commands::start_watcher,
            commands::toggle_maximize
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Markdown Organizer");
}
