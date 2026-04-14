import type { DitherAlgorithm, QrErrorCorrection } from '@/types';

export const SAMPLE_ART_URL =
  'https://cards.scryfall.io/art_crop/front/a/b/ab1ef852-b050-4a36-8c28-f23b7ac8bc38.jpg';

export const DITHER_OPTIONS: Array<{ label: string; value: DitherAlgorithm }> = [
  { label: 'Floyd-Steinberg', value: 'floyd' },
  { label: 'Bayer', value: 'bayer' },
  { label: 'Threshold', value: 'threshold' },
  { label: 'None', value: 'none' },
];

export const QR_EC_OPTIONS: Array<{ label: string; value: QrErrorCorrection }> = [
  { label: 'Low (L)', value: 'L' },
  { label: 'Medium (M)', value: 'M' },
  { label: 'Quartile (Q)', value: 'Q' },
  { label: 'High (H)', value: 'H' },
];
