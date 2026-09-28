import type { LyricLine, LyricsResult } from "../domain";

function parseTimestamp(raw: string) {
  const [minutes, seconds] = raw.split(":");
  return Number(minutes) * 60 + Number(seconds);
}

/** Parses local LRC data. It deliberately never estimates word timestamps. */
export function parseLrc(source: string): LyricsResult {
  const lines: LyricLine[] = source.split(/\r?\n/).flatMap((raw) => {
    const stamps = [...raw.matchAll(/\[(\d{1,3}:\d{2}(?:\.\d{1,3})?)\]/g)];
    const text = raw.replace(/\[.*?\]/g, "").trim();
    return !text ? [] : stamps.map((stamp) => ({
      start: parseTimestamp(stamp[1]), end: Number.POSITIVE_INFINITY,
      words: [{ text, start: parseTimestamp(stamp[1]), end: Number.POSITIVE_INFINITY }],
    }));
  }).sort((a, b) => a.start - b.start);
  lines.forEach((line, index) => { line.end = lines[index + 1]?.start ?? Number.POSITIVE_INFINITY; line.words[0].end = line.end; });
  return { source: "local", synchronized: lines.length ? "line" : "none", lines, text: source };
}

export function getActiveLine(lines: LyricLine[], currentTime: number) {
  return lines.findIndex((line) => currentTime >= line.start && currentTime < line.end);
}
