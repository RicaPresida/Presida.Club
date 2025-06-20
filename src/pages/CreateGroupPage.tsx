import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderRoot as Football } from 'lucide-react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../hooks/useAuth';
import { usePlanFeatures } from '../hooks/usePlanFeatures';

const CreateGroupPage: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { canCreateGroup } = usePlanFeatures();

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('society');
  const [mensalidade, setMensalidade] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!nome || !tipo) {
      setError('Por favor, preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: gruposExistentes, error: gruposError } = await supabase
        .from('grupos')
        .select('id')
        .eq('criado_por', user!.id);

      if (gruposError) throw gruposError;

      const currentGroupCount = gruposExistentes?.length || 0;

      // 🔍 LOGS DE DEBUG
      console.log('[DEBUG] user.id:', user?.id);
      console.log('[DEBUG] gruposExistentes:', gruposExistentes);
      console.log('[DEBUG] currentGroupCount:', currentGroupCount);

      const { allowed, message } = await canCreateGroup(currentGroupCount);

      if (!allowed) {
        setError(message || 'Você atingiu o limite de grupos permitidos no seu plano.');
        setLoading(false);
        return;
      }

      const { data: grupo, error: insertError } = await supabase
        .from('grupos')
        .insert({
          nome: nome.trim(),
          tipo,
          criado_por: user!.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (grupo) {
        if (mensalidade) {
          const { error: configError } = await supabase
            .from('grupo_configuracoes')
            .insert({
              grupo_id: grupo.id,
              valor_padrao: parseFloat(mensalidade)
            });

          if (configError) throw configError;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            grupo_ativo: grupo.id,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', user!.id);

        if (profileError) throw profileError;

        navigate(`/grupos/${grupo.id}`);
      }
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      setError('Erro ao criar o grupo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Criar Novo Grupo</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Preencha as informações para criar seu grupo
        </p>
      </header>

      <div className="max-w-2xl">
        <div className="card p-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="nome" className="block text-sm font-medium mb-1">
                Nome do Grupo *
              </label>
              <input
                id="nome"
                type="text"
                className="input"
                placeholder="Ex: Pelada de Quarta"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
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

            <div className="mb-6">
              <label htmlFor="mensalidade" className="block text-sm font-medium mb-1">
                Valor da Mensalidade *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400">
                  R$
                </span>
                <input
                  id="mensalidade"
                  type="number"
                  step="0.01"
                  min="0"
                  className="input pl-10"
                  placeholder="0,00"
                  value={mensalidade}
                  onChange={(e) => setMensalidade(e.target.value)}
                  required
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Este valor será usado como padrão para os pagamentos mensais dos jogadores
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? (
                'Criando grupo...'
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Grupo
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary-100 dark:bg-primary-900/20">
            <Football className="w-6 h-6 text-primary-500" />
          </div>
          <h2 className="text-lg font-semibold mt-4 mb-2">
            Comece a organizar seu time
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Após criar o grupo, você poderá adicionar jogadores, gerenciar finanças
            e muito mais.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupPage;
