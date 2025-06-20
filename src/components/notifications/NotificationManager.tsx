import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useAuth } from '../../hooks/useAuth';
import NotificationPopup from './NotificationPopup';

interface Notification {
  id: string;
  titulo: string;
  mensagem: string;
}

const NotificationManager: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;

    // Check for reminders that should be shown
    const checkReminders = async () => {
      const now = new Date();
      const currentDay = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][now.getDay()];
      const currentTime = now.toTimeString().substring(0, 5); // HH:mm format

      // Check for weekly reminders
      const { data: weeklyReminders } = await supabase
        .from('lembretes')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('ativo', true)
        .eq('dia', currentDay)
        .eq('horario', currentTime);

      // Check for specific date reminders
      const { data: specificReminders } = await supabase
        .from('lembretes')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('ativo', true)
        .eq('data_especifica', now.toISOString().split('T')[0])
        .eq('horario', currentTime);

      const remindersToShow = [...(weeklyReminders || []), ...(specificReminders || [])];

      // Create notifications for each reminder
      for (const reminder of remindersToShow) {
        // Create notification in the database
        const { data: notification } = await supabase
          .from('notificacoes')
          .insert({
            usuario_id: user.id,
            titulo: reminder.titulo,
            mensagem: reminder.descricao || 'Lembrete agendado',
          })
          .select()
          .single();

        if (notification) {
          setNotifications(prev => [...prev, notification]);
        }

        // Update last execution time
        await supabase
          .from('lembretes')
          .update({ ultima_execucao: new Date().toISOString() })
          .eq('id', reminder.id);

        // If not recurrent and it's a specific date, deactivate it
        if (!reminder.recorrente && reminder.data_especifica) {
          await supabase
            .from('lembretes')
            .update({ ativo: false })
            .eq('id', reminder.id);
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkReminders, 60000);
    checkReminders(); // Initial check

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(prev => [...prev, payload.new as Notification]);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [supabase, user]);

  const handleClose = async (id: string) => {
    if (!user) return;

    try {
      await supabase
        .from('notificacoes')
        .update({
          lida: true,
          lida_em: new Date().toISOString(),
        })
        .eq('id', id);

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="fixed right-4 z-50 flex flex-col items-end gap-4 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationPopup
            id={notification.id}
            title={notification.titulo}
            message={notification.mensagem}
            onClose={handleClose}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationManager;