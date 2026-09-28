# 🎵 Flopsic

**Flopsic is a free, ad-free, open-source music player for Windows.** It keeps your music local: point it at the songs already on your computer and listen without subscriptions, tracking, or ads.

![Windows](https://img.shields.io/badge/platform-Windows-0078D4?logo=windows&logoColor=white)
![Tauri](https://img.shields.io/badge/desktop-Tauri%202-24C8DB?logo=tauri&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

- 🎧 Plays local audio from your computer
- 📂 Imports individual songs or recursively scans a music folder
- 🏷️ Reads embedded metadata: title, artist, album, duration, codec, bitrate, sample rate, and channels
- 🖼️ Extracts and displays embedded album artwork
- 💾 Stores the imported library in a local SQLite database—your music files are never copied or uploaded
- 🔎 Search and library filtering
- ❤️ Favorites, queue controls, previous/next, seeking, and volume controls
- 🌌 Midnight-blue Windows-style interface
- 📴 No ads, accounts, subscriptions, or cloud requirement

## 🚀 Download and install

Go to the repository’s **Releases** page and download `Flopsic_0.1.0_x64-setup.exe`.

Run the setup program, then open **Flopsic** from the Start menu. Choose **Add music** or **Add folder** to build your library. Supported formats: MP3, FLAC, WAV, OGG, OPUS, M4A, and AAC.

## 🛡️ Privacy

Flopsic is local-first. It reads audio files you choose, stores the library index locally, and plays files from their original locations. It does not bundle advertising, analytics, sign-in, or a hosted music catalog.

## 🧰 Build from source

### Prerequisites

- Windows 10/11
- Node.js 20 or newer
- Rust stable toolchain
- Microsoft C++ Build Tools (needed by Tauri on Windows)

### Development

```powershell
npm install --cache .npm-cache
npm run desktop:dev
```

### Create the Windows installer

```powershell
npm run desktop:build
```

The installer is written to `src-tauri/target/release/bundle/nsis/Flopsic_0.1.0_x64-setup.exe`. The standalone executable is `src-tauri/target/release/flopsic.exe`.

## ✅ Verification performed

The release build has passed the TypeScript/Vite build and Rust check. A real local MP3 fixture was used to verify title, artist, album, and embedded-artwork extraction, and the packaged `flopsic.exe` launched successfully as a responsive Windows application.

## 🤝 Contributing

Issues and pull requests are welcome. Please keep changes focused, run `npm run build` and `cargo check` from `src-tauri`, and explain how you tested your change.

## 📄 License

Flopsic is released under the [MIT License](LICENSE).
