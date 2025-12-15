import React, { useEffect } from 'react';
import PropTypes from 'prop-types'; // Add PropTypes for better validation

const Modal = ({ children, onClose }) => {
    // Zatvaranje modala kada pritisneš ESC
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };

        // Dodavanje listenera na ESC
        window.addEventListener('keydown', handleEsc);

        // Čišćenje listenera prilikom unmount-a
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
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

// PropTypes validation for better maintainability and safety
Modal.propTypes = {
    children: PropTypes.node.isRequired,  // children is required and can be any renderable node
    onClose: PropTypes.func.isRequired,   // onClose is a required function
};

export default Modal;
