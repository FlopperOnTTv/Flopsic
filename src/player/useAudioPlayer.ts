import { useCallback, useEffect, useRef, useState } from "react";
type PlayableTrack = { id: string; url: string };
type Options = { onEnded: () => void; onTrackPlayed: (track: PlayableTrack) => void };

/**
 * Owns source transitions. A monotonically increasing token prevents late media
 * events from an old track changing the active track after rapid A -> B -> C picks.
 */
export function useAudioPlayer({ onEnded, onTrackPlayed }: Options) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const requestedId = useRef<string | null>(null);
  const generation = useRef(0);
  const [current, setCurrent] = useState<PlayableTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const selectTrack = useCallback((track: PlayableTrack, autoplay = true) => {
    generation.current += 1;
    requestedId.current = track.id;
    setProgress(0); setDuration(0); setCurrent(track); setPlaying(autoplay);
  }, []);

  const pause = useCallback(() => { audioRef.current?.pause(); setPlaying(false); }, []);
  const resume = useCallback(async () => {
    const audio = audioRef.current; if (!audio || !current) return;
    try { await audio.play(); setPlaying(true); } catch { setPlaying(false); }
  }, [current]);

  const onCanPlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !current || requestedId.current !== current.id || !playing) return;
    const token = generation.current;
    try {
      await audio.play();
      if (token === generation.current && requestedId.current === current.id) { setPlaying(true); onTrackPlayed(current); }
    } catch { if (token === generation.current) setPlaying(false); }
  }, [current, onTrackPlayed, playing]);

  const onTimeUpdate = useCallback(() => { if (audioRef.current) setProgress(audioRef.current.currentTime); }, []);
  const onLoadedMetadata = useCallback(() => { if (audioRef.current) setDuration(audioRef.current.duration); }, []);
  const seek = useCallback((value: number) => { if (audioRef.current) audioRef.current.currentTime = value; setProgress(value); }, []);

  useEffect(() => () => { audioRef.current?.pause(); }, []);
  return { audioRef, current, playing, progress, duration, selectTrack, pause, resume, seek, onCanPlay, onTimeUpdate, onLoadedMetadata, setPlaying };
}
