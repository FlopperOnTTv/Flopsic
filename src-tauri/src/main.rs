#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lofty::{file::TaggedFileExt, prelude::AudioFile, probe::Probe, tag::Accessor};
use rusqlite::{params, Connection};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{fs, path::{Path, PathBuf}};
use tauri::{AppHandle, Manager};
use walkdir::WalkDir;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LibraryTrack {
    id: String,
    path: String,
    title: String,
    artist: String,
    album: String,
    duration: f64,
    artwork_path: Option<String>,
    codec: String,
    bitrate: Option<u32>,
    sample_rate: Option<u32>,
    channels: Option<u8>,
    missing: bool,
}

fn app_database(app: &AppHandle) -> Result<Connection, String> {
    let app_data = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&app_data).map_err(|error| error.to_string())?;
    let database = Connection::open(app_data.join("flopsic.db")).map_err(|error| error.to_string())?;
    database.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS tracks (
            id TEXT PRIMARY KEY, path TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
            artist TEXT NOT NULL, album TEXT NOT NULL, duration REAL NOT NULL,
            artwork_path TEXT, codec TEXT NOT NULL, bitrate INTEGER, sample_rate INTEGER,
            channels INTEGER, missing INTEGER NOT NULL DEFAULT 0,
            date_added TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS tracks_lookup ON tracks(title, artist, album);",
    ).map_err(|error| error.to_string())?;
    Ok(database)
}

fn supported_audio(path: &Path) -> bool {
    matches!(path.extension().and_then(|extension| extension.to_str()).map(|extension| extension.to_ascii_lowercase()).as_deref(), Some("mp3" | "flac" | "wav" | "ogg" | "opus" | "m4a" | "aac"))
}

fn stable_id(path: &Path, size: u64) -> String {
    let mut hash = Sha256::new();
    hash.update(path.to_string_lossy().as_bytes());
    hash.update(size.to_le_bytes());
    format!("{:x}", hash.finalize())
}

fn extract_track(app: &AppHandle, path: &Path) -> Result<LibraryTrack, String> {
    let file_metadata = fs::metadata(path).map_err(|error| error.to_string())?;
    let id = stable_id(path, file_metadata.len());
    let tagged_file = Probe::open(path).map_err(|error| error.to_string())?.read().map_err(|error| error.to_string())?;
    let properties = tagged_file.properties();
    let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag());
    let fallback_title = path.file_stem().and_then(|name| name.to_str()).unwrap_or("Unknown title");
    let title = tag.and_then(|value| value.title()).map(|value| value.into_owned()).unwrap_or_else(|| fallback_title.to_owned());
    let artist = tag.and_then(|value| value.artist()).map(|value| value.into_owned()).unwrap_or_else(|| "Unknown artist".to_owned());
    let album = tag.and_then(|value| value.album()).map(|value| value.into_owned()).unwrap_or_else(|| "Unsorted".to_owned());
    let cache_dir = app.path().app_data_dir().map_err(|error| error.to_string())?.join("artwork");
    fs::create_dir_all(&cache_dir).map_err(|error| error.to_string())?;
    let artwork_path = tag.and_then(|value| value.pictures().first()).map(|picture| {
        let extension = if picture.mime_type().is_some_and(|mime| mime.as_str().contains("png")) { "png" } else { "jpg" };
        let output = cache_dir.join(format!("{id}.{extension}"));
        fs::write(&output, picture.data()).map_err(|error| error.to_string())?;
        Ok::<String, String>(output.to_string_lossy().to_string())
    }).transpose()?;
    Ok(LibraryTrack {
        id, path: path.to_string_lossy().to_string(), title, artist, album,
        duration: properties.duration().as_secs_f64(), artwork_path,
        codec: path.extension().and_then(|value| value.to_str()).unwrap_or("unknown").to_uppercase(),
        bitrate: properties.audio_bitrate(), sample_rate: properties.sample_rate(),
        channels: properties.channels().map(|value| value as u8), missing: false,
    })
}

fn upsert_track(database: &Connection, track: &LibraryTrack) -> Result<(), String> {
    database.execute(
        "INSERT INTO tracks (id,path,title,artist,album,duration,artwork_path,codec,bitrate,sample_rate,channels,missing)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,0)
         ON CONFLICT(path) DO UPDATE SET title=excluded.title,artist=excluded.artist,album=excluded.album,
         duration=excluded.duration,artwork_path=excluded.artwork_path,codec=excluded.codec,
         bitrate=excluded.bitrate,sample_rate=excluded.sample_rate,channels=excluded.channels,missing=0",
        params![track.id, track.path, track.title, track.artist, track.album, track.duration, track.artwork_path, track.codec, track.bitrate, track.sample_rate, track.channels],
    ).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn import_audio_paths(app: AppHandle, paths: Vec<String>) -> Result<Vec<LibraryTrack>, String> {
    let database = app_database(&app)?;
    let mut imported = Vec::new();
    for raw_path in paths {
        let path = PathBuf::from(raw_path);
        if !path.is_file() || !supported_audio(&path) { continue; }
        let track = extract_track(&app, &path)?;
        upsert_track(&database, &track)?;
        imported.push(track);
    }
    Ok(imported)
}

#[tauri::command]
fn list_library_tracks(app: AppHandle) -> Result<Vec<LibraryTrack>, String> {
    let database = app_database(&app)?;
    let mut statement = database.prepare("SELECT id,path,title,artist,album,duration,artwork_path,codec,bitrate,sample_rate,channels,missing FROM tracks ORDER BY date_added DESC").map_err(|error| error.to_string())?;
    let rows = statement.query_map([], |row| Ok(LibraryTrack {
        id: row.get(0)?, path: row.get(1)?, title: row.get(2)?, artist: row.get(3)?, album: row.get(4)?, duration: row.get(5)?, artwork_path: row.get(6)?, codec: row.get(7)?, bitrate: row.get(8)?, sample_rate: row.get(9)?, channels: row.get(10)?, missing: row.get::<_, i64>(11)? != 0,
    })).map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

#[tauri::command]
fn scan_audio_folder(app: AppHandle, folder: String) -> Result<Vec<LibraryTrack>, String> {
    let paths = WalkDir::new(folder).follow_links(false).into_iter().filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file() && supported_audio(entry.path()))
        .map(|entry| entry.path().to_string_lossy().to_string()).collect();
    import_audio_paths(app, paths)
}

#[tauri::command]
fn application_name() -> &'static str { "Flopsic" }

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let window = app.get_webview_window("main").expect("main window exists");
            window.set_title("Flopsic")?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![application_name, import_audio_paths, scan_audio_folder, list_library_tracks])
        .run(tauri::generate_context!())
        .expect("error while running Flopsic");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_real_local_audio_fixture_when_provided() {
        let path = std::env::var("FLOPSIC_TEST_AUDIO").expect("Set FLOPSIC_TEST_AUDIO to a real supported audio file");
        let file = Probe::open(&path).expect("open fixture").read().expect("parse fixture");
        assert!(file.properties().duration().as_secs_f64() >= 0.0);
        let tag = file.primary_tag().or_else(|| file.first_tag());
        eprintln!("fixture title={:?}, artist={:?}, album={:?}, artwork={}", tag.and_then(|value| value.title()), tag.and_then(|value| value.artist()), tag.and_then(|value| value.album()), tag.is_some_and(|value| !value.pictures().is_empty()));
    }

    #[test]
    fn supported_extensions_are_explicit() {
        assert!(supported_audio(Path::new("sample.mp3")));
        assert!(supported_audio(Path::new("sample.FLAC")));
        assert!(!supported_audio(Path::new("sample.txt")));
    }
}
