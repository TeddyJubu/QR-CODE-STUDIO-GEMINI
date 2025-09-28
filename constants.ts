import { QRCodeConfig, DotType, CornerSquareType, CornerDotType, ErrorCorrectionLevel } from './types';

export const DEFAULT_QR_CODE_CONFIG: Omit<QRCodeConfig, 'id' | 'name'> = {
  data: 'https://example.com',
  isDynamic: false,
  contentType: 'url',
  fgColor: '#FFFFFF',
  bgColor: 'transparent',
  dotType: 'rounded',
  cornerSquareType: 'square',
  cornerDotType: 'square',
  errorCorrectionLevel: 'M',
};

export const DOT_STYLES: { value: DotType; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'dots', label: 'Dots' },
  { value: 'classy', label: 'Classy' },
  { value: 'classy-rounded', label: 'Classy R.' },
  { value: 'extra-rounded', label: 'Extra R.' },
];

export const CORNER_SQUARE_STYLES: { value: CornerSquareType; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'dot', label: 'Dot' },
  { value: 'extra-rounded', label: 'Rounded' },
];

export const CORNER_DOT_STYLES: { value: CornerDotType; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'dot', label: 'Dot' },
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