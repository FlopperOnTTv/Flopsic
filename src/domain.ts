export type RepeatMode = "off" | "queue" | "track";

export interface Track {
  id: string;
  path?: string;
  title: string;
  artist: string;
  album: string;
  url: string;
  duration?: number;
  favorite: boolean;
  dateAdded: string;
  lastPlayed?: string;
  playCount: number;
  missing?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
}

export interface LyricWord { text: string; start: number; end: number; }
export interface LyricLine { start: number; end: number; words: LyricWord[]; }
export interface LyricsResult { source: "local" | "provider"; synchronized: "none" | "line" | "word"; lines: LyricLine[]; text: string; }

export interface PersistedLibrary {
  tracks: Omit<Track, "url">[];
  playlists: Playlist[];
  queueIds: string[];
  repeatMode: RepeatMode;
  shuffle: boolean;
  volume: number;
}
