import type { Options as QRCodeStylingOptions } from 'qr-code-styling';

// Declare the QRCodeStyling library loaded from CDN
declare global {
    var QRCodeStyling: new (options?: QRCodeStylingOptions) => any;
    function jsQR(data: Uint8ClampedArray, width: number, height: number, options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'both'; }): {
        data: string;
        location: {
            topLeftCorner: { x: number, y: number },
            topRightCorner: { x: number, y: number },
            bottomLeftCorner: { x: number, y: number },
            bottomRightCorner: { x: number, y: number },
            topLeftFinderPattern: { x: number, y: number },
            topRightFinderPattern: { x: number, y: number },
            bottomLeftFinderPattern: { x: number, y: number },
        }
    } | null;
}

export type DotType = 'square' | 'dots' | 'rounded' | 'extra-rounded' | 'classy' | 'classy-rounded';
export type CornerSquareType = 'square' | 'dot' | 'extra-rounded';
export type CornerDotType = 'square' | 'dot';

export type ContentType = 'url' | 'text' | 'wifi' | 'vcard' | 'email';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

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
  errorCorrectionLevel: ErrorCorrectionLevel;
  image?: string;
}