import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Trophy, Star, Heart } from 'lucide-react';

interface Step {
  title: string;
  description: string;
  element?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showWelcome?: boolean;
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps: Step[] = [
  {
    title: 'Bem-vindo ao Presida.Club!',
    description: 'Estamos muito felizes em ter você aqui! O Presida.Club é a plataforma perfeita para gerenciar seu time de futebol de forma simples e eficiente. Vamos te mostrar como tirar o máximo proveito de todas as funcionalidades.',
    showWelcome: true
  },
  {
    title: 'Grupos',
    description: 'Crie e gerencie seus grupos de futebol. Você pode ter múltiplos grupos e alternar entre eles facilmente.',
    element: '[href="/grupos"]',
    position: 'right'
  },
  {
    title: 'Jogadores',
    description: 'Cadastre seus jogadores, defina características, posições e mantenha um histórico completo.',
    element: '[href="/jogadores"]',
    position: 'right'
  },
  {
    title: 'Financeiro',
    description: 'Controle mensalidades, despesas e receitas. Gere relatórios e mantenha as finanças em dia.',
    element: '[href="/financeiro"]',
    position: 'right'
  },
  {
    title: 'Sorteio de Times',
    description: 'Monte times equilibrados automaticamente considerando nível e posição dos jogadores.',
    element: '[href="/sorteio"]',
    position: 'right'
  },
  {
    title: 'Resenha',
    description: 'Organize os gastos da resenha e divida as despesas entre os participantes.',
    element: '[href="/resenha"]',
    position: 'right'
  },
  {
    title: 'Lembretes',
    description: 'Configure lembretes automáticos para jogos e eventos do seu grupo.',
    element: '[href="/lembretes"]',
    position: 'right'
  },
  {
    title: 'Pronto!',
    description: 'Agora você já sabe como usar o Presida.Club. Você pode rever este tour a qualquer momento na página Sobre.',
  }
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const step = steps[currentStep];
      if (step.element) {
        const element = document.querySelector(step.element);
        if (element) {
          const rect = element.getBoundingClientRect();
          const boxWidth = 400;
          const boxHeight = 200;
          let top = 0;
          let left = 0;

          switch (step.position) {
            case 'right':
              top = rect.top + window.scrollY + (rect.height / 2) - (boxHeight / 2);
              left = rect.right + window.scrollX + 20;
              break;
            case 'left':
              top = rect.top + window.scrollY + (rect.height / 2) - (boxHeight / 2);
              left = rect.left + window.scrollX - boxWidth - 20;
              break;
            case 'top':
              top = rect.top + window.scrollY - boxHeight - 20;
              left = rect.left + window.scrollX + (rect.width / 2) - (boxWidth / 2);
              break;
            case 'bottom':
            default:
              top = rect.bottom + window.scrollY + 20;
              left = rect.left + window.scrollX + (rect.width / 2) - (boxWidth / 2);
          }

          // Keep box within viewport
          top = Math.max(20, Math.min(top, window.innerHeight - boxHeight - 20));
          left = Math.max(20, Math.min(left, window.innerWidth - boxWidth - 20));

          setPosition({ top, left });

          // Scroll element into view if needed
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        // Center the box for steps without elements
        setPosition({
          top: window.innerHeight / 2 - 100,
          left: window.innerWidth / 2 - 200
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [currentStep, isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div 
        className="absolute bg-white dark:bg-dark-paper rounded-lg shadow-xl p-6 w-[400px]"
        style={{ 
          top: position.top,
          left: position.left,
          transform: 'none'
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-2 hover:bg-gray-100 dark:hover:bg-dark-light rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {currentStepData.showWelcome ? (
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Trophy className="w-12 h-12 text-primary-500" />
            </div>
            <h3 className="text-2xl font-bold mb-4">{currentStepData.title}</h3>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-400 fill-current" />
              <Star className="w-5 h-5 text-yellow-400 fill-current" />
              <Star className="w-5 h-5 text-yellow-400 fill-current" />
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              {currentStepData.description}
            </p>
            <div className="flex items-center justify-center mt-4">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <h3 className="text-lg font-bold mb-2">{currentStepData.title}</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {currentStepData.description}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t dark:border-dark-border">
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-primary-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="btn-outline"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </button>
            )}
            <button
              onClick={handleNext}
              className="btn-primary"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Concluir
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;