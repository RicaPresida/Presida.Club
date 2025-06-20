import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../hooks/useAuth';
import { 
  Plus, 
  Bell, 
  Calendar,
  Clock,
  Trash2,
  X,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Repeat
} from 'lucide-react';

interface Reminder {
  id: string;
  titulo: string;
  descricao: string | null;
  dia: string | null;
  data_especifica: string | null;
  recorrente: boolean;
  horario: string;
  ativo: boolean;
  criado_em: string;
  ultima_execucao: string | null;
}

const RemindersPage: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form states
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipoData, setTipoData] = useState<'semanal' | 'especifica'>('semanal');
  const [dia, setDia] = useState('');
  const [dataEspecifica, setDataEspecifica] = useState('');
  const [recorrente, setRecorrente] = useState(false);
  const [horario, setHorario] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchReminders = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('lembretes')
          .select('*')
          .eq('usuario_id', user.id)
          .order('data_especifica', { ascending: true, nullsFirst: false })
          .order('dia', { ascending: true });

        if (error) throw error;
        setReminders(data || []);
      } catch (error) {
        console.error('Erro ao carregar lembretes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();
  }, [supabase, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('lembretes')
        .insert({
          usuario_id: user.id,
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          dia: tipoData === 'semanal' ? dia : null,
          data_especifica: tipoData === 'especifica' ? dataEspecifica : null,
          recorrente: tipoData === 'especifica' ? recorrente : false,
          horario,
          ativo: true
        });

      if (error) throw error;

      // Reset form
      setTitulo('');
      setDescricao('');
      setTipoData('semanal');
      setDia('');
      setDataEspecifica('');
      setRecorrente(false);
      setHorario('');
      setShowForm(false);

      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Erro ao salvar lembrete:', error);
      setError('Erro ao salvar lembrete');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setUpdating(id);

    try {
      const { error } = await supabase
        .from('lembretes')
        .update({ ativo: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setReminders(reminders.map(reminder =>
        reminder.id === id ? { ...reminder, ativo: !currentStatus } : reminder
      ));
    } catch (error) {
      console.error('Erro ao atualizar lembrete:', error);
      alert('Erro ao atualizar lembrete');
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lembrete?')) return;

    setDeleting(id);

    try {
      const { error } = await supabase
        .from('lembretes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReminders(reminders.filter(reminder => reminder.id !== id));
    } catch (error) {
      console.error('Erro ao excluir lembrete:', error);
      alert('Erro ao excluir lembrete');
    } finally {
      setDeleting(null);
    }
  };

  const formatDayOfWeek = (day: string) => {
    const days: { [key: string]: string } = {
      domingo: 'Domingo',
      segunda: 'Segunda',
      terca: 'Terça',
      quarta: 'Quarta',
      quinta: 'Quinta',
      sexta: 'Sexta',
      sabado: 'Sábado'
    };
    return days[day] || day;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div>
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Lembretes</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Configure lembretes automáticos
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Novo Lembrete
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center">
          <p>Carregando lembretes...</p>
        </div>
      ) : reminders.length === 0 ? (
        <div className="card p-8 text-center">
          <Bell className="w-16 h-16 text-primary-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Nenhum lembrete encontrado</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Crie seu primeiro lembrete para receber notificações automáticas
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Criar primeiro lembrete
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`card p-6 ${
                !reminder.ativo ? 'opacity-75' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    reminder.ativo
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'bg-gray-100 dark:bg-dark-light text-gray-500'
                  }`}>
                    <Bell className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold">{reminder.titulo}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(reminder.id, reminder.ativo)}
                    disabled={updating === reminder.id}
                    className={`transition-colors ${
                      reminder.ativo
                        ? 'text-primary-500 hover:text-primary-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title={reminder.ativo ? 'Desativar' : 'Ativar'}
                  >
                    {updating === reminder.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : reminder.ativo ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(reminder.id)}
                    disabled={deleting === reminder.id}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    title="Excluir"
                  >
                    {deleting === reminder.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {reminder.descricao && (
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {reminder.descricao}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {reminder.data_especifica 
                      ? formatDate(reminder.data_especifica)
                      : formatDayOfWeek(reminder.dia!)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{reminder.horario}</span>
                </div>
                {reminder.recorrente && (
                  <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                    <Repeat className="w-4 h-4" />
                    <span>Recorrente</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Reminder Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-dark-paper rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b dark:border-dark-border">
              <h2 className="text-xl font-bold">Novo Lembrete</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-light rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="titulo" className="block text-sm font-medium mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    id="titulo"
                    className="input"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="descricao" className="block text-sm font-medium mb-1">
                    Descrição
                  </label>
                  <textarea
                    id="descricao"
                    className="input min-h-[100px]"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descrição opcional do lembrete..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tipo de Data *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        className="mr-2"
                        checked={tipoData === 'semanal'}
                        onChange={() => setTipoData('semanal')}
                      />
                      <span>Dia da Semana</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        className="mr-2"
                        checked={tipoData === 'especifica'}
                        onChange={() => setTipoData('especifica')}
                      />
                      <span>Data Específica</span>
                    </label>
                  </div>
                </div>

                {tipoData === 'semanal' ? (
                  <div>
                    <label htmlFor="dia" className="block text-sm font-medium mb-1">
                      Dia da Semana *
                    </label>
                    <select
                      id="dia"
                      className="input"
                      value={dia}
                      onChange={(e) => setDia(e.target.value)}
                      required
                    >
                      <option value="">Selecione um dia</option>
                      <option value="domingo">Domingo</option>
                      <option value="segunda">Segunda</option>
                      <option value="terca">Terça</option>
                      <option value="quarta">Quarta</option>
                      <option value="quinta">Quinta</option>
                      <option value="sexta">Sexta</option>
                      <option value="sabado">Sábado</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="dataEspecifica" className="block text-sm font-medium mb-1">
                        Data *
                      </label>
                      <input
                        type="date"
                        id="dataEspecifica"
                        className="input"
                        value={dataEspecifica}
                        onChange={(e) => setDataEspecifica(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={recorrente}
                          onChange={(e) => setRecorrente(e.target.checked)}
                        />
                        <span className="text-sm">Repetir mensalmente</span>
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="horario" className="block text-sm font-medium mb-1">
                    Horário *
                  </label>
                  <input
                    type="time"
                    id="horario"
                    className="input"
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-outline"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemindersPage;