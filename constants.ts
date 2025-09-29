import { QRCodeConfig, DotType, CornerSquareType, CornerDotType, ErrorCorrectionLevel } from './types';

export const DEFAULT_QR_CODE_CONFIG: Omit<QRCodeConfig, 'id' | 'name'> = {
  data: 'https://example.com',
  rawUrl: 'https://example.com',
  isDynamic: false,
  contentType: 'url',
  fgColor: '#FFFFFF',
  bgColor: 'transparent',
  dotType: 'rounded',
  cornerSquareType: 'square',
  cornerDotType: 'square',
  errorCorrectionLevel: 'M',
};

export const DOT_STYLES: { value: DotType; label: string; description: string }[] = [
  { value: 'square', label: 'Classic Square', description: 'Crisp modules with sharp corners for maximum contrast.' },
  { value: 'rounded', label: 'Soft Rounded', description: 'Gentle edges that still scan well on print and screens.' },
  { value: 'dots', label: 'Micro Dots', description: 'Playful dot grid—great for modern, light-hearted designs.' },
  { value: 'classy', label: 'Classy', description: 'Geometric squares with a subtle inset for premium layouts.' },
  { value: 'classy-rounded', label: 'Classy Rounded', description: 'Rounded inset squares that balance elegance and readability.' },
  { value: 'extra-rounded', label: 'Bubble', description: 'Highly rounded modules for bold, organic brand systems.' },
];

export const CORNER_SQUARE_STYLES: { value: CornerSquareType; label: string; description: string }[] = [
  { value: 'square', label: 'Angular Eye', description: 'Traditional finder eye with crisp edges.' },
  { value: 'dot', label: 'Circular Eye', description: 'Fully rounded outer eye for a softer vibe.' },
  { value: 'extra-rounded', label: 'Pill Eye', description: 'Rounded corners without losing the square footprint.' },
];

export const CORNER_DOT_STYLES: { value: CornerDotType; label: string; description: string }[] = [
  { value: 'square', label: 'Solid Center', description: 'Square center for high-contrast targeting.' },
  { value: 'dot', label: 'Round Center', description: 'Circular center that complements rounded themes.' },
];

export const ERROR_CORRECTION_LEVELS: { value: ErrorCorrectionLevel; label: string; description: string }[] = [
  { value: 'L', label: 'Low', description: '~7% recovery' },
  { value: 'M', label: 'Medium', description: '~15% recovery' },
  { value: 'Q', label: 'Quartile', description: '~25% recovery' },
  { value: 'H', label: 'High', description: '~30% recovery' },
];

export const TEMPLATES: { name: string; config: Partial<Omit<QRCodeConfig, 'id' | 'name' | 'data'>> }[] = [
  {
    name: 'Minimal',
    config: {
      fgColor: '#000000',
      bgColor: '#FFFFFF',
      dotType: 'square',
      cornerSquareType: 'square',
      cornerDotType: 'square',
      image: undefined,
    },
  },
  {
    name: 'Modern',
    config: {
      fgColor: '#111827',
      bgColor: 'transparent',
      dotType: 'rounded',
      cornerSquareType: 'extra-rounded',
      cornerDotType: 'dot',
      image: undefined,
    },
  },
  {
    name: 'Playful',
    config: {
      fgColor: '#6366f1',
      bgColor: '#e0e7ff',
      dotType: 'dots',
      cornerSquareType: 'dot',
      cornerDotType: 'dot',
      image: undefined,
    },
  },
];
