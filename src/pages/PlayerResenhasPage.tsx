import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';
import { ArrowLeft, Calendar, DollarSign, User, Check } from 'lucide-react';

interface Resenha {
  id: string;
  data: string;
  total: number;
  status: string;
  responsavel: {
    nome: string;
  };
  valor_gasto: number;
  valor_devido: number;
  pago: boolean;
}

const PlayerResenhasPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const [resenhas, setResenhas] = useState<Resenha[]>([]);
  const [player, setPlayer] = useState<{ nome: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        // Get player info
        const { data: playerData, error: playerError } = await supabase
          .from('jogadores')
          .select('nome')
          .eq('id', id)
          .single();

        if (playerError) throw playerError;
        setPlayer(playerData);

        // Get resenhas - Fixed query to correctly join and filter resenhas_jogadores
        const { data: resenhasData, error: resenhasError } = await supabase
          .from('resenhas_jogadores')
          .select(`
            resenha:resenhas!inner(
              id,
              data,
              total,
              status,
              responsavel:jogadores!resenhas_responsavel_id_fkey(nome)
            ),
            valor_gasto,
            valor_devido,
            pago
          `)
          .eq('jogador_id', id)
          .order('resenha(data)', { ascending: false });

        if (resenhasError) throw resenhasError;

        // Format data
        const formattedResenhas = resenhasData?.map(item => ({
          ...item.resenha,
          valor_gasto: item.valor_gasto,
          valor_devido: item.valor_devido,
          pago: item.pago
        }));

        setResenhas(formattedResenhas || []);
      } catch (error) {
        console.error('Error fetching resenhas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, supabase]);

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!player) {
    return <div>Jogador não encontrado</div>;
  }

  return (
    <div>
      <header className="flex items-center gap-4 mb-6">
        <Link
          to="/jogadores"
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-light rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold mb-2">Resenhas de {player.nome}</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Histórico de participação em resenhas
          </p>
        </div>
      </header>

      {resenhas.length === 0 ? (
        <div className="card p-8 text-center">
          <Calendar className="w-16 h-16 text-primary-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Nenhuma resenha encontrada</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Este jogador ainda não participou de nenhuma resenha
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resenhas.map((resenha) => (
            <Link
              key={resenha.id}
              to={`/resenha/${resenha.id}`}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">
                      {new Date(resenha.data).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <span className={`text-sm px-2 py-0.5 rounded-full capitalize ${
                    resenha.status === 'finalizada'
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                      :  'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {resenha.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Responsável: {resenha.responsavel.nome}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Total: {resenha.total.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t dark:border-dark-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Valor gasto: {resenha.valor_gasto.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Valor devido: {resenha.valor_devido.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </p>
                    </div>
                    {resenha.pago ? (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Check className="w-4 h-4" />
                        <span className="text-sm">Pago</span>
                      </div>
                    ) : (
                      <span className="text-sm text-red-600 dark:text-red-400">
                        Pendente
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerResenhasPage;