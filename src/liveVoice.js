export function createLiveVoice({ onStatus, onText, onError }) {
  let ws, stream, audioContext, processor, source;
  let nextPlayTime = 0;
  let stopped = false;

  const floatTo16BitPCM = (input, inputRate) => {
    const ratio = inputRate / 16000;
    const length = Math.floor(input.length / ratio);
    const output = new Int16Array(length);

    for (let i = 0; i < length; i++) {
      const sample = input[Math.floor(i * ratio)];
      const value = Math.max(-1, Math.min(1, sample));
      output[i] = value < 0 ? value * 32768 : value * 32767;
    }

    return output;
  };

  const playAudio = (base64) => {
    const binary = atob(base64);
    const pcm = new Int16Array(binary.length / 2);

    for (let i = 0; i < pcm.length; i++) {
      const low = binary.charCodeAt(i * 2);
      const high = binary.charCodeAt(i * 2 + 1);
      let value = (high << 8) | low;
      if (value >= 32768) value -= 65536;
      pcm[i] = value;
    }

    const buffer = audioContext.createBuffer(1, pcm.length, 24000);
    const channel = buffer.getChannelData(0);

    for (let i = 0; i < pcm.length; i++) {
      channel[i] = pcm[i] / 32768;
    }

    const player = audioContext.createBufferSource();
    player.buffer = buffer;
    player.connect(audioContext.destination);

    const startAt = Math.max(audioContext.currentTime, nextPlayTime);
    player.start(startAt);
    nextPlayTime = startAt + buffer.duration;
  };

  const start = async () => {
    try {
      stopped = false;
      onStatus?.("Connecting...");

      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      audioContext = new AudioContext();
      await audioContext.resume();

      ws = new WebSocket("wss://cutie-ai-3-0.onrender.com/live");

      ws.onopen = () => {
        onStatus?.("Connected · কথা বলো Boss 💜");
        source = audioContext.createMediaStreamSource(stream);
        processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (event) => {
          if (stopped || ws.readyState !== WebSocket.OPEN) return;

          const input = event.inputBuffer.getChannelData(0);
          const pcm = floatTo16BitPCM(input, audioContext.sampleRate);
          const bytes = new Uint8Array(pcm.buffer);

          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }

          ws.send(JSON.stringify({
            type: "audio",
            data: btoa(binary)
          }));
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          onStatus?.("Live · Cutie শুনছে 💜");
        } else if (data.type === "audio") {
          playAudio(data.data);
        } else if (data.type === "text") {
          onText?.(data.text);
        } else if (data.type === "error") {
          onError?.(data.message);
        }
      };

      ws.onerror = () => onError?.("Live connection failed");
      ws.onclose = () => {
        if (!stopped) onStatus?.("Connection closed");
      };
    } catch (error) {
      onError?.(error.message);
      stop();
    }
  };

  const stop = () => {
    stopped = true;
    try { processor?.disconnect(); } catch {}
    try { source?.disconnect(); } catch {}
    try { stream?.getTracks().forEach(track => track.stop()); } catch {}
    try { ws?.close(); } catch {}
    try { audioContext?.close(); } catch {}
    onStatus?.("Live বন্ধ");
  };

  return { start, stop };
}
