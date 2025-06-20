// src/components/layout/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { 
  User,
  Sun,
  Moon,
  FolderRoot,
  LogOut,
  X,
  HelpCircle,
  Info,
  Home,
  Users,
  DollarSign,
  Shuffle,
  MessageSquare,
  Bell,
  Crown,
  ArrowUpCircle,
  AlertCircle,
  Clock,
  MapPin,
  Shield,
  Gift
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useSupabase } from '../../contexts/SupabaseContext';
import useSubscriptionStatus from '../../hooks/useSubscriptionStatus';
import { usePlanFeatures } from '../../hooks/usePlanFeatures';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, isMobile = false }) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { supabase } = useSupabase();
  const { isTrialActive, isSubscribed, daysLeftInTrial, subscription } = useSubscriptionStatus();
  const { limits } = usePlanFeatures();
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfile(data);
          setIsAdmin(data.role === 'admin');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [user, supabase]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error during signout:', error);
    }
  };

  const handleProfileClick = () => {
    navigate('/perfil');
    onClose();
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
      isActive 
        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-light'
    }`;

  const getSubscriptionInfo = () => {
    if (isSubscribed) {
      let planName = 'Básico';
      let durationText = '1 mês';
      
      if (subscription?.price_id?.includes('premium')) {
        planName = 'Premium';
        durationText = '36 meses';
      } else if (subscription?.price_id?.includes('professional')) {
        planName = 'Profissional';
        durationText = '12 meses';
      }
      
      // Calculate days left based on subscription end date
      let daysLeft = 0;
      if (subscription?.current_period_end) {
        const endDate = new Date(subscription.current_period_end);
        const now = new Date();
        daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      return {
        type: planName,
        duration: durationText,
        days: daysLeft,
        color: 'bg-primary-500',
        textColor: 'text-primary-600 dark:text-primary-400',
        bgColor: 'bg-primary-100 dark:bg-primary-900/20',
        icon: <Crown className="w-5 h-5" />
      };
    }
    
    if (isTrialActive) {
      return {
        type: 'Trial',
        duration: '21 dias',
        days: daysLeftInTrial,
        color: 'bg-yellow-500',
        textColor: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
        icon: <Clock className="w-5 h-5" />
      };
    }

    return {
      type: 'Expirado',
      duration: '',
      color: 'bg-red-500',
      textColor: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      icon: <AlertCircle className="w-5 h-5" />
    };
  };

  const subscriptionInfo = getSubscriptionInfo();

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-paper">
      {/* Header */}
      <div className="p-4 flex items-center justify-end">
        <button
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-dark-light rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* User Profile */}
      <div className="p-4 flex flex-col">
        <div className="relative w-20 h-20 mb-3">
          <button
            onClick={handleProfileClick}
            className="w-20 h-20 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.nome || ''}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
                <User className="w-10 h-10 text-primary-600 dark:text-primary-400" />
              </div>
            )}
          </button>
        </div>
        <div className="text-left">
          <p className="font-medium text-lg mb-1">{profile?.nome || 'Usuário'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Desde {new Date(user?.created_at || '').toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Subscription Status */}
        <div className="mt-4 p-4 rounded-lg border dark:border-dark-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${subscriptionInfo.bgColor}`}>
                {subscriptionInfo.icon}
              </div>
              <div>
                <p className="font-medium">{subscriptionInfo.type}</p>
                {subscriptionInfo.duration && (
                  <p className="text-sm text-gray-500">
                    {subscriptionInfo.duration}
                  </p>
                )}
                {subscriptionInfo.days && (
                  <p className="text-sm text-gray-500">
                    {subscriptionInfo.days} dias restantes
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar for trial */}
          {isTrialActive && daysLeftInTrial && (
            <div className="mt-2">
              <div className="h-2 bg-gray-200 dark:bg-dark-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 transition-all duration-300"
                  style={{ width: `${(daysLeftInTrial / 21) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* View Plans Button */}
          <Link
            to="/pricing"
            className="btn-outline w-full mt-3 flex items-center justify-center gap-2 text-sm"
            onClick={onClose}
          >
            <ArrowUpCircle className="w-4 h-4" />
            Ver Planos
          </Link>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto">
        {/* Main Features - Only show on desktop */}
        {!isMobile && (
          <nav className="p-4 space-y-1">
            <NavLink to="/" className={navLinkClass} onClick={onClose} end>
              <Home className="w-5 h-5" />
              <span>Início</span>
            </NavLink>

            <NavLink to="/perfil" className={navLinkClass} onClick={onClose}>
              <User className="w-5 h-5" />
              <span>Meu Perfil</span>
            </NavLink>

            <NavLink to="/grupos" className={navLinkClass} onClick={onClose}>
              <FolderRoot className="w-5 h-5" />
              <span>Grupos</span>
            </NavLink>

            <NavLink to="/jogadores" className={navLinkClass} onClick={onClose}>
              <Users className="w-5 h-5" />
              <span>Jogadores</span>
            </NavLink>

            <NavLink to="/financeiro" className={navLinkClass} onClick={onClose}>
              <DollarSign className="w-5 h-5" />
              <span>Financeiro</span>
            </NavLink>

            <NavLink to="/sorteio" className={navLinkClass} onClick={onClose}>
              <Shuffle className="w-5 h-5" />
              <span>Sorteio</span>
            </NavLink>

            {limits.hasResenha && (
              <NavLink to="/resenha" className={navLinkClass} onClick={onClose}>
                <MessageSquare className="w-5 h-5" />
                <span>Resenha</span>
              </NavLink>
            )}

            {isAdmin && (
              <NavLink to="/admin" className={navLinkClass} onClick={onClose}>
                <Shield className="w-5 h-5" />
                <span>Admin</span>
              </NavLink>
            )}
          </nav>
        )}

        {/* Settings Section */}
        <div className="p-4">
          <h3 className="px-4 text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2">
            Configurações
          </h3>
          
          <nav className="space-y-1">
            <NavLink to="/lembretes" className={navLinkClass} onClick={onClose}>
              <Bell className="w-5 h-5" />
              <span>Lembretes</span>
            </NavLink>

            <NavLink to="/recompensas" className={navLinkClass} onClick={onClose}>
              <Gift className="w-5 h-5" />
              <span>Recompensas</span>
            </NavLink>

            <NavLink to="/sobre" className={navLinkClass} onClick={onClose}>
              <Info className="w-5 h-5" />
              <span>Sobre</span>
            </NavLink>

            <NavLink to="/ajuda" className={navLinkClass} onClick={onClose}>
              <HelpCircle className="w-5 h-5" />
              <span>Ajuda</span>
            </NavLink>

            <button
              onClick={toggleTheme}
              className="flex items-center w-full px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-light transition-colors text-gray-600 dark:text-gray-300"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-5 h-5 mr-2" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-5 h-5 mr-2" />
                  <span>Modo Escuro</span>
                </>
              )}
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-2" />
              <span>Sair</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;