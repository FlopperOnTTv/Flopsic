import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Album, ChevronLeft, ChevronRight, FolderOpen, Grid2X2, Heart, History,
  ListMusic, LoaderCircle, MoreHorizontal, Music2, Pause, Play, Plus,
  Repeat2, Search, Settings2, Shuffle, SkipBack, SkipForward, SlidersHorizontal,
  Sparkles, Volume2, X,
} from "lucide-react";
import { GlideSelect } from "./components/GlideSelect";
import { GlareHover } from "./components/GlareHover";
import { useAudioPlayer } from "./player/useAudioPlayer";
import { assetUrl, importNativePaths, loadNativeLibrary, pickNativeAudioFiles, pickNativeFolder, scanNativeFolder, type NativeTrack } from "./services/native-library";

type Track = { id: string; path?: string; artwork?: string; title: string; artist: string; album: string; url: string; duration?: number; favorite: boolean };
type View = "home" | "songs" | "albums" | "artists" | "playlists" | "favorites" | "recent" | "settings";

const accepted = ["audio/mpeg", "audio/flac", "audio/wav", "audio/ogg", "audio/opus", "audio/mp4", "audio/aac"];
const nav: { id: View; label: string; icon: typeof Grid2X2 }[] = [
  { id: "home", label: "Home", icon: Grid2X2 }, { id: "songs", label: "Songs", icon: Music2 },
  { id: "albums", label: "Albums", icon: Album }, { id: "artists", label: "Artists", icon: Sparkles },
  { id: "playlists", label: "Playlists", icon: ListMusic }, { id: "favorites", label: "Favorites", icon: Heart },
  { id: "recent", label: "Recently played", icon: History },
];

function fileToTrack(file: File): Track {
  const title = file.name.replace(/\.[^/.]+$/, "").replace(/[._-]/g, " ");
  return { id: crypto.randomUUID(), title, artist: "Unknown artist", album: "Unsorted", url: URL.createObjectURL(file), favorite: false };
}

function nativeToTrack(track: NativeTrack): Track {
  return { id: track.id, path: track.path, artwork: track.artworkPath ? assetUrl(track.artworkPath) : undefined, title: track.title, artist: track.artist, album: track.album, url: assetUrl(track.path), duration: track.duration, favorite: false };
}

export function App() {
  const [view, setView] = useState<View>("home");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [queue, setQueue] = useState<Track[]>([]);
  const [volume, setVolume] = useState(0.72);
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const player = useAudioPlayer({ onEnded: () => undefined, onTrackPlayed: (track) => setTracks((items) => items.map((item) => item.id === track.id ? { ...item } : item)) });
  const { audioRef: audio, current, playing, progress, duration, selectTrack, pause, resume, seek, onCanPlay, onTimeUpdate, onLoadedMetadata } = player;

  useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume]);
  useEffect(() => { loadNativeLibrary().then(appendNativeTracks).catch(() => undefined); }, []);
  useEffect(() => () => tracks.forEach((track) => URL.revokeObjectURL(track.url)), [tracks]);

  const filtered = useMemo(() => tracks.filter((track) =>
    `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(query.toLowerCase())), [tracks, query]);

  const importFiles = (files: FileList | File[]) => {
    const audioFiles = Array.from(files).filter((file) => file.type.startsWith("audio/") || accepted.includes(file.type));
    if (!audioFiles.length) { setScanMessage("Choose audio files to add them to your library."); return; }
    const newTracks = audioFiles.map(fileToTrack);
    setTracks((existing) => [...existing, ...newTracks]);
    setQueue((existing) => [...existing, ...newTracks]);
    setScanMessage(`${newTracks.length} ${newTracks.length === 1 ? "track" : "tracks"} added to your library.`);
    if (!current) selectTrack(newTracks[0], false);
  };
  const appendNativeTracks = (nativeTracks: NativeTrack[]) => {
    const newTracks = nativeTracks.map(nativeToTrack);
    setTracks((existing) => {
      const indexed = new Map(existing.map((track) => [track.path ?? track.id, track]));
      newTracks.forEach((track) => indexed.set(track.path ?? track.id, track));
      return [...indexed.values()];
    });
    setQueue((existing) => [...existing, ...newTracks.filter((track) => !existing.some((queued) => queued.id === track.id))]);
    if (!current && newTracks[0]) selectTrack(newTracks[0], false);
    setScanMessage(`${newTracks.length} ${newTracks.length === 1 ? "track" : "tracks"} imported with native metadata.`);
  };
  const importNativeFiles = async () => { try { const paths = await pickNativeAudioFiles(); if (paths.length) appendNativeTracks(await importNativePaths(paths)); } catch { setScanMessage("Flopsic could not import those files. Check that they are supported audio files."); } };
  const importNativeFolder = async () => { try { const folders = await pickNativeFolder(); if (folders[0]) appendNativeTracks(await scanNativeFolder(folders[0])); } catch { setScanMessage("Flopsic could not scan that folder."); } };
  const onFiles = (event: ChangeEvent<HTMLInputElement>) => { if (event.target.files) importFiles(event.target.files); event.target.value = ""; };
  const onDrop = (event: DragEvent) => { event.preventDefault(); setDragging(false); importFiles(event.dataTransfer.files); };
  const playTrack = (track: Track) => { setQueue((old) => old.some((item) => item.id === track.id) ? old : [...old, track]); selectTrack(track, true); };
  const next = () => { const list = queue.length ? queue : tracks; if (!list.length) return; const index = current ? list.findIndex((item) => item.id === current.id) : -1; playTrack(list[(index + 1) % list.length]); };
  const previous = () => { if (progress > 3 && audio.current) { audio.current.currentTime = 0; return; } const list = queue.length ? queue : tracks; const index = current ? list.findIndex((item) => item.id === current.id) : 0; playTrack(list[(index - 1 + list.length) % list.length]); };
  const toggleFavorite = (id: string) => setTracks((items) => items.map((item) => item.id === id ? { ...item, favorite: !item.favorite } : item));
  const visibleTracks = view === "favorites" ? filtered.filter((track) => track.favorite) : filtered;

  return <main className="app" onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Music2 size={18} /></span><span>Flopsic</span></div>
      <button className="import-button" onClick={importNativeFiles}><Plus size={17} /> Add music</button>
      <button className="folder-button" onClick={importNativeFolder}><FolderOpen size={16} /> Add folder</button>
      <input ref={fileInput} type="file" accept="audio/*,.flac,.opus,.m4a" multiple hidden onChange={onFiles} />
      <nav>{nav.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "nav-item active" : "nav-item"} onClick={() => setView(id)}><Icon size={18} /><span>{label}</span>{id === "favorites" && tracks.filter((x) => x.favorite).length > 0 && <b>{tracks.filter((x) => x.favorite).length}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><button className={view === "settings" ? "nav-item active" : "nav-item"} onClick={() => setView("settings")}><Settings2 size={18} /> Settings</button><p>Your listening stays local.</p></div>
    </aside>
    <section className="content">
      <header className="topbar"><div className="history-buttons"><button aria-label="Back"><ChevronLeft size={18} /></button><button aria-label="Forward"><ChevronRight size={18} /></button></div><label className="search"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your library" /></label><button className="queue-trigger" onClick={() => setQueueOpen(!queueOpen)}><ListMusic size={18} /> Queue {queue.length ? <span>{queue.length}</span> : null}</button></header>
      {scanMessage && <div className="toast"><span>{scanMessage}</span><button onClick={() => setScanMessage(null)} aria-label="Dismiss"><X size={15} /></button></div>}
      {view === "home" ? <Home tracks={tracks} onImport={importNativeFiles} onPlay={playTrack} /> : view === "settings" ? <Settings /> : <Library view={view} tracks={visibleTracks} query={query} onPlay={playTrack} onFavorite={toggleFavorite} />}
    </section>
    {queueOpen && <aside className="queue-panel"><div className="panel-heading"><h2>Up next</h2><button onClick={() => setQueueOpen(false)} aria-label="Close queue"><X size={18} /></button></div>{queue.length ? queue.map((track, i) => <button className="queue-row" key={track.id} onClick={() => playTrack(track)}><span>{i + 1}</span><div className="mini-cover">{track.title.slice(0, 1)}</div><div><strong>{track.title}</strong><small>{track.artist}</small></div><MoreHorizontal size={17} /></button>) : <div className="empty-compact">Your queue is empty.</div>}</aside>}
    {dragging && <div className="drop-zone"><div><FolderOpen size={30} /><h2>Drop music to add it</h2><p>Files stay in their original folder.</p></div></div>}
    <Player current={current as Track | null} playing={playing} progress={progress} duration={duration} volume={volume} onToggle={() => playing ? pause() : resume()} onNext={next} onPrevious={previous} onSeek={seek} onVolume={setVolume} onFavorite={() => current && toggleFavorite(current.id)} favorite={Boolean(current && tracks.find((track) => track.id === current.id)?.favorite)} />
    <audio ref={audio} src={current?.url} onCanPlay={onCanPlay} onPlay={() => player.setPlaying(true)} onPause={() => player.setPlaying(false)} onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata} onEnded={next} />
  </main>;
}

function Home({ tracks, onImport, onPlay }: { tracks: Track[]; onImport: () => void; onPlay: (t: Track) => void }) {
  if (!tracks.length) return <div className="welcome"><div className="welcome-art"><div className="disc disc-one" /><div className="disc disc-two" /><div className="album-placeholder"><Music2 size={56} /></div></div><div className="welcome-copy"><p className="eyebrow">WELCOME TO FLOPSIC</p><h1>Bring your library<br />to life.</h1><p>Flopsic plays the files you already own. No account, no streaming catalog, no data leaving your computer.</p><div><button className="primary" onClick={onImport}><FolderOpen size={18} /> Choose music files</button><span className="hint">or drop them anywhere</span></div></div><div className="setup-note"><LoaderCircle size={16} /><span>Ready when you are. Your files are never copied.</span></div></div>;
  return <div className="home-page"><div className="page-title"><p className="eyebrow">YOUR LIBRARY</p><h1>Good afternoon.</h1><p>{tracks.length} {tracks.length === 1 ? "track" : "tracks"} ready to play.</p></div><section className="spotlight"><div className="spotlight-art"><Music2 size={52} /></div><div><p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p><h2>Your music, right here.</h2><p>Select a track below or add more music to build your listening library.</p><button className="secondary" onClick={onImport}><Plus size={17} /> Add files</button></div></section><section className="recent"><div className="section-title"><h2>Recently added</h2><button onClick={() => onPlay(tracks[0])}>Play all <Play size={14} fill="currentColor" /></button></div><TrackTable tracks={tracks.slice(-6).reverse()} onPlay={onPlay} onFavorite={() => undefined} /></section></div>;
}

function Library({ view, tracks, query, onPlay, onFavorite }: { view: View; tracks: Track[]; query: string; onPlay: (t: Track) => void; onFavorite: (id: string) => void }) {
  const labels: Partial<Record<View, string>> = { songs: "Songs", albums: "Albums", artists: "Artists", playlists: "Playlists", favorites: "Favorites", recent: "Recently played" };
  if (view === "albums" || view === "artists" || view === "playlists") return <div className="library-page"><div className="page-title"><h1>{labels[view]}</h1><p>{view === "playlists" ? "Create playlists from the music you import." : "Your library will organize itself as you add music."}</p></div><div className="empty-state"><div className="empty-icon">{view === "albums" ? <Album /> : view === "artists" ? <Sparkles /> : <ListMusic />}</div><h2>Nothing to show yet</h2><p>Add some music and this view will fill in automatically.</p></div></div>;
  return <div className="library-page"><div className="page-title row-title"><div><p className="eyebrow">{query ? "SEARCH RESULTS" : "LIBRARY"}</p><h1>{labels[view]}</h1></div><button className="icon-button"><SlidersHorizontal size={18} /> Filter</button></div>{tracks.length ? <TrackTable tracks={tracks} onPlay={onPlay} onFavorite={onFavorite} /> : <div className="empty-state"><div className="empty-icon"><Music2 /></div><h2>{query ? "No matching tracks" : "No tracks here yet"}</h2><p>{query ? "Try a different search term." : "Add music from the sidebar to begin."}</p></div>}</div>;
}

function TrackTable({ tracks, onPlay, onFavorite }: { tracks: Track[]; onPlay: (t: Track) => void; onFavorite: (id: string) => void }) { return <div className="track-table"><div className="track-header"><span>#</span><span>Title</span><span>Album</span><span>Time</span><span /></div>{tracks.map((track, index) => <div className="track-row" key={track.id} onDoubleClick={() => onPlay(track)}><span className="index">{index + 1}</span><button className="track-play" onClick={() => onPlay(track)} aria-label={`Play ${track.title}`}><Play size={14} fill="currentColor" /></button><div className="track-title"><GlareHover className="tiny-cover" style={{ width: 34, height: 34 }}>{track.artwork ? <img src={track.artwork} alt="" /> : track.title.slice(0, 1)}</GlareHover><div><strong>{track.title}</strong><small>{track.artist}</small></div></div><span className="album-name">{track.album}</span><span className="time">{track.duration ? formatTime(track.duration) : "-:--"}</span><button className={track.favorite ? "favorite on" : "favorite"} onClick={() => onFavorite(track.id)} aria-label="Favorite"><Heart size={17} fill={track.favorite ? "currentColor" : "none"} /></button></div>)}</div> }

function Player(props: { current: Track | null; playing: boolean; progress: number; duration: number; volume: number; favorite: boolean; onToggle: () => void; onNext: () => void; onPrevious: () => void; onSeek: (v: number) => void; onVolume: (v: number) => void; onFavorite: () => void }) { const { current, playing, progress, duration } = props; return <footer className="player"><div className="now"><div className="now-cover">{current ? current.title.slice(0, 1) : <Music2 size={20} />}</div><div><strong>{current?.title ?? "Nothing playing"}</strong><small>{current?.artist ?? "Add music to get started"}</small></div><button className={props.favorite ? "favorite on" : "favorite"} disabled={!current} onClick={props.onFavorite}><Heart size={17} fill={props.favorite ? "currentColor" : "none"} /></button></div><div className="transport"><div className="controls"><button aria-label="Shuffle"><Shuffle size={16} /></button><button aria-label="Previous" onClick={props.onPrevious}><SkipBack size={18} fill="currentColor" /></button><button className="play-button" onClick={props.onToggle} aria-label={playing ? "Pause" : "Play"} disabled={!current}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><button aria-label="Next" onClick={props.onNext}><SkipForward size={18} fill="currentColor" /></button><button aria-label="Repeat"><Repeat2 size={16} /></button></div><div className="timeline"><span>{formatTime(progress)}</span><input aria-label="Seek" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(progress, duration || 0)} onChange={(e) => props.onSeek(Number(e.target.value))} disabled={!current} /><span>{duration ? `-${formatTime(Math.max(duration - progress, 0))}` : "-:--"}</span></div></div><div className="volume"><Volume2 size={18} /><input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={props.volume} onChange={(e) => props.onVolume(Number(e.target.value))} /></div></footer> }
function Settings() { const [theme, setTheme] = useState("dark"); return <div className="library-page settings-page"><div className="page-title"><p className="eyebrow">PREFERENCES</p><h1>Settings</h1><p>Choose how Flopsic looks and behaves on this computer.</p></div><div className="settings-grid"><section><h2>Interface</h2><label>Theme <GlideSelect ariaLabel="Theme" value={theme} onChange={setTheme} options={[{ value: "dark", label: "Dark", tag: "Default" }, { value: "system", label: "System" }, { value: "light", label: "Light" }]} /></label><label>Accent color <input type="color" defaultValue="#80aaff" /></label></section><section><h2>Playback</h2><label className="toggle-row">Gapless playback <input type="checkbox" defaultChecked /></label><label className="toggle-row">Restore queue on launch <input type="checkbox" defaultChecked /></label><label className="toggle-row">Loudness normalization <input type="checkbox" /></label></section></div></div> }
function formatTime(value: number) { if (!Number.isFinite(value)) return "-:--"; const minutes = Math.floor(value / 60); const seconds = Math.floor(value % 60).toString().padStart(2, "0"); return `${minutes}:${seconds}`; }
