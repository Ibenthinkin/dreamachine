/**
 * Disclaimer copy shared by the consent gate and the persistent footer
 * (SPEC §3.1, §8 — the warning stays visible during use, not just at the gate).
 */

export const DISCLAIMER_POINTS = [
  "You must be 18 or older to use this site.",
  "Do not use if you — or anyone in your family — have epilepsy, a history of seizures, or photosensitivity. Flashing light can trigger seizures in susceptible individuals. Stop immediately if you feel unwell.",
  "This is not a medical device. It makes no therapeutic claims and is for personal, recreational use only.",
] as const;

export const DISCLAIMER_FOOTER =
  "18+ only. Not for anyone with epilepsy, a history of seizures, or photosensitivity. Not a medical device — recreational use only.";
