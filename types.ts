import type { Options as QRCodeStylingOptions } from 'qr-code-styling';

// Declare the QRCodeStyling library loaded from CDN
declare global {
    var QRCodeStyling: new (options?: QRCodeStylingOptions) => any;
}

export type DotType = 'square' | 'dots' | 'rounded' | 'extra-rounded' | 'classy' | 'classy-rounded';
export type CornerSquareType = 'square' | 'dot' | 'extra-rounded';
export type CornerDotType = 'square' | 'dot';

export type ContentType = 'url' | 'text' | 'wifi' | 'vcard' | 'email';

export interface QRCodeConfig {
  id: string;
  data: string;
  name: string;
  contentType: ContentType;
  isDynamic: boolean;
  fgColor: string;
  bgColor: string;
  dotType: DotType;
  cornerSquareType: CornerSquareType;
  cornerDotType: CornerDotType;
}
