import React, { useEffect, useRef } from 'react';
import { QRCodeConfig } from '../types';

interface QRCodePreviewProps {
  config: QRCodeConfig;
  qrRef: React.MutableRefObject<any | null>;
  theme?: 'light' | 'dark';
}

const QRCodePreview: React.FC<QRCodePreviewProps> = ({ config, qrRef, theme = 'dark' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { data, fgColor, bgColor, dotType, cornerSquareType, cornerDotType, image, errorCorrectionLevel } = config;

  // Ensure proper contrast based on theme
  const getThemeAwareColors = () => {
    // If background is transparent, use theme-appropriate colors
    if (bgColor === 'transparent') {
      if (theme === 'light') {
        return {
          resolvedFgColor: '#000000', // Black QR code in light mode
          resolvedBgColor: '#FFFFFF'  // White background in light mode
        };
      } else {
        return {
          resolvedFgColor: '#FFFFFF', // White QR code in dark mode
          resolvedBgColor: '#000000'  // Black background in dark mode
        };
      }
    }
    
    // For non-transparent backgrounds, use the configured colors
    return {
      resolvedFgColor: fgColor,
      resolvedBgColor: bgColor
    };
  };

  const { resolvedFgColor, resolvedBgColor } = getThemeAwareColors();

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = ''; // Clear previous QR code
      qrRef.current = new QRCodeStyling({
        width: 256,
        height: 256,
        type: 'svg',
        data: data,
        image: image,
        margin: 0,
        qrOptions: {
          errorCorrectionLevel: errorCorrectionLevel,
        },
        dotsOptions: {
          color: resolvedFgColor,
          type: dotType,
        },
        backgroundOptions: {
          color: resolvedBgColor,
        },
        cornersSquareOptions: {
          color: resolvedFgColor,
          type: cornerSquareType,
        },
        cornersDotOptions: {
            color: resolvedFgColor,
            type: cornerDotType
        },
        imageOptions: {
            hideBackgroundDots: true,
            imageSize: 0.4,
            margin: 4,
            crossOrigin: 'anonymous',
        }
      });
      qrRef.current.append(ref.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (qrRef.current) {
      qrRef.current.update({
        data: data,
        image: image,
        margin: 0,
        qrOptions: {
            errorCorrectionLevel: errorCorrectionLevel,
        },
        dotsOptions: {
          color: resolvedFgColor,
          type: dotType,
        },
        backgroundOptions: { color: resolvedBgColor },
        cornersSquareOptions: {
          color: resolvedFgColor,
          type: cornerSquareType,
        },
        cornersDotOptions: {
            color: resolvedFgColor,
            type: cornerDotType,
        }
      });
    }
  }, [data, fgColor, bgColor, dotType, cornerSquareType, cornerDotType, image, qrRef, errorCorrectionLevel, theme]);

  return <div ref={ref} className="transition-all duration-300 ease-in-out" />;
};

export default QRCodePreview;