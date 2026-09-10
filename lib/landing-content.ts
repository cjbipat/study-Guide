/**
 * Static copy for the marketing homepage only. Not user data, not app state —
 * just facts about what the product does.
 */

export const LANDING_STATS: {
  value: number;
  suffix: string;
  label: string;
  decimals?: number;
}[] = [
  { value: 2, suffix: " min", label: "To your first study session" },
  { value: 5, suffix: "", label: "Quiz question formats" },
  { value: 100, suffix: "%", label: "Private — stored on your device" },
  { value: 0, suffix: "", label: "Ads or trackers, ever" },
];
