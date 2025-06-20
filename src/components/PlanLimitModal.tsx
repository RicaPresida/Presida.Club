import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

interface PlanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  showUpgradeButton?: boolean;
}

const PlanLimitModal: React.FC<PlanLimitModalProps> = ({ 
  isOpen, 
  onClose, 
  message,
  showUpgradeButton = true
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-dark-paper rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-400 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h3 className="text-lg font-bold">Limite do Plano Atingido</h3>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {message}
          </p>

          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="btn-outline"
            >
              Fechar
            </button>
            {showUpgradeButton && (
              <button
                onClick={() => {
                  onClose();
                  navigate('/pricing');
                }}
                className="btn-primary"
              >
                Fazer Upgrade
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanLimitModal;