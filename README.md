# Subtitles Maker 🎬

A completely free, privacy-first, in-browser AI tool to extract transcripts and generate high-quality SRT subtitles from any audio or video file.

## ✨ Features

- **100% In-Browser AI**: Uses `Xenova/whisper-tiny` via Transformers.js. No audio files are ever uploaded to a server, ensuring complete data privacy and no API costs.
- **Auto-Conversion**: Upload media, watch the AI transcribe in real-time, and instantly download a standard `.srt` subtitle file.
- **Live SRT Streaming**: A built-in terminal-style output visualizes exactly what the AI is producing in standard SRT format block by block.
- **JSON to SRT Converter**: Already have a Whisper-generated JSON file? Use the second tab to instantly batch-convert it to standard SRT format.
- **Premium UI**: Built with Google's Material Design 3 Web Components, featuring a highly readable "Shadcn-style" pure dark mode and `JetBrains Mono` typography.
- **Responsive & Dynamic**: Full-width containers, smooth micro-animations, and a dismissable floating progress snackbar ensure an uninterrupted user experience.

## 🚀 Usage

Since the application leverages WASM and Web Workers for the AI inference engine, you should run it via a local web server to prevent CORS issues with local file fetching.

1. Clone the repository.
2. Serve the directory using any standard HTTP server. For example:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Or using Node (if you have serve or live-server installed)
   npx serve .
   ```
3. Open `http://localhost:8000` in your web browser.

## 🛠️ Architecture

- **`index.html`**: The unified, purely structural entry point holding the Material Design tabs.
- **`style.css`**: Contains all design system variables, layout definitions, and keyframe animations.
- **`script.js`**: Handles UI interactions, DOM manipulation, file reading, formatting, and downloads.
- **`worker.js`**: A dedicated Web Worker that loads the Transformers.js pipeline and runs the intensive Whisper ASR model on a background thread without freezing the UI.

## 📦 Dependencies

- [Material Web Components](https://github.com/material-components/material-web) (Bundled locally in `/dist`)
- [Transformers.js](https://github.com/xenova/transformers.js) (Loaded via CDN in the Web Worker)
- [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) (Loaded via Google Fonts)

## 📝 License

MIT
