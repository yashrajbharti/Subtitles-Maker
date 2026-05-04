const worker = new Worker("./worker.js", { type: "module" });

const uploadArea = document.getElementById("uploadArea");
const mediaInput = document.getElementById("mediaInput");
const progressArea = document.getElementById("progressArea");
const resultArea = document.getElementById("resultArea");
const statusText = document.getElementById("statusText");
const progressFill = document.getElementById("progressFill");
const outputJson = document.getElementById("outputJson");
const downloadBtn = document.getElementById("downloadBtn");
const dismissSnackbarBtn = document.getElementById("dismissSnackbarBtn");

let isBusy = false;
let currentChunks = [];
let mediaFileName = "transcript";
let lastProgressTime = 0;



mediaInput.addEventListener("change", (e) => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (isBusy) return;
    isBusy = true;
    
    mediaFileName = file.name.split('.')[0] || "transcript";
    
    progressArea.classList.remove("hidden");
    statusText.textContent = "Extracting audio...";
    
    const fileReader = new FileReader();
    fileReader.onload = () => {
        statusText.textContent = "Decoding audio...";
        decodeAudio(fileReader.result);
    };
    fileReader.readAsArrayBuffer(file);
}

const decodeAudio = (arrayBuffer) => {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    
    audioContext.decodeAudioData(
        arrayBuffer,
        (audioData) => {
            let audio;
            if (audioData.numberOfChannels === 2) {
                const SCALING_FACTOR = Math.sqrt(2);
                let left = audioData.getChannelData(0);
                let right = audioData.getChannelData(1);
                audio = new Float32Array(left.length);
                for (let i = 0; i < audioData.length; ++i) {
                    audio[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2;
                }
            } else {
                audio = audioData.getChannelData(0);
            }
            
            statusText.textContent = "Initializing AI Model...";
            
            worker.postMessage({
                audio,
                model: "Xenova/whisper-tiny",
                multilingual: false,
                quantized: false,
                subtask: null,
                language: null,
            });
        },
        (error) => {
            alert("Error decoding audio: " + error.message);
            resetUI();
        }
    );
};

worker.onmessage = (event) => {
    const message = event.data;
    
    if (['initiate', 'download', 'progress', 'done', 'ready'].includes(message.status)) {
        if (message.status === 'progress' && message.progress !== undefined) {
            const now = Date.now();
            if (now - lastProgressTime > 150 || message.progress === 100) {
                lastProgressTime = now;
                progressFill.indeterminate = false;
                progressFill.value = message.progress / 100;
                const pct = Math.round(message.progress).toString().padStart(3, ' ');
                statusText.textContent = `Downloading Model: ${pct}%`;
            }
        } else if (message.status === 'ready') {
            statusText.textContent = "Transcribing audio... (please wait)";
            progressFill.indeterminate = true;
        }
        return;
    }

    if (message.status === "update") {
        statusText.textContent = "Transcribing audio... (processing chunks)";
        let chunksArray = message.data[1]?.chunks || message.data.chunks || message.data[0]?.chunks;
        if(chunksArray) {
            currentChunks = chunksArray;
            updateOutput(currentChunks);
        }
    } else if (message.status === "complete") {
        currentChunks = message.data.chunks || currentChunks;
        updateOutput(currentChunks);
        finishTranscription();
    } else if (message.status === "error") {
        alert("Transcription Error: " + message.data.message || message.data);
        resetUI();
    }
};

function formatTime(seconds) {
    if (!seconds) seconds = 0;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds - Math.floor(seconds)) * 1000);

    return `${String(hrs).padStart(2, '0')}:` +
        `${String(mins).padStart(2, '0')}:` +
        `${String(secs).padStart(2, '0')},` +
        `${String(millis).padStart(3, '0')}`;
}

function updateOutput(chunks) {
    if(!chunks) return;
    console.log("Extracted Chunks:", chunks);
    
    let srt = "";
    let index = 1;

    chunks.forEach(c => {
        if (!c.timestamp) return;
        const [start, end] = c.timestamp;
        const text = c.text ? c.text.trim() : "";

        if (!text) return;

        srt += `${index}\n`;
        srt += `${formatTime(start)} --> ${formatTime(end)}\n`;
        srt += `${text}\n\n`;
        index++;
    });

    outputJson.value = srt;
    outputJson.scrollTop = outputJson.scrollHeight; // Auto-scroll to bottom
}

function finishTranscription() {
    isBusy = false;
    progressArea.classList.add("hidden");
}

function resetUI() {
    isBusy = false;
    currentChunks = [];
    lastProgressTime = 0;
    outputJson.value = "";
    progressArea.classList.add("hidden");
    mediaInput.value = "";
    progressFill.value = 0;
    progressFill.indeterminate = false;
}

downloadBtn.addEventListener("click", () => {
    if (!outputJson.value) return;
    
    const blob = new Blob([outputJson.value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mediaFileName}.srt`;
    a.click();
    URL.revokeObjectURL(url);
});

if (dismissSnackbarBtn) {
    dismissSnackbarBtn.addEventListener("click", () => {
        progressArea.classList.add("hidden");
    });
}

// ==========================================
// UI & TAB LOGIC
// ==========================================
const tabs = document.querySelector('md-tabs');
const panels = document.querySelectorAll('.tab-panel');

if (tabs) {
    tabs.addEventListener('change', () => {
        panels.forEach((panel, i) => {
            if (i === tabs.activeTabIndex) {
                panel.removeAttribute('hidden');
            } else {
                panel.setAttribute('hidden', '');
            }
        });
    });
}

// ==========================================
// JSON TO SRT CONVERTER (TAB 2)
// ==========================================
let srtContent = "";
const fileInput = document.getElementById("fileInput");
const outputTextarea = document.getElementById("output");
const downloadSrtBtn = document.getElementById("downloadSrtBtn");

if (fileInput) {
    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) {
            alert("Please upload a JSON file first.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const data = JSON.parse(event.target.result);
                let srt = "";
                let index = 1;

                data.forEach(entry => {
                    const [start, end] = entry.timestamp;
                    const text = entry.text.trim();

                    if (!text) return;

                    srt += `${index}\n`;
                    srt += `${formatTime(start)} --> ${formatTime(end)}\n`;
                    srt += `${text}\n\n`;

                    index++;
                });

                srtContent = srt;
                outputTextarea.value = srt;
            } catch (err) {
                alert("Invalid JSON format.");
                console.error(err);
            }
        };
        reader.readAsText(file);
    });
}

if (downloadSrtBtn) {
    downloadSrtBtn.addEventListener("click", () => {
        if (!srtContent) {
            alert("No SRT to download.");
            return;
        }

        const blob = new Blob([srtContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "subtitle.srt";
        a.click();
        URL.revokeObjectURL(url);
    });
}
