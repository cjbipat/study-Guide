/** Mandarin tone reference — visual contour paths are on a 100×44 viewBox. */
export const TONES = [
  { n: 1, name: "First Tone", desc: "High and level", mark: "ˉ", example: "mā", contour: "M8,12 L92,12" },
  { n: 2, name: "Second Tone", desc: "Rising", mark: "ˊ", example: "má", contour: "M8,36 L92,6" },
  { n: 3, name: "Third Tone", desc: "Falling–rising", mark: "ˇ", example: "mǎ", contour: "M8,10 Q50,44 92,16" },
  { n: 4, name: "Fourth Tone", desc: "Falling", mark: "ˋ", example: "mà", contour: "M8,6 L92,38" },
  { n: 5, name: "Neutral Tone", desc: "Light and short", mark: "·", example: "ma", contour: "M38,22 L62,22" },
] as const;

export type ToneNumber = 1 | 2 | 3 | 4 | 5;
