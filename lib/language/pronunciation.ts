/**
 * PronunciationEvaluator — the seam for speech scoring.
 *
 * No evaluator is connected. The default implementation is honest about that:
 * it returns `available: false` with a "coming soon" message. It NEVER invents a
 * score. Users can still listen, record, and replay — that's handled in the UI,
 * not here.
 *
 * A future implementation (speech recognition + tone / phoneme scoring) would
 * implement `PronunciationEvaluator` and be returned from `getPronunciationEvaluator()`.
 */

export interface PronunciationInput {
  languageId: string;
  speechLang: string;
  targetText: string;
  targetPronunciation?: string;
  audio: Blob;
}

export type PronunciationResult =
  | { available: false; message: string }
  | {
      available: true;
      score: number; // 0..100
      toneScore?: number;
      feedback: string[];
    };

export interface PronunciationEvaluator {
  readonly id: string;
  readonly available: boolean;
  evaluate(input: PronunciationInput): Promise<PronunciationResult>;
}

class UnavailablePronunciationEvaluator implements PronunciationEvaluator {
  readonly id = "unavailable";
  readonly available = false;

  async evaluate(): Promise<PronunciationResult> {
    return {
      available: false,
      message: "Pronunciation feedback is coming soon.",
    };
  }
}

let evaluator: PronunciationEvaluator | null = null;
export function getPronunciationEvaluator(): PronunciationEvaluator {
  if (!evaluator) evaluator = new UnavailablePronunciationEvaluator();
  return evaluator;
}
