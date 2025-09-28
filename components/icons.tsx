import React from 'react';

export const MaterialIcon = ({ name, className = 'text-xl' }: { name: string; className?: string }) => (
    <span className={`material-icons ${className}`}>{name}</span>
);

export const LogoIcon = ({ className = '' }: { className?: string }) => (
    <div className={`flex items-center justify-center bg-indigo-600/30 p-2 rounded-xl border border-indigo-500/50 ${className}`}>
        <MaterialIcon name="qr_code_2" className="!text-2xl text-indigo-300" />
    </div>
);

// Icons for Content Types
export const LinkIcon = () => <MaterialIcon name="link" />;
export const TextIcon = () => <MaterialIcon name="title" />;
export const WifiIcon = () => <MaterialIcon name="wifi" />;
export const VCardIcon = () => <MaterialIcon name="badge" />;
export const EmailIcon = () => <MaterialIcon name="email" />;

// Icons for Header/Actions
export const HistoryIcon = () => <MaterialIcon name="history" />;
export const AccountIcon = () => <MaterialIcon name="account_circle" />;
export const SaveIcon = () => <MaterialIcon name="save" />;
export const DownloadIcon = () => <MaterialIcon name="download" />;
export const CameraIcon = () => <MaterialIcon name="camera" />;
// FIX: Update InfoIcon to accept a className prop. This allows overriding default styles.
export const InfoIcon = ({ className = '!text-base' }: { className?: string }) => <MaterialIcon name="help_outline" className={className} />;
export const UploadIcon = () => <MaterialIcon name="upload" className="!text-base" />;
export const RemoveIcon = () => <MaterialIcon name="close" className="!text-base" />;


// Icons for UI
export const ChevronUpIcon = () => <MaterialIcon name="expand_less" />;
export const ChevronDownIcon = () => <MaterialIcon name="expand_more" />;


// Icons for Library
export const DynamicIcon = ({ className = 'w-5 h-5' }: { className?: string }) => <MaterialIcon name="bolt" className={className} />;
export const TrashIcon = ({ className = 'w-5 h-5' }: { className?: string }) => <MaterialIcon name="delete" className={className} />;