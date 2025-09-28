

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeConfig, ContentType, DotType, CornerSquareType, CornerDotType, ErrorCorrectionLevel } from './types';
import { DEFAULT_QR_CODE_CONFIG, DOT_STYLES, CORNER_SQUARE_STYLES, CORNER_DOT_STYLES, TEMPLATES, ERROR_CORRECTION_LEVELS } from './constants';
import useLocalStorage from './hooks/useLocalStorage';
import QRCodePreview from './components/QRCodePreview';
import Library from './components/Library';
import { 
    DownloadIcon, SaveIcon, LogoIcon, LinkIcon, TextIcon, WifiIcon, 
    VCardIcon, EmailIcon, HistoryIcon, AccountIcon,
    ChevronUpIcon, ChevronDownIcon, InfoIcon, UploadIcon, RemoveIcon, MaterialIcon, CameraIcon
} from './components/icons';

const DEFAULT_TRANSPARENT_BG = '#0f172a';

type RGB = { r: number; g: number; b: number };
type ReadinessWarning = { id: string; message: string };
interface ReadinessMetrics {
  resolvedBg: string;
  contrastPercent: number;
  contrastRatio: number;
  meetsContrast: boolean;
  isInverted: boolean;
  sizeOk: boolean;
  recommendedPrintWidthIn: number;
  maxDistanceFt: number;
  recommendedPixelSize: number;
}

interface ReadinessResult {
  warnings: ReadinessWarning[];
  metrics: ReadinessMetrics;
}

type UtmParams = {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
};

type HeatPoint = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  scans: number;
  intensity: number;
};

type FunnelStep = {
  id: string;
  label: string;
  value: number;
  description: string;
};

interface AnalyticsData {
  period: string;
  totalScans: number;
  uniqueVisitors: number;
  retentionRate: number;
  topLocations: HeatPoint[];
  funnel: FunnelStep[];
  roi: {
    revenue: number;
    spend: number;
    roas: number;
    costPerAcquisition: number;
    costPerScan: number;
  };
  utmBreakdown: { id: string; label: string; scans: number; share: number }[];
}

const clampHex = (hex: string) => {
  if (hex.startsWith('#') && hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return hex;
};

const hexToRgb = (hex: string): RGB | null => {
  const normalized = clampHex(hex);
  const result = normalized.match(/^#([0-9a-fA-F]{6})$/);
  if (!result) return null;
  const value = result[1];
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r, g, b };
};

const channelToLinear = (channel: number) => {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
};

const relativeLuminance = (hexColor: string): number => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return 0;
  const { r, g, b } = rgb;
  const linearR = channelToLinear(r);
  const linearG = channelToLinear(g);
  const linearB = channelToLinear(b);
  return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
};

const contrastRatio = (l1: number, l2: number) => {
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
};

const hasProtocol = (value: string) => /^[a-zA-Z][a-zA-Z\d+-.]*:/.test(value);
const looksRelative = (value: string) => value.startsWith('/') || value.startsWith('./') || value.startsWith('../');

const normalizeUrl = (value: string): { normalized: string | null; error: string | null } => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { normalized: null, error: null };
  }
  if (looksRelative(trimmed)) {
    return {
      normalized: null,
      error: 'Provide an absolute URL including the protocol (e.g. https://example.com/page).'
    };
  }
  const candidate = hasProtocol(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    new URL(candidate);
    return { normalized: candidate, error: null };
  } catch {
    return {
      normalized: null,
      error: 'URL looks invalid — double-check the format.'
    };
  }
};

const buildUrlWithUtm = (target: string, params: UtmParams) => {
  const url = new URL(target);
  (Object.entries(params) as [keyof typeof params, string][]).forEach(([key, paramValue]) => {
    const queryKey = `utm_${key}`;
    if (paramValue) {
      url.searchParams.set(queryKey, paramValue);
    } else {
      url.searchParams.delete(queryKey);
    }
  });
  return url.toString();
};

const stripUtmParams = (value: string) => {
  try {
    const url = new URL(value);
    ['source', 'medium', 'campaign', 'term', 'content'].forEach(key => {
      url.searchParams.delete(`utm_${key}`);
    });
    return url.toString();
  } catch {
    return value;
  }
};

const App: React.FC = () => {
  const [currentConfig, setCurrentConfig] = useState<QRCodeConfig>({
    ...DEFAULT_QR_CODE_CONFIG,
    id: `qr-${Date.now()}`,
    name: 'New QR Code',
  });
  const [savedQRCodes, setSavedQRCodes] = useLocalStorage<QRCodeConfig[]>('qr-codes-library', []);
  const qrRef = useRef<any | null>(null);
  const [openSections, setOpenSections] = useState({ content: true, templates: true, colors: true, errorCorrection: true, shape: true, finders: false, logo: false, settings: false, readiness: true });
  const [activeContentType, setActiveContentType] = useState<ContentType>('url');
  const [autoErrorCorrection, setAutoErrorCorrection] = useState(true);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [scanDistanceFt, setScanDistanceFt] = useState(6);
  const [printSizeIn, setPrintSizeIn] = useState(3);
  const templatesRef = useRef<HTMLDivElement>(null);
  
  const [baseUrl, setBaseUrl] = useState(DEFAULT_QR_CODE_CONFIG.rawUrl ?? DEFAULT_QR_CODE_CONFIG.data);
  const [autoUtmEnabled, setAutoUtmEnabled] = useState(true);
  const [utmParams, setUtmParams] = useState({
    source: 'qr-code',
    medium: 'offline',
    campaign: 'spring-launch',
    term: '',
    content: 'studio'
  });
  const [textData, setTextData] = useState('');
  const [wifiData, setWifiData] = useState({ ssid: '', password: '', encryption: 'WPA', isHidden: false });
  const [emailData, setEmailData] = useState({ address: '', subject: '', body: '' });
  const [vCardData, setVCardData] = useState({ firstName: '', lastName: '', org: '', phone: '', email: '' });
  const readiness = useMemo<ReadinessResult>(() => {
    const resolvedBg = currentConfig.bgColor === 'transparent' ? DEFAULT_TRANSPARENT_BG : currentConfig.bgColor;
    const fgColor = currentConfig.fgColor ?? '#000000';
    const fgLum = relativeLuminance(fgColor);
    const bgLum = relativeLuminance(resolvedBg);
    const lumDiff = Math.abs(fgLum - bgLum);
    const maxLum = Math.max(fgLum, bgLum, 0.0001);
    const relativeDiff = maxLum === 0 ? 0 : lumDiff / maxLum;
    const ratio = contrastRatio(fgLum, bgLum);
    const contrastPercent = Math.round(relativeDiff * 100);
    const meetsContrast = relativeDiff >= 0.4;
    const isInverted = fgLum > bgLum;
    const recommendedPrintWidthIn = Number(((scanDistanceFt * 12) / 10).toFixed(2));
    const maxDistanceFt = Number(((printSizeIn / 12) * 10).toFixed(2));
    const sizeOk = printSizeIn >= recommendedPrintWidthIn || printSizeIn === 0;
    const recommendedPixelSize = Math.max(256, Math.round(printSizeIn * 300));
    const warnings: ReadinessWarning[] = [];

    if (!meetsContrast) {
      warnings.push({
        id: 'contrast',
        message: `Contrast is ${contrastPercent}% — increase the difference to at least 40%.`
      });
    }

    if (isInverted) {
      warnings.push({
        id: 'inverted',
        message: 'Light foreground on dark background detected. Most scanners prefer dark modules on a light background.'
      });
    }

    if (!sizeOk && printSizeIn > 0) {
      warnings.push({
        id: 'size',
        message: `At ${scanDistanceFt}ft, print at least ${recommendedPrintWidthIn}" wide to follow the 10:1 rule.`
      });
    }

    if (currentConfig.bgColor === 'transparent') {
      warnings.push({
        id: 'transparent-bg',
        message: 'Transparent backgrounds inherit real-world colors — double-check contrast on the final surface.'
      });
    }

    return {
      warnings,
      metrics: {
        resolvedBg,
        contrastPercent,
        contrastRatio: Number(ratio.toFixed(2)),
        meetsContrast,
        isInverted,
        sizeOk,
        recommendedPrintWidthIn,
        maxDistanceFt,
        recommendedPixelSize
      }
    };
  }, [currentConfig.bgColor, currentConfig.fgColor, printSizeIn, scanDistanceFt]);

  const urlValidation = useMemo(() => normalizeUrl(baseUrl), [baseUrl]);

  const utmPreview = useMemo(() => {
    if (!urlValidation.normalized) return '';
    return autoUtmEnabled ? buildUrlWithUtm(urlValidation.normalized, utmParams) : urlValidation.normalized;
  }, [autoUtmEnabled, utmParams, urlValidation.normalized]);

  const analyticsInsights = useMemo<AnalyticsData>(() => {
    const funnelSteps: FunnelStep[] = [
      { id: 'scans', label: 'Scans', value: 8420, description: 'Total QR scans captured in-platform.' },
      { id: 'landings', label: 'Landing Sessions', value: 5680, description: 'Sessions passed to the destination page.' },
      { id: 'signups', label: 'Leads Captured', value: 1625, description: 'Form submissions attributed to the QR experience.' },
      { id: 'purchases', label: 'Conversions', value: 486, description: 'Orders recorded from tracked sessions.' },
    ];
    const roi = {
      revenue: 28400,
      spend: 6200,
      roas: Number((28400 / 6200).toFixed(2)),
      costPerAcquisition: Number((6200 / 486).toFixed(2)),
      costPerScan: Number((6200 / 8420).toFixed(2)),
    };
    const utmSources = [
      { id: 'print', label: 'qr-code / print-collateral', scans: 3920 },
      { id: 'events', label: 'qr-code / events', scans: 2280 },
      { id: 'packaging', label: 'qr-code / packaging', scans: 1280 },
      { id: 'email', label: 'email / re-engagement', scans: 940 },
    ];
    const total = utmSources.reduce((sum, item) => sum + item.scans, 0) || 1;
    return {
      period: 'Last 30 days',
      totalScans: funnelSteps[0]?.value ?? 0,
      uniqueVisitors: 6235,
      retentionRate: 0.38,
      topLocations: [
        { id: 'nyc', label: 'New York, US', lat: 40.7128, lng: -74.006, scans: 1420, intensity: 0.95 },
        { id: 'la', label: 'Los Angeles, US', lat: 34.0522, lng: -118.2437, scans: 980, intensity: 0.82 },
        { id: 'lon', label: 'London, UK', lat: 51.5072, lng: -0.1276, scans: 720, intensity: 0.75 },
        { id: 'tok', label: 'Tokyo, JP', lat: 35.6762, lng: 139.6503, scans: 610, intensity: 0.7 },
        { id: 'sao', label: 'Sao Paulo, BR', lat: -23.5505, lng: -46.6333, scans: 430, intensity: 0.6 },
      ],
      funnel: funnelSteps,
      roi,
      utmBreakdown: utmSources.map(item => ({ ...item, share: Number((item.scans / total).toFixed(2)) })),
    };
  }, []);
  
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const updateConfig = useCallback(<K extends keyof QRCodeConfig>(key: K, value: QRCodeConfig[K]) => {
    setCurrentConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    let newData = '';
    switch (activeContentType) {
        case 'url': {
            newData = utmPreview;
            break;
        }
        case 'text': newData = textData; break;
        case 'wifi':
            const { ssid, password, encryption, isHidden } = wifiData;
            newData = `WIFI:T:${encryption};S:${ssid};P:${password};H:${isHidden};;`;
            break;
        case 'email':
            const { address, subject, body } = emailData;
            newData = `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            break;
        case 'vcard':
            const { firstName, lastName, org, phone, email } = vCardData;
            newData = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName}\nFN:${firstName} ${lastName}\nORG:${org}\nTEL:${phone}\nEMAIL:${email}\nEND:VCARD`;
            break;
    }
    const trimmedRawUrl = baseUrl.trim();
    setCurrentConfig(prev => ({ ...prev, data: newData || ' ', contentType: activeContentType, rawUrl: trimmedRawUrl }));
  }, [activeContentType, baseUrl, textData, wifiData, emailData, vCardData, utmPreview]);

  useEffect(() => {
    if (autoErrorCorrection) {
        updateConfig('errorCorrectionLevel', currentConfig.image ? 'H' : 'M');
    }
  }, [currentConfig.image, autoErrorCorrection, updateConfig]);

  const handleSave = () => {
    const existingIndex = savedQRCodes.findIndex(qr => qr.id === currentConfig.id);
    let name = currentConfig.name;
    if (name === 'New QR Code' || !name) {
        switch(currentConfig.contentType) {
            case 'url': name = currentConfig.data.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] || 'URL Code'; break;
            case 'text': name = currentConfig.data.substring(0, 20) || 'Text Code'; if(currentConfig.data.length > 20) name += '...'; break;
            default: name = `${currentConfig.contentType.charAt(0).toUpperCase() + currentConfig.contentType.slice(1)} Code`;
        }
    }
    const codeToSave = { ...currentConfig, name, rawUrl: baseUrl.trim() };
    if (existingIndex !== -1) {
      const updatedCodes = [...savedQRCodes];
      updatedCodes[existingIndex] = codeToSave;
      setSavedQRCodes(updatedCodes);
    } else {
      setSavedQRCodes(prev => [...prev, codeToSave]);
    }
    setCurrentConfig(codeToSave);
  };

  const handleDownload = (extension: 'svg' | 'png' | 'jpeg') => {
    if (qrRef.current) {
      qrRef.current.download({ name: 'qr-code', extension });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result;
            if (typeof result === 'string') {
                updateConfig('image', result);
            }
        };
        reader.readAsDataURL(file);
    }
  };
  
  const applyTemplate = (config: Partial<QRCodeConfig>) => {
    setCurrentConfig(prev => ({...prev, ...config}));
  }

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  }

  const handleLoadQRCode = (id: string) => {
    const codeToLoad = savedQRCodes.find(qr => qr.id === id);
    if (codeToLoad) {
        setCurrentConfig(codeToLoad);
        setIsLibraryOpen(false);
        if (codeToLoad.contentType === 'url') {
            const storedRaw = codeToLoad.rawUrl?.trim();
            try {
                const url = new URL(codeToLoad.data);
                const nextParams: UtmParams = {
                    source: url.searchParams.get('utm_source') || utmParams.source,
                    medium: url.searchParams.get('utm_medium') || utmParams.medium,
                    campaign: url.searchParams.get('utm_campaign') || utmParams.campaign,
                    term: url.searchParams.get('utm_term') || utmParams.term,
                    content: url.searchParams.get('utm_content') || utmParams.content,
                };
                setUtmParams(nextParams);
                const containsUtm = Array.from(url.searchParams.keys()).some(key => key.startsWith('utm_'));
                setAutoUtmEnabled(prev => containsUtm || prev);
            } catch {
                // If the stored data cannot be parsed we fall back to previous params.
            }

            if (storedRaw) {
                setBaseUrl(storedRaw);
            } else {
                setBaseUrl(stripUtmParams(codeToLoad.data));
            }
        }
    }
  };

  const handleDeleteQRCode = (id: string) => {
      setSavedQRCodes(prev => prev.filter(qr => qr.id !== id));
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen font-sans text-gray-200 bg-gradient-to-br from-gray-900 to-slate-900">
        <div className="w-full lg:w-3/5 p-6 lg:p-8 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800/50">
            <Header
                onHistoryClick={() => setIsLibraryOpen(true)}
            />
            <ContentTypeTabs activeType={activeContentType} onTypeChange={setActiveContentType} />
            <GlassCard title="Content" isOpen={openSections.content} setIsOpen={() => toggleSection('content')} isCollapsible>
                <DynamicQRControl isDynamic={currentConfig.isDynamic} onChange={(val) => updateConfig('isDynamic', val)} />
                <div className="mt-4">
                    <AnimatePresence mode="wait">
                        <motion.div key={activeContentType} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-4">
                            {activeContentType === 'url' && (
                                <div className="space-y-3">
                                    <FormInput label="Website URL" id="website-url" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://example.com" />
                                    {urlValidation.error && (
                                        <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-400/20 rounded-lg px-3 py-2">
                                            {urlValidation.error}
                                        </div>
                                    )}
                                    <UtmBuilder
                                        enabled={autoUtmEnabled}
                                        onToggle={setAutoUtmEnabled}
                                        params={utmParams}
                                        onChange={setUtmParams}
                                        latestUrl={utmPreview}
                                        urlError={urlValidation.error}
                                        isUrlValid={Boolean(urlValidation.normalized)}
                                    />
                                </div>
                            )}
                            {activeContentType === 'text' && <FormTextarea label="Text" id="text" value={textData} onChange={e => setTextData(e.target.value)} placeholder="Enter your text" />}
                            {activeContentType === 'wifi' && <div className="space-y-4"> <FormInput label="Network SSID" id="wifi-ssid" value={wifiData.ssid} onChange={e => setWifiData(d => ({...d, ssid: e.target.value}))} /> <FormInput label="Password" id="wifi-password" type="password" value={wifiData.password} onChange={e => setWifiData(d => ({...d, password: e.target.value}))} /> <FormInput label="Encryption" id="wifi-encryption" value={wifiData.encryption} onChange={e => setWifiData(d => ({...d, encryption: e.target.value}))} /> <FormCheckbox label="Hidden Network" id="wifi-hidden" checked={wifiData.isHidden} onChange={e => setWifiData(d => ({...d, isHidden: e.target.checked}))} /> </div>}
                            {activeContentType === 'email' && <div className="space-y-4"> <FormInput label="Email Address" id="email-address" type="email" value={emailData.address} onChange={e => setEmailData(d => ({...d, address: e.target.value}))} placeholder="recipient@example.com" /> <FormInput label="Subject" id="email-subject" value={emailData.subject} onChange={e => setEmailData(d => ({...d, subject: e.target.value}))} /> <FormTextarea label="Body" id="email-body" value={emailData.body} onChange={e => setEmailData(d => ({...d, body: e.target.value}))} rows={4} /> </div>}
                            {activeContentType === 'vcard' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> <FormInput label="First Name" id="vcard-fn" value={vCardData.firstName} onChange={e => setVCardData(d => ({...d, firstName: e.target.value}))} /> <FormInput label="Last Name" id="vcard-ln" value={vCardData.lastName} onChange={e => setVCardData(d => ({...d, lastName: e.target.value}))} /> <div className="sm:col-span-2"> <FormInput label="Organization" id="vcard-org" value={vCardData.org} onChange={e => setVCardData(d => ({...d, org: e.target.value}))} /> </div> <FormInput label="Phone" id="vcard-phone" type="tel" value={vCardData.phone} onChange={e => setVCardData(d => ({...d, phone: e.target.value}))} /> <FormInput label="Email" id="vcard-email" type="email" value={vCardData.email} onChange={e => setVCardData(d => ({...d, email: e.target.value}))} /> </div>}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </GlassCard>

            <div ref={templatesRef}>
                <GlassCard title="Templates" isOpen={openSections.templates} setIsOpen={() => toggleSection('templates')} isCollapsible>
                    <div className="grid grid-cols-3 gap-3">
                        {TEMPLATES.map(template => (
                            <button key={template.name} onClick={() => applyTemplate(template.config)} className="py-3 px-2 text-sm rounded-lg transition-colors text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10">
                                {template.name}
                            </button>
                        ))}
                    </div>
                </GlassCard>
            </div>
            
            <GlassCard title="Colors" isOpen={openSections.colors} setIsOpen={() => toggleSection('colors')} isCollapsible>
                <ColorControls fgColor={currentConfig.fgColor} bgColor={currentConfig.bgColor} onFgColorChange={(c) => updateConfig('fgColor', c)} onBgColorChange={(c) => updateConfig('bgColor', c)} />
            </GlassCard>

            <GlassCard title="Error Correction" isOpen={openSections.errorCorrection} setIsOpen={() => toggleSection('errorCorrection')} isCollapsible>
                <div className="space-y-4">
                    <ErrorCorrectionExplanation />
                    <AutoOptimizeToggle enabled={autoErrorCorrection} onChange={setAutoErrorCorrection} />
                    <SegmentedControl
                        label="Level"
                        options={ERROR_CORRECTION_LEVELS}
                        value={currentConfig.errorCorrectionLevel}
                        onChange={(v) => updateConfig('errorCorrectionLevel', v as ErrorCorrectionLevel)}
                        disabled={autoErrorCorrection}
                    />
                    <AnimatePresence>
                        {currentConfig.image && (currentConfig.errorCorrectionLevel === 'L' || currentConfig.errorCorrectionLevel === 'M') && !autoErrorCorrection && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <div className="p-3 text-sm bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 rounded-lg flex items-start gap-2">
                                    <InfoIcon className="!text-base mt-0.5 flex-shrink-0" />
                                    <span>With a logo, a 'High' error correction level is recommended to ensure scannability.</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </GlassCard>

            <GlassCard title="Shape & Style" isOpen={openSections.shape} setIsOpen={() => toggleSection('shape')} isCollapsible>
                <VisualSegmentedControl label="Dot Style" options={DOT_STYLES} value={currentConfig.dotType} onChange={(v) => updateConfig('dotType', v as DotType)} gridCols="grid-cols-3 sm:grid-cols-6" />
            </GlassCard>
            
            <GlassCard title="Finder Pattern Style" isOpen={openSections.finders} setIsOpen={() => toggleSection('finders')} isCollapsible>
                <FinderPatternExplanation />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <VisualSegmentedControl label="Outer Square" options={CORNER_SQUARE_STYLES} value={currentConfig.cornerSquareType} onChange={(v) => updateConfig('cornerSquareType', v as CornerSquareType)} gridCols="grid-cols-3" />
                    <VisualSegmentedControl label="Inner Dot" options={CORNER_DOT_STYLES} value={currentConfig.cornerDotType} onChange={(v) => updateConfig('cornerDotType', v as CornerDotType)} gridCols="grid-cols-3" />
                </div>
            </GlassCard>

            <GlassCard title="Logo" isOpen={openSections.logo} setIsOpen={() => toggleSection('logo')} isCollapsible>
                <LogoUpload image={currentConfig.image} onUpload={handleLogoUpload} onRemove={() => updateConfig('image', undefined)} />
            </GlassCard>
            <GlassCard title="Settings" isOpen={openSections.settings} setIsOpen={() => toggleSection('settings')} isCollapsible>
                <div className="space-y-3 text-sm text-gray-300">
                    <p className="text-gray-400">Access analytics and advanced tracking utilities.</p>
                    <button
                        type="button"
                        onClick={() => setIsAnalyticsOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-400/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20 transition-colors"
                    >
                        <MaterialIcon name="dashboard" className="!text-base" />
                        Open Analytics Dashboard
                    </button>
                </div>
            </GlassCard>
        </div>
        <div className="w-full lg:w-2/5 p-6 lg:p-8 flex flex-col justify-center items-center bg-black/20">
            <div className="w-full max-w-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Live Preview</h2>
                    <p className="text-xs text-gray-400">Updates automatically</p>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex justify-center items-center mb-6 shadow-lg">
                    <motion.div key={currentConfig.id + JSON.stringify(currentConfig)} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="rounded-lg">
                        <QRCodePreview config={currentConfig} qrRef={qrRef} />
                    </motion.div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 mb-6 text-sm">
                    <h3 className="font-semibold text-white mb-3">QR Code Details</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between"><span className="text-gray-400">Type:</span> <span className="font-medium text-white capitalize">{currentConfig.contentType}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Size:</span> <span className="font-medium text-white">256x256px</span></div>
                        <ScanabilityIndicator fgColor={currentConfig.fgColor} bgColor={currentConfig.bgColor} />
                    </div>
                </div>
                <div className="mb-6">
                    <GlassCard
                        title="Scan Readiness"
                        isCollapsible
                        isOpen={openSections.readiness}
                        setIsOpen={() => toggleSection('readiness')}
                    >
                        <ScanReadinessCard
                            readiness={readiness}
                            scanDistanceFt={scanDistanceFt}
                            onScanDistanceChange={setScanDistanceFt}
                            printSizeIn={printSizeIn}
                            onPrintSizeChange={setPrintSizeIn}
                            onOpenScanner={() => setIsScanModalOpen(true)}
                        />
                    </GlassCard>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-2">
                    <ActionButton onClick={() => handleDownload('png')} icon={<DownloadIcon />} text="PNG" isPrimary />
                    <ActionButton onClick={() => handleDownload('jpeg')} text="JPEG" />
                    <ActionButton onClick={() => handleDownload('svg')} text="SVG" />
                    <ActionButton onClick={() => setIsScanModalOpen(true)} icon={<CameraIcon />} text="Test" />
                </div>
                <button onClick={handleSave} className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium rounded-xl text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors">
                    <SaveIcon /> <span>Save QR Code</span>
                </button>
            </div>
        </div>

        <LibraryModal
            isOpen={isLibraryOpen}
            onClose={() => setIsLibraryOpen(false)}
            savedQRCodes={savedQRCodes}
            onLoad={handleLoadQRCode}
            onDelete={handleDeleteQRCode}
        />
        <ScanPreviewModal
            isOpen={isScanModalOpen}
            onClose={() => setIsScanModalOpen(false)}
            expectedData={currentConfig.data}
        />
        <AnalyticsModal
            isOpen={isAnalyticsOpen}
            onClose={() => setIsAnalyticsOpen(false)}
            data={analyticsInsights}
        />
    </div>
  );
};

// --- Components ---

const Header: React.FC<{
    onHistoryClick: () => void;
}> = ({ onHistoryClick }) => (
    <header className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
            <LogoIcon />
            <div>
                <h1 className="text-xl font-bold text-white">QR Code Studio</h1>
                <p className="text-sm text-gray-400">Create beautiful, custom QR codes</p>
            </div>
        </div>
        <div className="flex items-center space-x-2">
            <GlassButton onClick={onHistoryClick}><HistoryIcon /></GlassButton>
            <GlassButton><AccountIcon /></GlassButton>
        </div>
    </header>
);

const GlassButton: React.FC<{ children: React.ReactNode; onClick?: () => void;}> = ({ children, onClick }) => (
    <button onClick={onClick} className="p-2 rounded-xl text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
        {children}
    </button>
);

const GlassCard: React.FC<{ title?: string; children: React.ReactNode; isCollapsible?: boolean; isOpen?: boolean; setIsOpen?: () => void; }> = ({ title, children, isCollapsible, isOpen, setIsOpen }) => (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
        {title && (
            <button onClick={() => isCollapsible && setIsOpen && setIsOpen()} className={`flex items-center justify-between w-full p-4 ${isCollapsible && isOpen ? 'border-b border-white/10' : ''} ${isCollapsible ? '' : 'cursor-default'}`}>
                <h3 className="font-semibold text-white">{title}</h3>
                {isCollapsible && (
                    <div className="p-1 text-gray-400">
                        <motion.div animate={{ rotate: isOpen ? 0 : -180 }} transition={{ duration: 0.3 }}>
                           {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        </motion.div>
                    </div>
                )}
            </button>
        )}
        <AnimatePresence initial={false}>
            {(!isCollapsible || isOpen) && (
                <motion.div key="content" initial="collapsed" animate="open" exit="collapsed" variants={{ open: { opacity: 1, height: 'auto' }, collapsed: { opacity: 0, height: 0 } }} transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }} className="overflow-hidden">
                    <div className="p-6">{children}</div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

const LibraryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    savedQRCodes: QRCodeConfig[];
    onLoad: (id: string) => void;
    onDelete: (id: string) => void;
}> = ({ isOpen, onClose, savedQRCodes, onLoad, onDelete }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="w-full max-w-md bg-gray-900/80 backdrop-blur-lg border border-gray-700/50 rounded-2xl shadow-2xl flex flex-col"
                    style={{ maxHeight: '80vh' }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center p-4 border-b border-white/10 flex-shrink-0">
                        <h2 className="text-lg font-semibold text-white">My QR Codes</h2>
                        <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-white/10 transition-colors">
                            <MaterialIcon name="close" />
                        </button>
                    </div>
                    <div className="p-4 overflow-y-auto">
                        <Library savedQRCodes={savedQRCodes} onLoad={onLoad} onDelete={onDelete} />
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

const ScanPreviewModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    expectedData: string;
}> = ({ isOpen, onClose, expectedData }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number>();
    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error' | 'no_permission'>('idle');
    const [scannedData, setScannedData] = useState<string>('');

    // FIX: Add `_time` parameter to match the `requestAnimationFrame` callback signature.
    const tick = useCallback(() => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'dontInvert',
                });

                const overlayCanvas = overlayCanvasRef.current;
                const overlayCtx = overlayCanvas ? overlayCanvas.getContext('2d') : null;
                if (overlayCanvas && overlayCtx) {
                    overlayCanvas.width = video.videoWidth;
                    overlayCanvas.height = video.videoHeight;
                    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                }

                if (code) {
                    const isMatch = code.data === expectedData.trim();
                    if (overlayCanvas && overlayCtx) {
                        overlayCtx.strokeStyle = isMatch ? '#34d399' : '#facc15';
                        overlayCtx.lineWidth = 4;
                        overlayCtx.beginPath();
                        overlayCtx.moveTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
                        overlayCtx.lineTo(code.location.topRightCorner.x, code.location.topRightCorner.y);
                        overlayCtx.lineTo(code.location.bottomRightCorner.x, code.location.bottomRightCorner.y);
                        overlayCtx.lineTo(code.location.bottomLeftCorner.x, code.location.bottomLeftCorner.y);
                        overlayCtx.closePath();
                        overlayCtx.stroke();
                        overlayCtx.fillStyle = isMatch ? 'rgba(52, 211, 153, 0.12)' : 'rgba(250, 204, 21, 0.12)';
                        overlayCtx.fill();
                        const centerX = (code.location.topLeftCorner.x + code.location.topRightCorner.x + code.location.bottomLeftCorner.x + code.location.bottomRightCorner.x) / 4;
                        const centerY = (code.location.topLeftCorner.y + code.location.topRightCorner.y + code.location.bottomLeftCorner.y + code.location.bottomRightCorner.y) / 4;
                        overlayCtx.beginPath();
                        overlayCtx.arc(centerX, centerY, 6, 0, Math.PI * 2);
                        overlayCtx.fillStyle = isMatch ? '#34d399' : '#facc15';
                        overlayCtx.fill();
                    }

                    setScannedData(code.data);
                    if (isMatch) {
                        setStatus('success');
                    } else {
                        setStatus('error');
                    }
                } else {
                    if (overlayCanvas && overlayCtx) {
                        overlayCtx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
                        overlayCtx.lineWidth = 2;
                        overlayCtx.setLineDash([8, 12]);
                        const insetX = overlayCanvas.width * 0.15;
                        const insetY = overlayCanvas.height * 0.15;
                        overlayCtx.strokeRect(insetX, insetY, overlayCanvas.width - insetX * 2, overlayCanvas.height - insetY * 2);
                        overlayCtx.setLineDash([]);
                    }
                    if (status !== 'scanning') setStatus('scanning');
                }
            }
        }
        animationFrameId.current = requestAnimationFrame(tick);
    }, [expectedData, status]);

    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setScannedData('');
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(stream => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.setAttribute('playsinline', 'true');
                        videoRef.current.play();
                        animationFrameId.current = requestAnimationFrame(tick);
                    }
                })
                .catch(err => {
                    console.error("Camera access error:", err);
                    setStatus('no_permission');
                });
        } else {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            if (overlayCanvasRef.current) {
                const ctx = overlayCanvasRef.current.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
            }
        }

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            if (overlayCanvasRef.current) {
                const ctx = overlayCanvasRef.current.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
            }
        };
    }, [isOpen, tick]);

    const StatusIndicator = () => {
        let icon, text, bgColor, textColor;
        switch(status) {
            case 'success':
                icon = <MaterialIcon name="check_circle" className="!text-3xl" />;
                text = "Success! Data matches.";
                bgColor = 'bg-green-500/80';
                textColor = 'text-white';
                break;
            case 'error':
                icon = <MaterialIcon name="error" className="!text-3xl" />;
                text = "Data mismatch.";
                bgColor = 'bg-yellow-500/80';
                textColor = 'text-white';
                break;
            case 'no_permission':
                icon = <MaterialIcon name="videocam_off" className="!text-3xl" />;
                text = "Camera permission denied.";
                bgColor = 'bg-red-500/80';
                textColor = 'text-white';
                break;
            case 'scanning':
            default:
                icon = <MaterialIcon name="qr_code_scanner" className="!text-3xl animate-pulse" />;
                text = "Point camera at QR code";
                bgColor = 'bg-black/50';
                textColor = 'text-gray-200';
                break;
        }
        return (
            <motion.div initial={{y: 20, opacity: 0}} animate={{y:0, opacity: 1}} className={`absolute bottom-8 left-8 right-8 p-4 rounded-xl backdrop-blur-md flex items-center justify-center gap-4 ${bgColor} ${textColor} border border-white/10`}>
                {icon}
                <div className="text-center overflow-hidden">
                    <p className="font-semibold">{text}</p>
                    {status === 'error' && <p className="text-xs truncate" title={`Expected: ${expectedData.trim()} | Scanned: ${scannedData}`}>Scanned: {scannedData}</p>}
                </div>
            </motion.div>
        );
    }
    
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-lg aspect-square bg-gray-800 rounded-2xl shadow-2xl relative overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                         <video ref={videoRef} className="absolute top-0 left-0 w-full h-full object-cover" muted playsInline />
                         <canvas ref={canvasRef} className="hidden" />
                         <canvas ref={overlayCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-2/3 h-2/3 max-w-[300px] max-h-[300px] border-4 border-white/50 rounded-2xl" style={{boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'}} />
                         </div>
                         <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-white bg-black/30 hover:bg-black/50 transition-colors z-10">
                             <MaterialIcon name="close" />
                         </button>
                         {(status !== 'idle') && <StatusIndicator />}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const AnalyticsModal: React.FC<{ isOpen: boolean; onClose: () => void; data: AnalyticsData; }> = ({ isOpen, onClose, data }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-[#0b1324]/95 backdrop-blur-xl shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 text-sm text-gray-300">
                        <div>
                            <p className="text-base font-semibold text-white">Analytics Dashboard</p>
                            <p className="text-xs text-gray-400">Track scans, conversions, and ROI. Connect GA4 or a marketing platform when ready.</p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full text-gray-300 hover:bg-white/10 transition-colors">
                            <MaterialIcon name="close" />
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-4.5rem)]">
                        <AnalyticsPanel data={data} />
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);


const contentTypes: { id: ContentType, label: string, icon: React.ReactNode }[] = [ { id: 'url', label: 'URL', icon: <LinkIcon /> }, { id: 'text', label: 'Text', icon: <TextIcon /> }, { id: 'wifi', label: 'WiFi', icon: <WifiIcon /> }, { id: 'vcard', label: 'vCard', icon: <VCardIcon /> }, { id: 'email', label: 'Email', icon: <EmailIcon /> },]
const ContentTypeTabs: React.FC<{activeType: ContentType; onTypeChange: (type: ContentType) => void;}> = ({ activeType, onTypeChange }) => (
    <div className="flex space-x-1 p-1 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
        {contentTypes.map(({ id, label, icon }) => (
            <button key={id} onClick={() => onTypeChange(id)} className={`relative flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${ activeType !== id ? 'text-gray-300 hover:bg-white/10' : 'text-white'}`}>
                {activeType === id && <motion.div layoutId="active-content-type" className="absolute inset-0 bg-white/10 rounded-lg shadow-sm" />}
                <span className="relative z-10">{icon}</span>
                <span className="relative z-10">{label}</span>
            </button>
        ))}
    </div>
);

const DynamicQRControl: React.FC<{isDynamic: boolean; onChange: (isDynamic: boolean) => void;}> = ({ isDynamic, onChange }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div>
                <h4 className="font-semibold text-white">Dynamic QR Code</h4>
                <p className="text-sm text-gray-400">Track scans and update content later.</p>
            </div>
            <div className="relative group">
                <InfoIcon />
                <div className="absolute bottom-full mb-2 w-64 p-2 text-xs bg-gray-900 border border-gray-700 rounded-md text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -translate-x-1/2 left-1/2 z-10">
                    Dynamic codes allow you to change the destination URL and track scan analytics. Static codes are fixed and cannot be changed after creation.
                </div>
            </div>
        </div>
        <button onClick={() => onChange(!isDynamic)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isDynamic ? 'bg-indigo-500' : 'bg-white/10'}`}>
            <motion.span layout className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform m-1 ${isDynamic ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; }> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <input id={id} {...props} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition text-white placeholder:text-gray-500" />
    </div>
);

const FormTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; id: string; }> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <textarea id={id} {...props} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition text-white placeholder:text-gray-500" />
    </div>
);

const FormCheckbox: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; }> = ({ label, id, ...props }) => (
    <div className="flex items-center">
        <input type="checkbox" id={id} {...props} className="h-4 w-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-600 bg-gray-900/50" />
        <label htmlFor={id} className="ml-2 block text-sm text-gray-300">{label}</label>
    </div>
);

const ColorControls: React.FC<{ fgColor: string; bgColor: string; onFgColorChange: (c: string) => void; onBgColorChange: (c: string) => void; }> = ({ fgColor, bgColor, onFgColorChange, onBgColorChange }) => (
    <div className="flex space-x-4">
        <ColorInput label="Foreground" color={fgColor} onChange={onFgColorChange} />
        <ColorInput label="Background" color={bgColor} onChange={onBgColorChange} />
    </div>
);

const ColorInput: React.FC<{ label: string; color: string; onChange: (c: string) => void; }> = ({ label, color, onChange }) => {
    const transparentBg = '#1a233b';
    const inputValue = color === 'transparent' ? transparentBg : color;
    return (
        <div className="flex-1">
            <span className="text-xs text-gray-400">{label}</span>
            <div className="flex items-center space-x-2 mt-1 w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 relative">
                <input
                    type="color"
                    value={inputValue}
                    onChange={e => onChange(e.target.value)}
                    className="absolute w-6 h-6 rounded-md opacity-0 cursor-pointer"
                    aria-label={`${label} color picker`}
                />
                <div style={{backgroundColor: color === 'transparent' ? transparentBg : color}} className={`w-6 h-6 rounded-md border border-white/10 ${color === 'transparent' ? 'bg-transparent-grid' : ''}`}></div>
                <span className="text-sm font-mono text-gray-300 flex-1">{color === 'transparent' ? 'TRANSPARENT' : color.toUpperCase()}</span>
                {color !== 'transparent' && (
                    <button
                        type="button"
                        onClick={() => onChange('transparent')}
                        className="text-xs text-indigo-300 hover:text-indigo-200 transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
};

const UtmBuilder: React.FC<{
    enabled: boolean;
    onToggle: (value: boolean) => void;
    params: UtmParams;
    onChange: React.Dispatch<React.SetStateAction<UtmParams>>;
    latestUrl: string;
    urlError: string | null;
    isUrlValid: boolean;
}> = ({ enabled, onToggle, params, onChange, latestUrl, urlError, isUrlValid }) => {
    const utmFields: { key: keyof UtmParams; label: string; placeholder: string; helper?: string }[] = [
        { key: 'source', label: 'Source', placeholder: 'print-flyer', helper: 'Where the scan originated' },
        { key: 'medium', label: 'Medium', placeholder: 'qr', helper: 'Channel grouping' },
        { key: 'campaign', label: 'Campaign', placeholder: 'spring-launch', helper: 'Campaign name' },
        { key: 'content', label: 'Content', placeholder: 'cta-variant-a' },
        { key: 'term', label: 'Term', placeholder: 'promo-code' },
    ];

    const handleParamChange = (key: keyof UtmParams, value: string) => {
        onChange(prev => ({ ...prev, [key]: value }));
    };

    const canShowFields = enabled && isUrlValid;
    const previewUrl = canShowFields ? latestUrl : '';

    return (
        <div className="p-3 rounded-xl bg-black/20 border border-white/10 text-xs text-gray-300 space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-white flex items-center gap-1">
                        <MaterialIcon name="tag" className="!text-base text-indigo-300" />
                        UTM Automation
                    </p>
                    <p className="text-xs text-gray-400">Append tracking parameters so scans tie back to marketing analytics.</p>
                </div>
                <button
                    type="button"
                    onClick={() => onToggle(!enabled)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-indigo-500' : 'bg-white/10'}`}
                    aria-pressed={enabled}
                >
                    <motion.span layout className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform m-1 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
            </div>
            {enabled && !isUrlValid && !urlError && (
                <div className="text-[0.65rem] text-yellow-200 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                    Add a valid destination above to append UTM parameters.
                </div>
            )}
            <AnimatePresence initial={false}>
                {canShowFields && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {utmFields.map(field => (
                                <label key={field.key} className="flex flex-col gap-1">
                                    <span className="text-[0.65rem] uppercase tracking-wide text-gray-400">{field.label}</span>
                                    <input
                                        type="text"
                                        value={params[field.key]}
                                        onChange={e => handleParamChange(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none"
                                    />
                                    {field.helper && <span className="text-[0.65rem] text-gray-500">{field.helper}</span>}
                                </label>
                            ))}
                        </div>
                        {previewUrl && (
                            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[0.7rem] text-indigo-100 break-all">
                                <span className="text-gray-400">Preview:</span>
                                <span className="ml-2 text-white">{previewUrl}</span>
                            </div>
                        )}
                        <p className="text-[0.65rem] text-gray-500">We keep the original field above clean—UTMs only touch the generated QR destination.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ScanReadinessCard: React.FC<{
    readiness: ReadinessResult;
    scanDistanceFt: number;
    onScanDistanceChange: (value: number) => void;
    printSizeIn: number;
    onPrintSizeChange: (value: number) => void;
    onOpenScanner: () => void;
}> = ({ readiness, scanDistanceFt, onScanDistanceChange, printSizeIn, onPrintSizeChange, onOpenScanner }) => {
    const { warnings, metrics } = readiness;
    const isReady = warnings.length === 0;

    const handleDistanceChange = (value: string) => {
        const next = Number(value);
        if (!Number.isFinite(next)) return;
        onScanDistanceChange(Math.max(0, parseFloat(next.toFixed(2))));
    };

    const handlePrintSizeChange = (value: string) => {
        const next = Number(value);
        if (!Number.isFinite(next)) return;
        onPrintSizeChange(Math.max(0, parseFloat(next.toFixed(2))));
    };

    return (
        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 mb-6 text-sm">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Scan Readiness</h3>
                <span className={`px-3 py-1 text-xs rounded-full border ${isReady ? 'text-green-300 border-green-400/30 bg-green-500/10' : 'text-yellow-200 border-yellow-400/30 bg-yellow-500/10'}`}>
                    {isReady ? 'Ready' : 'Needs attention'}
                </span>
            </div>
            <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Contrast</p>
                        <p className="text-sm text-white font-medium">{metrics.contrastPercent}% diff · {metrics.contrastRatio}:1</p>
                    </div>
                    <MaterialIcon name={metrics.meetsContrast ? 'check_circle' : 'warning'} className={`!text-xl ${metrics.meetsContrast ? 'text-green-400' : 'text-yellow-300'}`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs text-gray-400">
                        Scan distance (ft)
                        <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={Number.isFinite(scanDistanceFt) ? scanDistanceFt : ''}
                            onChange={e => handleDistanceChange(e.target.value)}
                            className="mt-1 w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none"
                        />
                    </label>
                    <label className="text-xs text-gray-400">
                        Print width (in)
                        <input
                            type="number"
                            min={0}
                            step={0.25}
                            value={Number.isFinite(printSizeIn) ? printSizeIn : ''}
                            onChange={e => handlePrintSizeChange(e.target.value)}
                            className="mt-1 w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none"
                        />
                    </label>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-white/5 text-xs text-gray-300 space-y-1">
                    <div className="flex items-center justify-between">
                        <span>Max distance for current size</span>
                        <span className="font-medium text-white">{metrics.maxDistanceFt}ft</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span>Min width for {scanDistanceFt}ft</span>
                        <span className="font-medium text-white">{metrics.recommendedPrintWidthIn}"</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span>Recommended export size</span>
                        <span className="font-medium text-white">{metrics.recommendedPixelSize}px</span>
                    </div>
                </div>
            </div>
            <div className="mt-3 space-y-2">
                {warnings.map(warning => (
                    <div key={warning.id} className="flex items-start gap-2 text-xs text-yellow-200 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                        <MaterialIcon name="priority_high" className="!text-base mt-0.5" />
                        <span>{warning.message}</span>
                    </div>
                ))}
                {isReady && (
                    <div className="flex items-center gap-2 text-xs text-green-200 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                        <MaterialIcon name="done_all" className="!text-base" />
                        <span>Looks good. Run the live scan preview to double-check lighting and focus.</span>
                    </div>
                )}
            </div>
            <button
                onClick={onOpenScanner}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl text-indigo-200 bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 transition-colors"
            >
                <MaterialIcon name="qr_code_scanner" />
                Live scan preview
            </button>
        </div>
    );
};

const AnalyticsPanel: React.FC<{ data: AnalyticsData; }> = ({ data }) => {
    const stats = [
        { label: 'Total scans', value: data.totalScans.toLocaleString() },
        { label: 'Unique visitors', value: data.uniqueVisitors.toLocaleString() },
        { label: 'Retention', value: `${Math.round(data.retentionRate * 100)}%` },
        { label: 'ROAS', value: `${data.roi.roas.toFixed(2)}x` },
    ];

    return (
        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 mb-6 text-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-white">Analytics Dashboard</h3>
                    <p className="text-xs text-gray-400">{data.period} · Track scans through to revenue with built-in ROI math.</p>
                </div>
                <button
                    type="button"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-indigo-200 bg-indigo-500/20 border border-indigo-400/40 hover:bg-indigo-500/30 transition-colors"
                >
                    <MaterialIcon name="analytics" className="!text-base" />
                    Connect GA4
                </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
                {stats.map(stat => (
                    <div key={stat.label} className="p-3 rounded-lg bg-black/20 border border-white/5">
                        <p className="uppercase tracking-wide text-[0.65rem] text-gray-500">{stat.label}</p>
                        <p className="text-lg font-semibold text-white">{stat.value}</p>
                    </div>
                ))}
            </div>
            <div className="space-y-3">
                <div>
                    <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-2">Scan hotspots</h4>
                    <HeatMap points={data.topLocations} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                        <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-2">Conversion funnel</h4>
                        <ConversionFunnel steps={data.funnel} />
                    </div>
                    <div className="p-3 rounded-lg bg-black/20 border border-white/5 space-y-2">
                        <h4 className="text-xs uppercase tracking-wide text-gray-400">ROI snapshot</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                            <StatPair label="Revenue" value={`$${data.roi.revenue.toLocaleString()}`} tone="positive" />
                            <StatPair label="Spend" value={`$${data.roi.spend.toLocaleString()}`} />
                            <StatPair label="Cost / acquisition" value={`$${data.roi.costPerAcquisition.toFixed(2)}`} />
                            <StatPair label="Cost / scan" value={`$${data.roi.costPerScan.toFixed(2)}`} />
                        </div>
                        <p className="text-[0.65rem] text-gray-500">Feed conversions via webhook or Google Analytics Measurement Protocol to replace these mock metrics with live numbers.</p>
                    </div>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                    <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-2">Top UTM performers</h4>
                    <UtmBreakdownList items={data.utmBreakdown} />
                </div>
                <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-400/20 text-xs text-indigo-100 space-y-1">
                    <p className="font-medium text-indigo-100">Next integrations</p>
                    <p>• Send scan payloads to Google Analytics 4 using Measurement Protocol (include `client_id`, `utm_*`, and order values).</p>
                    <p>• Sync lead captures with HubSpot or Salesforce via webhook to complete the offline-to-online funnel.</p>
                </div>
            </div>
        </div>
    );
};

const StatPair: React.FC<{ label: string; value: string; tone?: 'positive' | 'neutral' }> = ({ label, value, tone = 'neutral' }) => (
    <div className={`p-2 rounded-md ${tone === 'positive' ? 'bg-green-500/10 border border-green-400/20' : 'bg-white/5 border border-white/10'}`}>
        <p className="text-[0.65rem] uppercase tracking-wide text-gray-500">{label}</p>
        <p className={`text-sm font-semibold ${tone === 'positive' ? 'text-green-200' : 'text-white'}`}>{value}</p>
    </div>
);

const HeatMap: React.FC<{ points: HeatPoint[] }> = ({ points }) => {
    const latLngToPosition = (lat: number, lng: number) => ({
        left: `${((lng + 180) / 360) * 100}%`,
        top: `${((90 - lat) / 180) * 100}%`,
    });

    return (
        <div
            className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0b1324] aspect-[4/3]"
            style={{
                backgroundImage:
                    'radial-gradient(circle at 20% 20%, rgba(99,102,241,0.18), transparent 55%), radial-gradient(circle at 80% 30%, rgba(16,185,129,0.15), transparent 55%), radial-gradient(circle at 40% 80%, rgba(59,130,246,0.12), transparent 60%)',
            }}
        >
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
            {points.map(point => {
                const position = latLngToPosition(point.lat, point.lng);
                const size = 16 + point.intensity * 26;
                return (
                    <div
                        key={point.id}
                        className="absolute pointer-events-none"
                        style={{ left: position.left, top: position.top, transform: 'translate(-50%, -50%)' }}
                    >
                        <div
                            className="rounded-full"
                            style={{
                                width: size,
                                height: size,
                                background: 'rgba(99,102,241,0.6)',
                                boxShadow: `0 0 ${size * 2}px ${size}px rgba(99,102,241,0.35)`
                            }}
                        />
                        <div className="mt-1 px-2 py-1 rounded-full bg-black/60 text-[0.65rem] text-indigo-100 border border-white/10 text-center whitespace-nowrap">
                            {point.label} · {point.scans.toLocaleString()} scans
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ConversionFunnel: React.FC<{ steps: FunnelStep[] }> = ({ steps }) => {
    const max = steps[0]?.value || 1;
    return (
        <div className="space-y-3">
            {steps.map((step, index) => {
                const percentOfStart = Math.round((step.value / max) * 100);
                const previous = index === 0 ? null : steps[index - 1];
                const stepConversion = previous ? Math.round((step.value / (previous.value || 1)) * 100) : 100;
                return (
                    <div key={step.id} className="space-y-1">
                        <div className="flex items-center justify-between text-[0.7rem] text-gray-300">
                            <span className="font-medium text-white/90">{step.label}</span>
                            <span>{step.value.toLocaleString()} · {percentOfStart}% of scans</span>
                        </div>
                        <div className="h-2 rounded-lg bg-white/5">
                            <div
                                className="h-full rounded-lg bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400"
                                style={{ width: `${Math.max(4, (step.value / max) * 100)}%` }}
                            />
                        </div>
                        {previous && (
                            <p className="text-[0.65rem] text-gray-500">{stepConversion}% from {previous.label.toLowerCase()} · {step.description}</p>
                        )}
                        {!previous && <p className="text-[0.65rem] text-gray-500">{step.description}</p>}
                    </div>
                );
            })}
        </div>
    );
};

const UtmBreakdownList: React.FC<{ items: AnalyticsData['utmBreakdown'] }> = ({ items }) => (
    <div className="space-y-2 text-xs text-gray-300">
        {items.map(item => (
            <div key={item.id}>
                <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                    <span>{(item.share * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-lg bg-white/5 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300"
                        style={{ width: `${Math.min(100, Math.max(4, item.share * 100))}%` }}
                    />
                </div>
            </div>
        ))}
    </div>
);

const ErrorCorrectionExplanation: React.FC = () => (
    <div className="text-sm text-gray-400">
        <p>This adds redundant data, allowing the code to be scanned even if partially damaged or obscured (e.g., by a logo).</p>
    </div>
);

const AutoOptimizeToggle: React.FC<{enabled: boolean, onChange: (enabled: boolean) => void}> = ({ enabled, onChange }) => (
    <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
        <div>
            <h4 className="font-semibold text-white">Auto-Optimize</h4>
            <p className="text-sm text-gray-400">Automatically sets the best level.</p>
        </div>
        <button onClick={() => onChange(!enabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-indigo-500' : 'bg-white/10'}`}>
            <motion.span layout className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform m-1 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);

const SegmentedControl = <T extends string>({ label, options, value, onChange, disabled }: { label:string; options: {value: T, label: string, description: string}[]; value: T; onChange: (value: T) => void; disabled?: boolean; }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
        <div className={`grid grid-cols-4 gap-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            {options.map(option => (
                <button key={option.value} onClick={() => onChange(option.value)} className={`p-2 text-center rounded-lg transition-colors ${value === option.value ? 'bg-indigo-500 text-white font-semibold' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
                    <span className="text-sm">{option.label}</span>
                    <span className="block text-xs text-gray-300/50">{option.description}</span>
                </button>
            ))}
        </div>
    </div>
);

const StylePreviewIcon: React.FC<{ type: string }> = ({ type }) => {
    const iconStyles: { [key: string]: React.ReactNode } = {
        square: <div className="w-5 h-5 bg-current rounded-[1px]"></div>,
        dots: <div className="w-5 h-5 bg-current rounded-full"></div>,
        rounded: <div className="w-5 h-5 bg-current rounded"></div>,
        'extra-rounded': <div className="w-5 h-5 bg-current rounded-md"></div>,
        'classy': <div className="w-5 h-5"><div className="w-full h-full bg-current rounded-[1px] transform scale-[0.8]"></div></div>,
        'classy-rounded': <div className="w-5 h-5"><div className="w-full h-full bg-current rounded-md transform scale-[0.8]"></div></div>,
        dot: <div className="w-5 h-5"><div className="w-full h-full bg-current rounded-full transform scale-50"></div></div>,
    };
    return <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white/5">{iconStyles[type] || iconStyles['square']}</div>;
};

const VisualSegmentedControl = <T extends string>({ label, options, value, onChange, gridCols }: { label:string; options: {value: T, label: string}[]; value: T; onChange: (value: T) => void; gridCols?: string; }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
        <div className={`grid ${gridCols || 'grid-cols-3'} gap-2`}>
            {options.map(option => (
                <button key={option.value} onClick={() => onChange(option.value)} className={`p-2 text-sm rounded-lg transition-colors flex flex-col items-center justify-center gap-2 aspect-square ${value === option.value ? 'bg-indigo-500/50 text-white border border-indigo-500/70' : 'text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10'}`}>
                    <StylePreviewIcon type={option.value} />
                    <span className="text-xs">{option.label}</span>
                </button>
            ))}
        </div>
    </div>
);


const FinderPatternExplanation = () => (
    <div className="flex items-center gap-4 p-3 bg-black/20 rounded-lg mb-4 text-sm text-gray-400">
        <svg width="60" height="60" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
            <path d="M0 0h7v7H0V0zm2 2v3h3V2H2z" fill="currentColor"/>
            <path d="M18 0h7v7h-7V0zm2 2v3h3V2h-3z" fill="currentColor"/>
            <path d="M0 18h7v7H0v-7zm2 2v3h3v-3H2z" fill="currentColor"/>
            <path d="M3 10h1v1H3zM5 10h1v1H5zM3 12h1v1H3zM5 12h1v1H5zM10 3h1v1h-1zM12 3h1v1h-1zM10 5h1v1h-1zM12 5h1v1h-1zM19 10h1v1h-1zM21 10h1v1h-1zM19 12h1v1h-1zM21 12h1v1h-1zM10 19h1v1h-1zM12 19h1v1h-1zM10 21h1v1h-1zM12 21h1v1h-1z" fillOpacity="0.5" fill="currentColor"/>
            <rect x="0.5" y="0.5" width="6" height="6" stroke="rgb(129 140 248)" rx="1"/>
            <rect x="18.5" y="0.5" width="6" height="6" stroke="rgb(129 140 248)" rx="1"/>
            <rect x="0.5" y="18.5" width="6" height="6" stroke="rgb(129 140 248)" rx="1"/>
        </svg>
        <span>
            Customize the "eyes" of the QR code. The <strong>outer square</strong> and <strong>inner dot</strong> can have different styles.
        </span>
    </div>
);

const LogoUpload: React.FC<{image?: string; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onRemove: () => void;}> = ({ image, onUpload, onRemove }) => (
    <div className="flex items-center space-x-4">
        <div className="w-20 h-20 rounded-lg bg-black/20 border border-white/10 flex items-center justify-center flex-shrink-0">
            {image ? (
                <img src={image} alt="Logo Preview" className="w-full h-full object-contain rounded-md" />
            ) : (
                <LogoIcon className="!bg-transparent !border-none" />
            )}
        </div>
        <div className="flex-grow">
            {image ? (
                <div className="space-y-2">
                    <p className="text-sm text-gray-400 truncate">Logo applied.</p>
                    <button onClick={onRemove} className="flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-md text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors">
                        <RemoveIcon /> <span>Remove</span>
                    </button>
                </div>
            ) : (
                <div>
                    <label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 transition-colors">
                        <UploadIcon />
                        <span>Upload Logo</span>
                    </label>
                    <input id="logo-upload" type="file" accept="image/png, image/jpeg, image/svg+xml" className="hidden" onChange={onUpload} />
                    <p className="text-xs text-gray-500 mt-2">PNG, JPG, SVG up to 1MB.</p>
                </div>
            )}
        </div>
    </div>
);

const ScanabilityIndicator: React.FC<{ fgColor: string; bgColor: string; }> = ({ fgColor, bgColor }) => {
    // This is a simplified contrast check. A real-world scenario would use a more robust library.
    const getLuminance = (hex: string) => {
        if (hex === 'transparent') hex = '#1a233b';
        hex = hex.replace('#', '');
        const rgb = parseInt(hex, 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        const sRGB = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * sRGB[0] + 0.7151 * sRGB[1] + 0.0722 * sRGB[2];
    };

    const lum1 = getLuminance(fgColor);
    const lum2 = getLuminance(bgColor);
    const contrast = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);

    const level = contrast > 7 ? 'Excellent' : contrast > 4.5 ? 'Good' : contrast > 3 ? 'Fair' : 'Poor';
    const color = level === 'Excellent' ? 'text-green-500' : level === 'Good' ? 'text-lime-600' : level === 'Fair' ? 'text-yellow-500' : 'text-red-500';
    const isInverted = lum1 > lum2;

    return (
        <div className="flex justify-between">
            <span className="text-gray-400">Scanability:</span>
             <div className="flex items-center gap-2">
                {isInverted && (
                    <div className="relative group">
                        <MaterialIcon name="warning_amber" className="!text-base text-yellow-500" />
                        <div className="absolute bottom-full right-0 mb-2 w-48 p-2 text-xs bg-gray-900 border border-gray-700 rounded-md text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            Inverted colors (light on dark) may not be readable by all QR scanner apps.
                        </div>
                    </div>
                )}
                <span className={`font-medium ${color}`}>{level}</span>
            </div>
        </div>
    );
};

const ActionButton: React.FC<{ onClick: () => void; text: string; icon?: React.ReactNode; isPrimary?: boolean }> = ({ onClick, text, icon, isPrimary }) => (
    <button onClick={onClick} className={`w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
        isPrimary
            ? 'text-white bg-indigo-600 hover:bg-indigo-700'
            : 'text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10'
    }`}>
        {icon && <span>{icon}</span>}
        <span>{text}</span>
    </button>
);

export default App;