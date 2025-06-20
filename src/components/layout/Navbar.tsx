import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Menu, Trash2, X, Clock, Check, Loader2, FolderRoot } from 'lucide-react';
import { useActiveGroup } from '../../hooks/useActiveGroup';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useAuth } from '../../hooks/useAuth';

interface Notification {
  id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criado_em: string;
  lida_em: string | null;
  ver_depois: boolean;
}

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { activeGroup, loading: groupLoading } = useActiveGroup();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  // Helpers para controle de loading por notificação
  const addLoading = (id: string) => setLoadingIds(prev => new Set(prev).add(id));
  const removeLoading = (id: string) => setLoadingIds(prev => {
    const updated = new Set(prev);
    updated.delete(id);
    return updated;
  });

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('usuario_id', user.id)
        .order('criado_em', { ascending: false });

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.lida).length);
      }
    };

    fetchNotifications();

    // Subscribe to notifications changes
    const channel = supabase
      .channel('notificacoes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificacoes',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            if (!newNotification.lida) setUnreadCount(prev => prev + 1);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setNotifications(prev => prev.filter(n => n.id !== deletedId));
            // Ajusta contagem de não lidas se necessário
            const wasUnread = notifications.find(n => n.id === deletedId)?.lida === false;
            if (wasUnread) setUnreadCount(prev => Math.max(prev - 1, 0));
          } else {
            // UPDATE event - atualizar lista completa para garantir sincronização
            fetchNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(console.error);
    };
  }, [supabase, user]);

  const handleMarkAsRead = async (id: string) => {
    if (loadingIds.has(id)) return; // evita múltiplas requisições simultâneas
    addLoading(id);
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({
          lida: true,
          lida_em: new Date().toISOString(),
        })
        .eq('id', id);

      if (!error) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, lida: true, lida_em: new Date().toISOString() } : n))
        );
        setUnreadCount(prev => Math.max(prev - 1, 0));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      removeLoading(id);
    }
  };

  const handleViewLater = async (id: string) => {
    if (loadingIds.has(id)) return;
    addLoading(id);
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({
          ver_depois: true,
        })
        .eq('id', id);

      if (!error) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, ver_depois: true } : n))
        );
      }
    } catch (error) {
      console.error('Error marking notification for later:', error);
    } finally {
      removeLoading(id);
    }
  };

  const handleDelete = async (id: string) => {
    if (loadingIds.has(id)) return;
    addLoading(id);
    try {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('id', id);

      if (!error) {
        const wasUnread = notifications.find(n => n.id === id)?.lida === false;
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (wasUnread) setUnreadCount(prev => Math.max(prev - 1, 0));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      removeLoading(id);
    }
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(date));
  };

  return (
    <header className="sticky top-0 z-30 border-b dark:border-dark-border bg-white/95 dark:bg-dark-paper/95 backdrop-blur-sm">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Logo and Group name */}
        <div className="flex items-center gap-3">
          <img 
            src="https://presida.club/wp-content/uploads/2025/05/logo-presida-horizontal.png"
            alt="Presida.Club"
            className="h-8 w-auto"
          />
          {!groupLoading && activeGroup && (
            <span className="text-sm font-medium truncate max-w-[200px]">
              {activeGroup.nome}
            </span>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Link 
            to="/grupos" 
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-light transition-colors relative"
            title="Meus Grupos"
            aria-label="Meus Grupos"
          >
            <FolderRoot className="w-5 h-5" />
          </Link>

          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-light transition-colors relative"
              title="Notificações"
              aria-label="Abrir notificações"
              aria-haspopup="true"
              aria-expanded={showNotifications}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full"
                  aria-label={`${unreadCount} notificações não lidas`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
{showNotifications && (
 <div
  role="dialog"
  aria-modal="true"
  aria-label="Notificações"
  className="absolute right-0 mt-2 bg-white dark:bg-dark-paper rounded-lg shadow-lg border dark:border-dark-border max-w-[95vw] max-h-[80vh] overflow-auto w-auto sm:w-96"
  style={{ minWidth: '16rem' }} // largura mínima para manter boa aparência
>


    <div className="flex items-center justify-between p-4 border-b dark:border-dark-border">
      <h3 className="font-medium">Notificações</h3>
      <button
        onClick={() => setShowNotifications(false)}
        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        aria-label="Fechar notificações"
      >
        <X className="w-4 h-4" />
      </button>
    </div>


                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Nenhuma notificação
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b dark:border-dark-border last:border-0 cursor-default transition-colors ${
                          notification.lida
                            ? 'bg-white dark:bg-dark-paper'
                            : 'bg-primary-50 dark:bg-primary-900/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-medium mb-1">{notification.titulo}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {notification.mensagem}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatDate(notification.criado_em)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!notification.lida && !notification.ver_depois && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewLater(notification.id);
                                }}
                                className="text-gray-400 hover:text-primary-500 transition-colors"
                                title="Ver depois"
                                aria-label="Ver depois"
                                disabled={loadingIds.has(notification.id)}
                              >
                                {loadingIds.has(notification.id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Clock className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            {!notification.lida && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                                className="text-gray-400 hover:text-green-500 transition-colors"
                                title="Marcar como lida"
                                aria-label="Marcar como lida"
                                disabled={loadingIds.has(notification.id)}
                              >
                                {loadingIds.has(notification.id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(notification.id);
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              title="Excluir"
                              aria-label="Excluir"
                              disabled={loadingIds.has(notification.id)}
                            >
                              {loadingIds.has(notification.id) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-light rounded-lg transition-colors lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
