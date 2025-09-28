

import React, { useState, useRef, useEffect, useCallback } from 'react';
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

const App: React.FC = () => {
  const [currentConfig, setCurrentConfig] = useState<QRCodeConfig>({
    ...DEFAULT_QR_CODE_CONFIG,
    id: `qr-${Date.now()}`,
    name: 'New QR Code',
  });
  const [savedQRCodes, setSavedQRCodes] = useLocalStorage<QRCodeConfig[]>('qr-codes-library', []);
  const qrRef = useRef<any | null>(null);
  const [openSections, setOpenSections] = useState({ content: true, templates: true, colors: true, errorCorrection: true, shape: true, finders: false, logo: false });
  const [activeContentType, setActiveContentType] = useState<ContentType>('url');
  const [autoErrorCorrection, setAutoErrorCorrection] = useState(true);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const templatesRef = useRef<HTMLDivElement>(null);
  
  const [urlData, setUrlData] = useState(DEFAULT_QR_CODE_CONFIG.data);
  const [textData, setTextData] = useState('');
  const [wifiData, setWifiData] = useState({ ssid: '', password: '', encryption: 'WPA', isHidden: false });
  const [emailData, setEmailData] = useState({ address: '', subject: '', body: '' });
  const [vCardData, setVCardData] = useState({ firstName: '', lastName: '', org: '', phone: '', email: '' });
  
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const updateConfig = useCallback(<K extends keyof QRCodeConfig>(key: K, value: QRCodeConfig[K]) => {
    setCurrentConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    let newData = '';
    switch (activeContentType) {
        case 'url': newData = urlData; break;
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
    setCurrentConfig(prev => ({ ...prev, data: newData || ' ', contentType: activeContentType }));
  }, [activeContentType, urlData, textData, wifiData, emailData, vCardData]);

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
    const codeToSave = { ...currentConfig, name };
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
                            {activeContentType === 'url' && <FormInput label="Website URL" id="website-url" value={urlData} onChange={e => setUrlData(e.target.value)} placeholder="https://example.com" />}
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
                <div className="grid grid-cols-4 gap-3">
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

                if (code) {
                    setScannedData(code.data);
                    if (code.data === expectedData.trim()) {
                        setStatus('success');
                    } else {
                        setStatus('error');
                    }
                } else {
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
        }

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
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