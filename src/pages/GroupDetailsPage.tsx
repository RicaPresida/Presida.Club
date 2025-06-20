import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../hooks/useAuth';
import { 
  ArrowLeft,
  Users,
  DollarSign,
  MapPin,
  Clock,
  Calendar,
  Save,
  Trash2,
  AlertCircle,
  Plus,
  X,
  Wallet
} from 'lucide-react';

interface GameDay {
  id: string;
  dia: string;
  horario: string;
  local: string;
  valor: number;
}

const GroupDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [group, setGroup] = useState<any>(null);
  const [playersCount, setPlayersCount] = useState(0);
  const [gameDays, setGameDays] = useState<GameDay[]>([]);
  const [defaultValue, setDefaultValue] = useState<string>('');
  const [cashBalance, setCashBalance] = useState<string>('0');

  // Form states
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');

  useEffect(() => {
    const fetchGroupData = async () => {
      if (!id) return;

      try {
        // Fetch group data
        const { data: groupData, error: groupError } = await supabase
          .from('grupos')
          .select(`
            *,
            configuracoes:grupo_configuracoes(valor_padrao, caixa_atual)
          `)
          .eq('id', id)
          .single();

        if (groupError) throw groupError;
        
        setGroup(groupData);
        setNome(groupData.nome);
        setTipo(groupData.tipo);
        setDefaultValue(groupData.configuracoes?.valor_padrao?.toString() || '');
        setCashBalance(groupData.configuracoes?.caixa_atual?.toString() || '0');

        // Fetch game days
        const { data: gameDaysData, error: gameDaysError } = await supabase
          .from('grupo_dias_jogo')
          .select('*')
          .eq('grupo_id', id)
          .order('dia');

        if (gameDaysError) throw gameDaysError;
        setGameDays(gameDaysData || []);

        // Count players
        const { count, error: countError } = await supabase
          .from('jogadores')
          .select('*', { count: 'exact', head: true })
          .eq('grupo_id', id)
          .eq('ativo', true);

        if (countError) throw countError;
        setPlayersCount(count || 0);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError('Erro ao carregar dados do grupo');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [id, supabase]);

  const handleAddGameDay = () => {
    setGameDays([...gameDays, {
      id: crypto.randomUUID(),
      dia: '',
      horario: '',
      local: '',
      valor: 0
    }]);
  };

  const handleRemoveGameDay = (index: number) => {
    setGameDays(gameDays.filter((_, i) => i !== index));
  };

  const handleGameDayChange = (index: number, field: keyof GameDay, value: string | number) => {
    const updatedDays = [...gameDays];
    updatedDays[index] = { ...updatedDays[index], [field]: value };
    setGameDays(updatedDays);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Update group
      const { error: groupError } = await supabase
        .from('grupos')
        .update({
          nome: nome.trim(),
          tipo
        })
        .eq('id', id);

      if (groupError) throw groupError;

      // Update default value and cash balance
      const { error: configError } = await supabase
        .from('grupo_configuracoes')
        .upsert({
          grupo_id: id,
          valor_padrao: defaultValue ? parseFloat(defaultValue) : null,
          caixa_atual: cashBalance ? parseFloat(cashBalance) : 0
        });

      if (configError) throw configError;

      // Update game days
      const { error: deleteError } = await supabase
        .from('grupo_dias_jogo')
        .delete()
        .eq('grupo_id', id);

      if (deleteError) throw deleteError;

      if (gameDays.length > 0) {
        const { error: insertError } = await supabase
          .from('grupo_dias_jogo')
          .insert(
            gameDays.map(day => ({
              grupo_id: id,
              dia: day.dia,
              horario: day.horario,
              local: day.local,
              valor: day.valor
            }))
          );

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      setError('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('grupos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      navigate('/grupos');
    } catch (error) {
      console.error('Erro ao excluir grupo:', error);
      setError('Erro ao excluir grupo');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Grupo não encontrado</h2>
        <Link to="/grupos" className="text-primary-500 hover:underline">
          Voltar para lista de grupos
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          to="/grupos"
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-light rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">Configurações do Grupo</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-2">
                <Save className="w-5 h-5" />
                <p>Alterações salvas com sucesso!</p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium mb-1">
                  Nome do Grupo *
                </label>
                <input
                  type="text"
                  id="nome"
                  className="input"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="tipo" className="block text-sm font-medium mb-1">
                  Tipo de Campo *
                </label>
                <select
                  id="tipo"
                  className="input"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  required
                >
                  <option value="society">Society</option>
                  <option value="campo">Campo</option>
                  <option value="quadra">Quadra</option>
                </select>
              </div>

              <div>
                <label htmlFor="mensalidade" className="block text-sm font-medium mb-1">
                  Valor da Mensalidade *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400">
                    R$
                  </span>
                  <input
                    type="number"
                    id="mensalidade"
                    step="0.01"
                    min="0"
                    className="input pl-10"
                    value={defaultValue}
                    onChange={(e) => setDefaultValue(e.target.value)}
                    required
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Este valor será usado como padrão para os pagamentos mensais dos jogadores
                </p>
              </div>

              <div>
                <label htmlFor="caixa" className="block text-sm font-medium mb-1">
                  Dinheiro em Caixa *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400">
                    R$
                  </span>
                  <input
                    type="number"
                    id="caixa"
                    step="0.01"
                    min="0"
                    className="input pl-10"
                    value={cashBalance}
                    onChange={(e) => setCashBalance(e.target.value)}
                    required
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Este valor será atualizado automaticamente conforme as movimentações financeiras
                </p>
              </div>

              <div className="border-t dark:border-dark-border pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Dias de Jogo</h3>
                  <button
                    type="button"
                    onClick={handleAddGameDay}
                    className="btn-outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Dia
                  </button>
                </div>

                <div className="space-y-4">
                  {gameDays.map((day, index) => (
                    <div key={day.id} className="p-4 border dark:border-dark-border rounded-lg">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium">Dia de Jogo {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => handleRemoveGameDay(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Dia da Semana
                          </label>
                          <select
                            className="input"
                            value={day.dia}
                            onChange={(e) => handleGameDayChange(index, 'dia', e.target.value)}
                            required
                          >
                            <option value="">Selecione um dia</option>
                            <option value="domingo">Domingo</option>
                            <option value="segunda">Segunda-feira</option>
                            <option value="terca">Terça-feira</option>
                            <option value="quarta">Quarta-feira</option>
                            <option value="quinta">Quinta-feira</option>
                            <option value="sexta">Sexta-feira</option>
                            <option value="sabado">Sábado</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Horário
                          </label>
                          <input
                            type="time"
                            className="input"
                            value={day.horario}
                            onChange={(e) => handleGameDayChange(index, 'horario', e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Local
                          </label>
                          <input
                            type="text"
                            className="input"
                            value={day.local}
                            onChange={(e) => handleGameDayChange(index, 'local', e.target.value)}
                            placeholder="Nome do local ou endereço"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Valor
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400">
                              R$
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="input pl-10"
                              value={day.valor}
                              onChange={(e) => handleGameDayChange(index, 'valor', parseFloat(e.target.value))}
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t dark:border-dark-border">
              <button
                type="button"
                onClick={handleDelete}
                className="btn-outline text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Grupo
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-bold mb-4">Informações</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Jogadores Ativos
                  </p>
                  <p className="font-medium">{playersCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Mensalidade
                  </p>
                  <p className="font-medium">
                    {defaultValue
                      ? parseFloat(defaultValue).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })
                      : 'Não definida'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
                  <Wallet className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Dinheiro em Caixa
                  </p>
                  <p className="font-medium">
                    {parseFloat(cashBalance).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </p>
                </div>
              </div>

              {gameDays.map((day, index) => (
                <div key={day.id} className="border-t dark:border-dark-border pt-4">
                  <h4 className="font-medium mb-3">Dia de Jogo {index + 1}</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                        <Calendar className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Dia</p>
                        <p className="font-medium capitalize">{day.dia || '-'}</p>
                      </div>
                    </div>

                    {day.horario && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                          <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Horário</p>
                          <p className="font-medium">{day.horario}</p>
                        </div>
                      </div>
                    )}

                    {day.local && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                          <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Local</p>
                          <p className="font-medium">{day.local}</p>
                        </div>
                      </div>
                    )}

                    {day.valor > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Valor</p>
                          <p className="font-medium">
                            {day.valor.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupDetailsPage;