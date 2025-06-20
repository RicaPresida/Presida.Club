import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, DollarSign, Shuffle, MessageSquare } from 'lucide-react';
import { usePlanFeatures } from '../../hooks/usePlanFeatures';

const NavigationBar: React.FC = () => {
  const { limits } = usePlanFeatures();
  
  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
    `flex flex-col items-center gap-1 p-2 text-xs font-medium ${
      isActive 
        ? 'text-primary-600 dark:text-primary-400' 
        : 'text-gray-600 dark:text-gray-300'
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-paper border-t dark:border-dark-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-around">
          <NavLink to="/" className={navLinkClass} end>
            <Home className="w-6 h-6" />
            <span>Início</span>
          </NavLink>
          
          <NavLink to="/jogadores" className={navLinkClass}>
            <Users className="w-6 h-6" />
            <span>Jogadores</span>
          </NavLink>
          
          <NavLink to="/financeiro" className={navLinkClass}>
            <DollarSign className="w-6 h-6" />
            <span>Financeiro</span>
          </NavLink>
          
          <NavLink to="/sorteio" className={navLinkClass}>
            <Shuffle className="w-6 h-6" />
            <span>Sorteio</span>
          </NavLink>
          
          {limits.hasResenha && (
            <NavLink to="/resenha" className={navLinkClass}>
              <MessageSquare className="w-6 h-6" />
              <span>Resenha</span>
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;