import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeConfig, ContentType, DotType, CornerSquareType, CornerDotType } from './types';
import { DEFAULT_QR_CODE_CONFIG, DOT_STYLES, CORNER_SQUARE_STYLES, CORNER_DOT_STYLES } from './constants';
import useLocalStorage from './hooks/useLocalStorage';
import QRCodePreview from './components/QRCodePreview';
import { 
    DownloadIcon, SaveIcon, LogoIcon, LinkIcon, TextIcon, WifiIcon, 
    VCardIcon, EmailIcon, HistoryIcon, TemplatesIcon, SettingsIcon, 
    SunIcon, ChevronUpIcon 
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

  // State for each content type's form
  const [urlData, setUrlData] = useState(DEFAULT_QR_CODE_CONFIG.data);
  const [textData, setTextData] = useState('');
  const [wifiData, setWifiData] = useState({ ssid: '', password: '', encryption: 'WPA', isHidden: false });
  const [emailData, setEmailData] = useState({ address: '', subject: '', body: '' });
  const [vCardData, setVCardData] = useState({ firstName: '', lastName: '', org: '', phone: '', email: '' });

  useEffect(() => {
    let newData = '';
    switch (activeContentType) {
        case 'url':
            newData = urlData;
            break;
        case 'text':
            newData = textData;
            break;
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
    setCurrentConfig(prev => ({ ...prev, data: newData, contentType: activeContentType }));
  }, [activeContentType, urlData, textData, wifiData, emailData, vCardData]);


  const updateConfig = <K extends keyof QRCodeConfig>(key: K, value: QRCodeConfig[K]) => {
    setCurrentConfig(prev => ({ ...prev, [key]: value }));
  };
  
  const handleSave = () => {
    const existingIndex = savedQRCodes.findIndex(qr => qr.id === currentConfig.id);
    let name = currentConfig.name;
    if (name === 'New QR Code' || !name) {
        switch(currentConfig.contentType) {
            case 'url':
                name = currentConfig.data.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] || 'URL Code';
                break;
            case 'text':
                name = currentConfig.data.substring(0, 20) || 'Text Code';
                if(currentConfig.data.length > 20) name += '...';
                break;
            default:
                name = `${currentConfig.contentType.charAt(0).toUpperCase() + currentConfig.contentType.slice(1)} Code`;
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
    <div className="min-h-screen bg-[#161b22] text-gray-300">
        <Header onSave={handleSave} />
        <main className="p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-screen-2xl mx-auto">
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <Card title="Content">
                        <ContentTypeTabs activeType={activeContentType} onTypeChange={setActiveContentType} />
                        <div className="mt-6">
                            <DynamicQRControl
                                isDynamic={currentConfig.isDynamic}
                                onChange={(val) => updateConfig('isDynamic', val)}
                            />
                        </div>
                        <div className="mt-4">
                           <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeContentType}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-4"
                                >
                                    {activeContentType === 'url' && (
                                        <FormInput label="Website URL" id="website-url" value={urlData} onChange={e => setUrlData(e.target.value)} placeholder="https://example.com" />
                                    )}
                                    {activeContentType === 'text' && (
                                        <FormTextarea label="Text" id="text" value={textData} onChange={e => setTextData(e.target.value)} placeholder="Enter your text" />
                                    )}
                                    {activeContentType === 'wifi' && (
                                        <div className="space-y-4">
                                            <FormInput label="Network SSID" id="wifi-ssid" value={wifiData.ssid} onChange={e => setWifiData(d => ({...d, ssid: e.target.value}))} />
                                            <FormInput label="Password" id="wifi-password" type="password" value={wifiData.password} onChange={e => setWifiData(d => ({...d, password: e.target.value}))} />
                                            <FormSelect label="Encryption" id="wifi-encryption" value={wifiData.encryption} onChange={e => setWifiData(d => ({...d, encryption: e.target.value}))}>
                                                <option>WPA</option>
                                                <option>WEP</option>
                                                <option value="nopass">None</option>
                                            </FormSelect>
                                            <FormCheckbox label="Hidden Network" id="wifi-hidden" checked={wifiData.isHidden} onChange={e => setWifiData(d => ({...d, isHidden: e.target.checked}))} />
                                        </div>
                                    )}
                                    {activeContentType === 'email' && (
                                        <div className="space-y-4">
                                            <FormInput label="Email Address" id="email-address" type="email" value={emailData.address} onChange={e => setEmailData(d => ({...d, address: e.target.value}))} placeholder="recipient@example.com" />
                                            <FormInput label="Subject" id="email-subject" value={emailData.subject} onChange={e => setEmailData(d => ({...d, subject: e.target.value}))} />
                                            <FormTextarea label="Body" id="email-body" value={emailData.body} onChange={e => setEmailData(d => ({...d, body: e.target.value}))} rows={4} />
                                        </div>
                                    )}
                                     {activeContentType === 'vcard' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormInput label="First Name" id="vcard-fn" value={vCardData.firstName} onChange={e => setVCardData(d => ({...d, firstName: e.target.value}))} />
                                            <FormInput label="Last Name" id="vcard-ln" value={vCardData.lastName} onChange={e => setVCardData(d => ({...d, lastName: e.target.value}))} />
                                            <div className="sm:col-span-2">
                                                <FormInput label="Organization" id="vcard-org" value={vCardData.org} onChange={e => setVCardData(d => ({...d, org: e.target.value}))} />
                                            </div>
                                            <FormInput label="Phone" id="vcard-phone" type="tel" value={vCardData.phone} onChange={e => setVCardData(d => ({...d, phone: e.target.value}))} />
                                            <FormInput label="Email" id="vcard-email" type="email" value={vCardData.email} onChange={e => setVCardData(d => ({...d, email: e.target.value}))} />
                                        </div>
                                    )}
                                </motion.div>
                           </AnimatePresence>
                        </div>
                    </Card>
                    <Card 
                        title="Styling Options" 
                        isCollapsible 
                        isOpen={stylingOptionsOpen} 
                        setIsOpen={setStylingOptionsOpen}
                    >
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-medium text-gray-300 mb-3">Colors</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <ColorInput label="Foreground Color" value={currentConfig.fgColor} onChange={(e) => updateConfig('fgColor', e.target.value)} />
                                    <ColorInput label="Background Color" value={currentConfig.bgColor} onChange={(e) => updateConfig('bgColor', e.target.value)} />
                                </div>
                            </div>
                             <div>
                                <h4 className="text-sm font-medium text-gray-300 mb-3">Dot Style</h4>
                                <SegmentedControl
                                    name="dot-style"
                                    options={DOT_STYLES}
                                    value={currentConfig.dotType}
                                    onChange={(val) => updateConfig('dotType', val as DotType)}
                                    gridCols="grid-cols-3 sm:grid-cols-6"
                                />
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-300 mb-3">Corner Square Style</h4>
                                <SegmentedControl
                                    name="corner-square-style"
                                    options={CORNER_SQUARE_STYLES}
                                    value={currentConfig.cornerSquareType}
                                    onChange={(val) => updateConfig('cornerSquareType', val as CornerSquareType)}
                                    gridCols="grid-cols-3"
                                />
                            </div>
                             <div>
                                <h4 className="text-sm font-medium text-gray-300 mb-3">Corner Dot Style</h4>
                                <SegmentedControl
                                    name="corner-dot-style"
                                    options={CORNER_DOT_STYLES}
                                    value={currentConfig.cornerDotType}
                                    onChange={(val) => updateConfig('cornerDotType', val as CornerDotType)}
                                    gridCols="grid-cols-2"
                                />
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-2 row-start-1 lg:row-start-auto">
                    <div className="sticky top-8 bg-[#21262d] border border-gray-700/50 rounded-xl shadow-lg">
                       <div className="p-6 border-b border-gray-700/50">
                            <h2 className="text-lg font-bold text-white">Live Preview</h2>
                            <p className="text-sm text-gray-400">Your QR code updates automatically</p>
                       </div>
                       <div className="p-6 flex flex-col items-center justify-center gap-6">
                            <div className="border-2 border-dashed border-gray-600 rounded-lg p-1 bg-white">
                                <motion.div
                                    key={currentConfig.id + currentConfig.data}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <QRCodePreview config={currentConfig} qrRef={qrRef} />
                                </motion.div>
                            </div>
                            <div className="w-full max-w-sm bg-gray-800/40 rounded-lg p-4 text-sm">
                                <h3 className="font-semibold text-white mb-3">QR Code Details</h3>
                                <div className="space-y-2 text-gray-400">
                                    <div className="flex justify-between"><span>Type:</span> <span className="font-medium text-gray-200 capitalize">{currentConfig.contentType}</span></div>
                                    <div className="flex justify-between"><span>Size:</span> <span className="font-medium text-gray-200">256x256px</span></div>
                                    <div className="flex justify-between"><span>Error Correction:</span> <span className="font-medium text-gray-200">M</span></div>
                                </div>
                            </div>
                            <div className="w-full max-w-sm grid grid-cols-3 gap-3">
                                 <ActionButton onClick={() => handleDownload('png')} text="PNG" icon={<DownloadIcon className="w-4 h-4" />} className="bg-indigo-600 hover:bg-indigo-700 text-white"/>
                                 <ActionButton onClick={() => handleDownload('jpeg')} text="JPEG" className="bg-gray-700 hover:bg-gray-600" />
                                 <ActionButton onClick={() => handleDownload('svg')} text="SVG" className="bg-gray-700 hover:bg-gray-600" />
                            </div>
                       </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
  );
};

const Header: React.FC<{ onSave: () => void }> = ({ onSave }) => (
    <header className="bg-[#21262d]/80 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-4">
                    <LogoIcon className="w-8 h-8"/>
                    <div>
                        <h1 className="text-lg font-bold text-white">QR Code Generator</h1>
                        <p className="text-sm text-gray-400">Create custom QR codes instantly</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <HeaderButton onClick={onSave} icon={<SaveIcon className="w-4 h-4"/>} text="Save QR Code" />
                    <HeaderButton icon={<HistoryIcon className="w-4 h-4"/>} text="History" />
                    <HeaderButton icon={<TemplatesIcon className="w-4 h-4"/>} text="Templates" />
                    <IconButton><SettingsIcon /></IconButton>
                    <IconButton><SunIcon /></IconButton>
                </div>
            </div>
        </div>
    </header>
);

const HeaderButton: React.FC<{ icon: React.ReactNode; text: string; onClick?: () => void;}> = ({ icon, text, onClick }) => (
    <button onClick={onClick} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 border border-gray-600/80 rounded-md text-sm font-medium transition-colors">
        {icon}
        <span>{text}</span>
    </button>
);

const IconButton: React.FC<{ children: React.ReactNode; onClick?: () => void; }> = ({ children, onClick }) => (
    <button onClick={onClick} className="w-8 h-8 flex items-center justify-center bg-gray-700/50 hover:bg-gray-700 border border-gray-600/80 rounded-md transition-colors">
        {children}
    </button>
);


const Card: React.FC<{ title: string; children: React.ReactNode; isCollapsible?: boolean; isOpen?: boolean; setIsOpen?: (isOpen: boolean) => void; }> = ({ title, children, isCollapsible, isOpen, setIsOpen }) => (
    <div className="bg-[#21262d] border border-gray-700/50 rounded-xl shadow-lg">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-700/50">
            <h3 className="text-lg font-bold text-white">{title}</h3>
            {isCollapsible && setIsOpen && (
                 <button onClick={() => setIsOpen(!isOpen)} className="p-1 text-gray-400 hover:text-white">
                    <motion.div animate={{ rotate: isOpen ? 0 : 180 }}>
                        <ChevronUpIcon className="w-6 h-6" />
                    </motion.div>
                </button>
            )}
        </div>
        <AnimatePresence initial={false}>
            {(!isCollapsible || isOpen) && (
                <motion.div
                    key="content"
                    initial="collapsed"
                    animate="open"
                    exit="collapsed"
                    variants={{
                        open: { opacity: 1, height: 'auto' },
                        collapsed: { opacity: 0, height: 0 }
                    }}
                    transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                    className="overflow-hidden"
                >
                    <div className="p-4 sm:p-5">{children}</div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

const contentTypes: { id: ContentType, label: string, icon: React.ReactNode }[] = [
    { id: 'url', label: 'URL', icon: <LinkIcon className="w-4 h-4"/> },
    { id: 'text', label: 'Text', icon: <TextIcon className="w-4 h-4"/> },
    { id: 'wifi', label: 'WiFi', icon: <WifiIcon className="w-4 h-4"/> },
    { id: 'vcard', label: 'vCard', icon: <VCardIcon className="w-4 h-4"/> },
    { id: 'email', label: 'Email', icon: <EmailIcon className="w-4 h-4"/> },
]

const ContentTypeTabs: React.FC<{activeType: ContentType; onTypeChange: (type: ContentType) => void;}> = ({ activeType, onTypeChange }) => (
    <div className="flex flex-wrap gap-2">
        {contentTypes.map(({ id, label, icon }) => (
            <button
                key={id}
                onClick={() => onTypeChange(id)}
                className={`relative px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${
                    activeType === id 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-700/60 text-gray-300 hover:bg-gray-700'
                }`}
            >
                {icon} {label}
            </button>
        ))}
    </div>
);

const DynamicQRControl: React.FC<{isDynamic: boolean; onChange: (isDynamic: boolean) => void;}> = ({ isDynamic, onChange }) => (
    <div className="flex items-center justify-between bg-gray-800/40 rounded-lg p-4">
        <div>
            <h4 className="font-semibold text-white">Dynamic QR Code</h4>
            <p className="text-sm text-gray-400">Create a dynamic QR code that you can update later without reprinting</p>
        </div>
        <button
            onClick={() => onChange(!isDynamic)}
            className={`w-12 h-6 rounded-full flex items-center transition-colors duration-300 ${isDynamic ? 'bg-indigo-600 justify-end' : 'bg-gray-600 justify-start'}`}
        >
            <motion.div layout className="w-5 h-5 bg-white rounded-full m-0.5" />
        </button>
    </div>
);

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; }> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
        <input id={id} {...props} className="w-full bg-[#2d333b] border border-gray-700/80 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" />
    </div>
);

const FormTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; id: string; }> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
        <textarea id={id} {...props} className="w-full bg-[#2d333b] border border-gray-700/80 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" />
    </div>
);

const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string; }> = ({ label, id, children, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
        <select id={id} {...props} className="w-full bg-[#2d333b] border border-gray-700/80 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none appearance-none">{children}</select>
    </div>
);

const FormCheckbox: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; }> = ({ label, id, ...props }) => (
    <div className="flex items-center gap-2">
        <input type="checkbox" id={id} {...props} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-600" />
        <label htmlFor={id} className="text-sm font-medium text-gray-300">{label}</label>
    </div>
);


const ColorInput: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium mb-2 text-gray-300">{label}</label>
        <div className="flex items-center bg-[#2d333b] border border-gray-700/80 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
            <div className="relative w-12 h-12 flex-shrink-0">
                <input type="color" value={value} onChange={onChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div style={{ backgroundColor: value }} className="w-full h-full" />
            </div>
            <input type="text" value={value} onChange={onChange} className="w-full bg-transparent p-3 outline-none" />
        </div>
    </div>
);


const SegmentedControl = <T extends string>({ name, options, value, onChange, gridCols }: { name: string; options: {value: T, label: string}[]; value: T; onChange: (value: T) => void; gridCols?: string; }) => {
    return (
        <div className={`w-full bg-gray-800/40 rounded-lg p-1 grid ${gridCols || 'grid-cols-3'} gap-1`}>
            {options.map(option => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`relative w-full text-center text-sm font-medium py-2 rounded-md transition-colors ${
                        value === option.value ? 'text-white' : 'text-gray-400 hover:bg-gray-700/50'
                    }`}
                >
                    {value === option.value && (
                        <motion.div
                            layoutId={`active-style-pill-${name}`}
                            className="absolute inset-0 bg-gray-700 rounded-md"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                    )}
                    <span className="relative z-10">{option.label}</span>
                </button>
            ))}
        </div>
    );
}

const ActionButton: React.FC<{ icon?: React.ReactNode; text: string; onClick: () => void; className?: string; }> = ({ icon, text, onClick, className }) => (
    <motion.button
        onClick={onClick}
        className={`w-full flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-lg transition-all duration-200 ${className}`}
        whileTap={{ scale: 0.97 }}
    >
        {icon}
        {text}
    </motion.button>
);


export default App;
