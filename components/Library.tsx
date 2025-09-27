
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeConfig } from '../types';
import { DynamicIcon, TrashIcon } from './icons';

interface LibraryProps {
  savedQRCodes: QRCodeConfig[];
  onLoad: (id: string) => void;
  onDelete: (id:string) => void;
}

const Library: React.FC<LibraryProps> = ({ savedQRCodes, onLoad, onDelete }) => {
  if (savedQRCodes.length === 0) {
    return (
      <div className="mt-12 text-center text-gray-500">
        <p>Your saved QR codes will appear here.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-3">
        <AnimatePresence>
            {savedQRCodes.map((qr) => (
            <motion.div
                key={qr.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="group flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:bg-gray-800 transition-colors duration-200"
            >
                <button onClick={() => onLoad(qr.id)} className="flex-grow text-left">
                    <div className="flex items-center gap-3">
                        {qr.isDynamic && <DynamicIcon className="text-gray-400" />}
                        <span className="font-medium truncate" title={qr.name}>{qr.name}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-1" title={qr.data}>{qr.data}</p>
                </button>
                <motion.button
                    onClick={() => onDelete(qr.id)}
                    className="p-2 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    whileTap={{ scale: 0.9 }}
                >
                    <TrashIcon className="w-4 h-4" />
                </motion.button>
            </motion.div>
            ))}
      </AnimatePresence>
    </div>
  );
};

export default Library;
