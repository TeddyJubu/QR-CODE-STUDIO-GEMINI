import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeConfig, ContentType, DotType, CornerSquareType, CornerDotType } from './types';
import { DEFAULT_QR_CODE_CONFIG, DOT_STYLES, CORNER_SQUARE_STYLES, CORNER_DOT_STYLES } from './constants';
import useLocalStorage from './hooks/useLocalStorage';
import QRCodePreview from './components/QRCodePreview';
import { 
    DownloadIcon, SaveIcon, LogoIcon, LinkIcon, TextIcon, WifiIcon, 
    VCardIcon, EmailIcon, HistoryIcon, TemplatesIcon, SettingsIcon, 
    SunIcon, ChevronUpIcon, ChevronDownIcon, MaterialIcon
} from './components/icons';

const App: React.FC = () => {
  const [currentConfig, setCurrentConfig] = useState<QRCodeConfig>({
    ...DEFAULT_QR_CODE_CONFIG,
    id: `qr-${Date.now()}`,
    name: 'New QR Code',
  });
  const [savedQRCodes, setSavedQRCodes] = useLocalStorage<QRCodeConfig[]>('qr-codes-library', []);
  const qrRef = useRef<any | null>(null);
  const [stylingOptionsOpen, setStylingOptionsOpen] = useState(true);
  const [activeContentType, setActiveContentType] = useState<ContentType>('url');

  const [urlData, setUrlData] = useState(DEFAULT_QR_CODE_CONFIG.data);
  const [textData, setTextData] = useState('');
  const [wifiData, setWifiData] = useState({ ssid: '', password: '', encryption: 'WPA', isHidden: false });
  const [emailData, setEmailData] = useState({ address: '', subject: '', body: '' });
  const [vCardData, setVCardData] = useState({ firstName: '', lastName: '', org: '', phone: '', email: '' });

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


  const updateConfig = <K extends keyof QRCodeConfig>(key: K, value: QRCodeConfig[K]) => {
    setCurrentConfig(prev => ({ ...prev, [key]: value }));
  };
  
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

  return (
    <div className="flex flex-col lg:flex-row h-screen font-sans">
        <div className="w-full lg:w-3/5 p-6 lg:p-8 overflow-y-auto space-y-6">
            <Header />
            <ContentTypeTabs activeType={activeContentType} onTypeChange={setActiveContentType} />
            <GlassCard>
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
            <GlassCard isCollapsible isOpen={stylingOptionsOpen} setIsOpen={setStylingOptionsOpen} title="Styling Options">
                <div className="space-y-6">
                    <ColorControls fgColor={currentConfig.fgColor} bgColor={currentConfig.bgColor} onFgColorChange={(c) => updateConfig('fgColor', c)} onBgColorChange={(c) => updateConfig('bgColor', c)} />
                    <SegmentedControl label="Dot Style" options={DOT_STYLES} value={currentConfig.dotType} onChange={(v) => updateConfig('dotType', v as DotType)} gridCols="grid-cols-3 sm:grid-cols-6" />
                    <SegmentedControl label="Corner Square Style" options={CORNER_SQUARE_STYLES} value={currentConfig.cornerSquareType} onChange={(v) => updateConfig('cornerSquareType', v as CornerSquareType)} gridCols="grid-cols-3" />
                    <SegmentedControl label="Corner Dot Style" options={CORNER_DOT_STYLES} value={currentConfig.cornerDotType} onChange={(v) => updateConfig('cornerDotType', v as CornerDotType)} gridCols="grid-cols-2" />
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
                    <motion.div 
                        key={currentConfig.id + JSON.stringify(currentConfig)} 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        transition={{ duration: 0.3 }}
                        className="rounded-lg"
                    >
                        <QRCodePreview config={currentConfig} qrRef={qrRef} />
                    </motion.div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 mb-6 text-sm">
                    <h3 className="font-semibold text-white mb-3">QR Code Details</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between"><span className="text-gray-400">Type:</span> <span className="font-medium text-white capitalize">{currentConfig.contentType}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Size:</span> <span className="font-medium text-white">256x256px</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Error Correction:</span> <span className="font-medium text-white">M</span></div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <ActionButton onClick={() => handleDownload('png')} icon={<DownloadIcon />} text="PNG" isPrimary />
                    <ActionButton onClick={() => handleDownload('jpeg')} text="JPEG" />
                    <ActionButton onClick={() => handleDownload('svg')} text="SVG" />
                </div>
                <button onClick={handleSave} className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium rounded-xl text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors">
                    <SaveIcon /> <span>Save QR Code</span>
                </button>
            </div>
        </div>
    </div>
  );
};

// --- Re-styled Components ---

const Header: React.FC = () => (
    <header className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
            <LogoIcon />
            <div>
                <h1 className="text-xl font-bold text-white">QR Code Generator</h1>
                <p className="text-sm text-gray-400">Create custom QR codes instantly</p>
            </div>
        </div>
        <div className="flex items-center space-x-2">
            <GlassButton><HistoryIcon /></GlassButton>
            <GlassButton><TemplatesIcon /></GlassButton>
            <GlassButton><SettingsIcon /></GlassButton>
        </div>
    </header>
);

const GlassButton: React.FC<{ children: React.ReactNode; onClick?: () => void;}> = ({ children, onClick }) => (
    <button onClick={onClick} className="p-2 rounded-xl text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
        {children}
    </button>
);

const GlassCard: React.FC<{ title?: string; children: React.ReactNode; isCollapsible?: boolean; isOpen?: boolean; setIsOpen?: (isOpen: boolean) => void; }> = ({ title, children, isCollapsible, isOpen, setIsOpen }) => (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
        {title && (
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-semibold text-white">{title}</h3>
                {isCollapsible && setIsOpen && (
                    <button onClick={() => setIsOpen(!isOpen)} className="p-1 text-gray-400 hover:text-white">
                        <motion.div animate={{ rotate: isOpen ? 0 : -180 }} transition={{ duration: 0.3 }}>
                           {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        </motion.div>
                    </button>
                )}
            </div>
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


const contentTypes: { id: ContentType, label: string, icon: React.ReactNode }[] = [ { id: 'url', label: 'URL', icon: <LinkIcon /> }, { id: 'text', label: 'Text', icon: <TextIcon /> }, { id: 'wifi', label: 'WiFi', icon: <WifiIcon /> }, { id: 'vcard', label: 'vCard', icon: <VCardIcon /> }, { id: 'email', label: 'Email', icon: <EmailIcon /> },]
const ContentTypeTabs: React.FC<{activeType: ContentType; onTypeChange: (type: ContentType) => void;}> = ({ activeType, onTypeChange }) => (
    <div className="flex space-x-1 p-1 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
        {contentTypes.map(({ id, label, icon }) => (
            <button key={id} onClick={() => onTypeChange(id)} className={`relative flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${ activeType !== id ? 'text-gray-300 hover:bg-white/10' : ''}`}>
                {activeType === id && <motion.div layoutId="active-content-type" className="absolute inset-0 bg-white/10 rounded-lg" />}
                <span className="relative z-10">{icon}</span>
                <span className="relative z-10">{label}</span>
            </button>
        ))}
    </div>
);

const DynamicQRControl: React.FC<{isDynamic: boolean; onChange: (isDynamic: boolean) => void;}> = ({ isDynamic, onChange }) => (
    <div className="flex items-center justify-between">
        <div>
            <h4 className="font-semibold text-white">Dynamic QR Code</h4>
            <p className="text-sm text-gray-400">Create a QR code you can update later</p>
        </div>
        <button onClick={() => onChange(!isDynamic)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isDynamic ? 'bg-indigo-500' : 'bg-white/10'}`}>
            <motion.span layout className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform m-1 ${isDynamic ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; }> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <input id={id} {...props} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition text-white placeholder:text-gray-500" />
    </div>
);

const FormTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; id: string; }> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <textarea id={id} {...props} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition text-white placeholder:text-gray-500" />
    </div>
);

const FormCheckbox: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; }> = ({ label, id, ...props }) => (
    <div className="flex items-center">
        <input type="checkbox" id={id} {...props} className="h-4 w-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-600 bg-gray-900/50" />
        <label htmlFor={id} className="ml-2 block text-sm text-gray-300">{label}</label>
    </div>
);

const ColorControls: React.FC<{ fgColor: string; bgColor: string; onFgColorChange: (c: string) => void; onBgColorChange: (c: string) => void; }> = ({ fgColor, bgColor, onFgColorChange, onBgColorChange }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Colors</label>
        <div className="flex space-x-4">
            <ColorInput label="Foreground" color={fgColor} onChange={onFgColorChange} />
            <ColorInput label="Background" color={bgColor} onChange={onBgColorChange} />
        </div>
    </div>
);

const ColorInput: React.FC<{ label: string; color: string; onChange: (c: string) => void }> = ({ label, color, onChange }) => (
    <div className="flex-1">
        <span className="text-xs text-gray-400">{label}</span>
        <div className="flex items-center space-x-2 mt-1 w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 relative">
            <input type="color" value={color} onChange={e => onChange(e.target.value)} className="absolute w-6 h-6 rounded-md opacity-0 cursor-pointer"/>
            <div style={{backgroundColor: color}} className="w-6 h-6 rounded-md border border-white/10"></div>
            <span className="text-sm font-mono text-gray-300">{color.toUpperCase()}</span>
        </div>
    </div>
);

const SegmentedControl = <T extends string>({ label, options, value, onChange, gridCols }: { label:string; options: {value: T, label: string}[]; value: T; onChange: (value: T) => void; gridCols?: string; }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
        <div className={`grid ${gridCols || 'grid-cols-3'} gap-2`}>
            {options.map(option => (
                <button key={option.value} onClick={() => onChange(option.value)} className={`py-2 px-3 text-sm rounded-lg transition-colors ${value === option.value ? 'bg-indigo-500/50 text-white border border-indigo-500/70' : 'text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10'}`}>
                    {option.label}
                </button>
            ))}
        </div>
    </div>
);

const ActionButton: React.FC<{ icon?: React.ReactNode; text: string; onClick: () => void; isPrimary?: boolean }> = ({ icon, text, onClick, isPrimary }) => (
    <button onClick={onClick} className={`py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-transform transform hover:scale-105 ${isPrimary ? 'bg-indigo-600/80 text-white hover:bg-indigo-600 border border-indigo-500/70' : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'}`}>
        {icon} <span>{text}</span>
    </button>
);

export default App;