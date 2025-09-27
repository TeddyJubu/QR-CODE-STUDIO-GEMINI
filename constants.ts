import { QRCodeConfig, DotType, CornerSquareType, CornerDotType } from './types';

export const DEFAULT_QR_CODE_CONFIG: Omit<QRCodeConfig, 'id' | 'name'> = {
  data: 'https://example.com',
  isDynamic: false,
  contentType: 'url',
  fgColor: '#6366f1',
  bgColor: '#ffffff',
  dotType: 'square',
  cornerSquareType: 'square',
  cornerDotType: 'square',
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
