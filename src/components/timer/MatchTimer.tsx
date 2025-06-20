import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, X, RotateCcw, Volume2, VolumeX, Plus, Trash2, Pencil, Calendar } from 'lucide-react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useActiveGroup } from '../../hooks/useActiveGroup';

interface Player {
  id: string;
  nome: string;
  tipo: string;
}

interface Goal {
  id: string;
  jogador: Player;
  data: string;
}

interface MatchTimerProps {
  onClose: () => void;
}

const MatchTimer: React.FC<MatchTimerProps> = ({ onClose }) => {
  const { supabase } = useSupabase();
  const { activeGroup } = useActiveGroup();
  const [isOpen, setIsOpen] = useState(false);
  const [minutes, setMinutes] = useState(45);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    if (audioRef.current) {
      audioRef.current.loop = true;
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!activeGroup) return;

      try {
        // Fetch players
        const { data: playersData } = await supabase
          .from('jogadores')
          .select('id, nome, tipo')
          .eq('grupo_id', activeGroup.id)
          .eq('ativo', true)
          .order('nome');

        if (playersData) {
          setPlayers(playersData);
        }

        // Fetch goals for selected date
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);

        const { data: goalsData } = await supabase
          .from('gols')
          .select(`
            id,
            data,
            jogador:jogadores(id, nome, tipo)
          `)
          .eq('grupo_id', activeGroup.id)
          .gte('data', startDate.toISOString())
          .lte('data', endDate.toISOString())
          .order('data', { ascending: false });

        if (goalsData) {
          setGoals(goalsData.map(g => ({
            id: g.id,
            data: g.data,
            jogador: g.jogador
          })));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [supabase, activeGroup, selectedDate]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && !isFinished) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          setIsRunning(false);
          setIsFinished(true);
          // Play sound
          if (audioRef.current) {
            audioRef.current.play();
            setIsSoundPlaying(true);
          }
          // Vibrate if available
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, minutes, seconds]);

  const handleStart = () => {
    setIsRunning(true);
    setIsFinished(false);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsSoundPlaying(false);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsFinished(false);
    setMinutes(45);
    setSeconds(0);
    setGoals([]);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsSoundPlaying(false);
    }
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsSoundPlaying(false);
    }
    setIsOpen(false);
    onClose();
  };

  const toggleSound = () => {
    if (audioRef.current) {
      if (isSoundPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsSoundPlaying(!isSoundPlaying);
    }
  };

  const handleGoal = async (player: Player) => {
    if (!activeGroup) return;

    setSavingGoal(true);
    try {
      // Create a date object with the selected date and current time
      const now = new Date();
      const selectedDateTime = new Date(selectedDate);
      selectedDateTime.setHours(now.getHours());
      selectedDateTime.setMinutes(now.getMinutes());
      selectedDateTime.setSeconds(now.getSeconds());

      const { data, error } = await supabase
        .from('gols')
        .insert({
          jogador_id: player.id,
          grupo_id: activeGroup.id,
          data: selectedDateTime.toISOString()
        })
        .select('id, data')
        .single();

      if (error) throw error;

      if (data) {
        setGoals([{ id: data.id, jogador: player, data: data.data }, ...goals]);
      }
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Erro ao registrar gol');
    } finally {
      setSavingGoal(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Tem certeza que deseja excluir este gol?')) return;

    setDeletingGoal(goalId);
    try {
      const { error } = await supabase
        .from('gols')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      setGoals(goals.filter(g => g.id !== goalId));
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Erro ao excluir gol');
    } finally {
      setDeletingGoal(null);
    }
  };

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 lg:bottom-6 right-6 z-50 p-4 bg-primary-500 hover:bg-primary-600 text-secondary-900 rounded-full shadow-lg transition-colors"
      >
        <Timer className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      <div className="relative bg-white dark:bg-dark-paper rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Timer da Partida</h2>
            <div className="flex items-center gap-2">
              {isFinished && (
                <button
                  onClick={toggleSound}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark-light rounded-full transition-colors"
                  title={isSoundPlaying ? "Parar som" : "Tocar som"}
                >
                  {isSoundPlaying ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-light rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {!isRunning && !isFinished && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Tempo (minutos)
              </label>
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value)))}
                className="input"
                min="0"
              />
            </div>
          )}

          <div className="text-center mb-6">
            <div className="text-6xl font-bold mb-2 font-mono">
              {formatTime(minutes, seconds)}
            </div>
            {isFinished && (
              <p className="text-primary-600 dark:text-primary-400 font-medium">
                Tempo finalizado!
              </p>
            )}
          </div>

          <div className="flex gap-4 mb-6">
            {!isRunning && !isFinished && (
              <button
                onClick={handleStart}
                className="btn-primary flex-1"
              >
                <Play className="w-4 h-4 mr-2" />
                Iniciar
              </button>
            )}
            {(isRunning || isFinished) && (
              <button
                onClick={handleReset}
                className="btn-outline flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reiniciar
              </button>
            )}
          </div>

          <div className="border-t dark:border-dark-border pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Jogadores</h3>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input py-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {players.map((player) => (
              <button
                key={player.id}
                onClick={() => handleGoal(player)}
                disabled={savingGoal}
                className="p-4 border dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-light transition-colors text-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-lg font-medium mx-auto mb-2">
                  {player.nome.charAt(0).toUpperCase()}
                </div>
                <p className="font-medium truncate">{player.nome}</p>
                <p className="text-sm text-gray-500 capitalize">{player.tipo}</p>
              </button>
            ))}
          </div>

          {goals.length > 0 && (
            <div className="border-t dark:border-dark-border pt-6">
              <h3 className="text-lg font-medium mb-4">Gols Marcados</h3>
              <div className="space-y-2">
                {goals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-dark-light"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-sm font-medium">
                        {goal.jogador.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{goal.jogador.nome}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(goal.data).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        disabled={deletingGoal === goal.id}
                        className="p-1 text-red-500 hover:text-red-700"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchTimer;