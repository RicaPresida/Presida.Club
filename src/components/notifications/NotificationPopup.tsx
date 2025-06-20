import React, { useEffect, useState } from 'react';
import { X, Bell } from 'lucide-react';

interface NotificationProps {
  id: string;
  title: string;
  message?: string;
  onClose: (id: string) => void;
}

const NotificationPopup: React.FC<NotificationProps> = ({ id, title, message, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300); // Wait for animation to complete
  };

  return (
    <div
      className={`
        w-full max-w-[calc(100vw-2rem)] sm:w-96 bg-white dark:bg-dark-paper rounded-lg shadow-lg border dark:border-dark-border
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex-shrink-0">
            <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium mb-1 truncate">{title}</h3>
            {message && (
              <p className="text-sm text-gray-600 dark:text-gray-400 break-words line-clamp-2">{message}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-dark-light rounded-full transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPopup;