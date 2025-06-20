import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import NavigationBar from './NavigationBar';
import MatchTimer from '../timer/MatchTimer';
import OnboardingTour from '../onboarding/OnboardingTour';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useAuth } from '../../hooks/useAuth';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { supabase } = useSupabase();
  const { user } = useAuth();

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      if (data && !data.onboarding_completed) {
        setShowOnboarding(true);
      }
    };

    checkOnboarding();
  }, [user, supabase]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setShowInstallPrompt(false);
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };

  const handleCloseOnboarding = async () => {
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id);

    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen flex dark:bg-dark">
      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Only visible on desktop */}
      <div className="hidden lg:block">
        <Sidebar open={true} onClose={() => {}} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top navbar */}
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Bottom navigation - Only visible on mobile */}
        <div className="lg:hidden">
          <NavigationBar />
        </div>
      </div>

      {/* Mobile Sidebar - Only show settings and other options */}
      <div className="lg:hidden">
        <div className={`fixed inset-y-0 right-0 z-50 w-64 bg-white dark:bg-dark-paper transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobile={true} />
        </div>
      </div>

      {/* Match Timer */}
      <MatchTimer onClose={() => setTimerOpen(false)} />

      {/* Onboarding Tour */}
      <OnboardingTour isOpen={showOnboarding} onClose={handleCloseOnboarding} />

      {/* Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-dark-paper border-t dark:border-dark-border z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <p className="font-medium">Instale o Presida.Club</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Acesse facilmente pelo seu dispositivo
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowInstallPrompt(false)}
                className="btn-outline"
              >
                Depois
              </button>
              <button
                onClick={handleInstallClick}
                className="btn-primary"
              >
                Instalar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;