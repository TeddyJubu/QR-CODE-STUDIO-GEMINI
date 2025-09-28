import React, { useEffect, useRef } from 'react';
import { QRCodeConfig } from '../types';

interface QRCodePreviewProps {
  config: QRCodeConfig;
  qrRef: React.MutableRefObject<any | null>;
}

const QRCodePreview: React.FC<QRCodePreviewProps> = ({ config, qrRef }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { data, fgColor, bgColor, dotType, cornerSquareType, cornerDotType, image, errorCorrectionLevel } = config;

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
          color: fgColor,
          type: dotType,
        },
        backgroundOptions: {
          color: bgColor,
        },
        cornersSquareOptions: {
          color: fgColor,
          type: cornerSquareType,
        },
        cornersDotOptions: {
            color: fgColor,
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
          color: fgColor,
          type: dotType,
        },
        backgroundOptions: { color: bgColor },
        cornersSquareOptions: {
          color: fgColor,
          type: cornerSquareType,
        },
        cornersDotOptions: {
            color: fgColor,
            type: cornerDotType,
        }
      });
    }
  }, [data, fgColor, bgColor, dotType, cornerSquareType, cornerDotType, image, qrRef, errorCorrectionLevel]);

  return <div ref={ref} className="transition-all duration-300 ease-in-out" />;
};

export default QRCodePreview;