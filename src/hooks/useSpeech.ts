import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelSpeech,
  findVoiceByName,
  getVoicesAsync,
  isSpeechSupported,
  pickDefaultVoice,
  speakText,
} from "@utils/speech";
import { cancelTtsApi, speakViaApi } from "@utils/ttsApi";

export type TtsEngine = "browser" | "api";

export interface BrowserSpeechSettings {
  voiceName: string;
  rate: number;
}

export interface ApiSpeechSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  voice: string;
  speed: number;
}

export interface SpeechDispatchSettings {
  engine: TtsEngine;
  browser: BrowserSpeechSettings;
  api: ApiSpeechSettings;
}

export function useSpeech() {
  const [supported] = useState(isSpeechSupported);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    getVoicesAsync()
      .then(list => {
        if (cancelled) return;
        voicesRef.current = list;
        setVoices(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [supported]);

  useEffect(() => {
    return () => {
      cancelSpeech();
      cancelTtsApi();
    };
  }, []);

  const stop = useCallback(() => {
    cancelSpeech();
    cancelTtsApi();
    setSpeakingKey(null);
  }, []);

  const speakMessage = useCallback(
    (key: string, text: string, settings: SpeechDispatchSettings) => {
      if (speakingKey === key) {
        stop();
        return;
      }
      setSpeechError(null);
      cancelSpeech();
      cancelTtsApi();

      if (settings.engine === "api") {
        setSpeakingKey(key);
        void speakViaApi(text, {
          ...settings.api,
          onStart: () => setSpeakingKey(key),
          onEnd: () => setSpeakingKey(prev => (prev === key ? null : prev)),
          onError: message => {
            setSpeakingKey(prev => (prev === key ? null : prev));
            setSpeechError(`语音播放失败：${message}`);
          },
        });
        return;
      }

      if (!supported) return;
      const voice =
        findVoiceByName(voicesRef.current, settings.browser.voiceName) ??
        pickDefaultVoice(voicesRef.current);
      speakText(text, {
        voice,
        rate: settings.browser.rate,
        onStart: () => setSpeakingKey(key),
        onEnd: () => setSpeakingKey(prev => (prev === key ? null : prev)),
        onError: () => setSpeakingKey(prev => (prev === key ? null : prev)),
      });
      setSpeakingKey(key);
    },
    [supported, speakingKey, stop]
  );

  return { supported, voices, speakingKey, speechError, speakMessage, stop };
}
