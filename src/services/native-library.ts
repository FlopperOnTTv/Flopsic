import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export type NativeTrack = { id: string; path: string; title: string; artist: string; album: string; duration: number; artworkPath?: string; codec: string; bitrate?: number; sampleRate?: number; channels?: number; missing: boolean };

function hasTauri() { return "__TAURI_INTERNALS__" in window; }
export function assetUrl(path: string) { return hasTauri() ? convertFileSrc(path) : path; }
export async function pickNativeAudioFiles() { if (!hasTauri()) return []; const result = await open({ multiple: true, directory: false, filters: [{ name: "Audio", extensions: ["mp3", "flac", "wav", "ogg", "opus", "m4a", "aac"] }] }); return result ? (Array.isArray(result) ? result : [result]) : []; }
export async function pickNativeFolder() { if (!hasTauri()) return []; const result = await open({ directory: true, multiple: false }); return result ? [result as string] : []; }
export async function importNativePaths(paths: string[]) { return invoke<NativeTrack[]>("import_audio_paths", { paths }); }
export async function scanNativeFolder(folder: string) { return invoke<NativeTrack[]>("scan_audio_folder", { folder }); }
export async function loadNativeLibrary() { return invoke<NativeTrack[]>("list_library_tracks"); }
