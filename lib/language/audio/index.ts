/**
 * Language audio — public surface.
 *
 *   UI → LanguageAudioController → [ NeuralAudioProvider, AudioCache, WebSpeech ]
 *
 * Nothing outside this folder should import the providers directly.
 */

export * from "@/lib/language/audio/types";
export {
  getLanguageAudioController,
  LanguageAudioController,
  type SpeakHandle,
  type ActiveVoiceInfo,
} from "@/lib/language/audio/controller";
export {
  configureNeuralAudio,
  isNeuralAudioConfigured,
  type NeuralAudioConfig,
} from "@/lib/language/audio/providers";
export { warmUpVoices, selectBestBrowserVoice } from "@/lib/language/audio/browser-voice";
export { getAudioCache, audioCacheKey, AudioCache } from "@/lib/language/audio/cache";
export {
  getAudioPreference,
  setAudioPreference,
  setAudioVoice,
  setAudioRate,
  useAudioPreference,
} from "@/lib/language/audio/settings";
