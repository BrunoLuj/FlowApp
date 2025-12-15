import React, { useEffect } from 'react';

const Modal = ({ children, onClose }) => {
    // Zatvaranje na ESC
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity"
            onClick={onClose} // klik na overlay zatvara modal
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative transform transition-transform duration-300 scale-95 hover:scale-100"
                onClick={(e) => e.stopPropagation()} // sprječava zatvaranje pri kliku unutar modala
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-lg font-bold"
                >
                    &times;
                </button>
                {children}
            </div>
        </div>
    );
};

export default Modal;
