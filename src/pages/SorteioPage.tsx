import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useActiveGroup } from '../hooks/useActiveGroup';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  Shuffle, 
  Trophy, 
  AlertCircle, 
  Star, 
  Calendar, 
  Save 
} from 'lucide-react';

interface Player {
  id: string;
  nome: string;
  posicao: string;
  nivel: number;
  caracteristicas?: {
    velocidade: number;
    finalizacao: number;
    passe: number;
    drible: number;
    defesa: number;
    fisico: number;
  };
}

interface Team {
  name: string;
  players: Player[];
  averageRating: number;
}

const SorteioPage: React.FC = () => {
  const { supabase } = useSupabase();
  const { activeGroup } = useActiveGroup();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [groupType, setGroupType] = useState<'campo' | 'society' | 'quadra' | null>(null);
  const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);
  const [existingGame, setExistingGame] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!activeGroup) return;

      try {
        // Get group type
        const { data: groupData } = await supabase
          .from('grupos')
          .select('tipo')
          .eq('id', activeGroup.id)
          .single();

        if (groupData) {
          setGroupType(groupData.tipo as 'campo' | 'society' | 'quadra');
        }

        // Check for existing game on selected date
        const { data: existingGameData } = await supabase
          .from('jogos')
          .select('id, times')
          .eq('grupo_id', activeGroup.id)
          .eq('data', gameDate)
          .maybeSingle();

        setExistingGame(!!existingGameData);
        if (existingGameData?.times) {
          setTeams(existingGameData.times as Team[]);
        } else {
          setTeams([]);
        }

        // Fetch active players with their characteristics
        const { data: playersData } = await supabase
          .from('jogadores')
          .select(`
            *,
            caracteristicas:jogadores_caracteristicas(
              velocidade,
              finalizacao,
              passe,
              drible,
              defesa,
              fisico
            )
          `)
          .eq('grupo_id', activeGroup.id)
          .eq('ativo', true)
          .order('nome');

        if (playersData) {
          setPlayers(playersData.map(player => ({
            ...player,
            caracteristicas: player.caracteristicas?.[0]
          })));
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError('Erro ao carregar dados dos jogadores');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase, activeGroup, gameDate]);

  const calculatePlayerRating = (player: Player) => {
    if (!player.caracteristicas) {
      return player.nivel * 20; // Base rating if no characteristics
    }

    // Weight characteristics based on position
    const weights = {
      goleiro: {
        velocidade: 0.15,
        finalizacao: 0.05,
        passe: 0.15,
        drible: 0.05,
        defesa: 0.4,
        fisico: 0.2
      },
      zagueiro: {
        velocidade: 0.2,
        finalizacao: 0.05,
        passe: 0.15,
        drible: 0.1,
        defesa: 0.3,
        fisico: 0.2
      },
      'meio-campo': {
        velocidade: 0.2,
        finalizacao: 0.15,
        passe: 0.25,
        drible: 0.2,
        defesa: 0.1,
        fisico: 0.1
      },
      atacante: {
        velocidade: 0.25,
        finalizacao: 0.3,
        passe: 0.15,
        drible: 0.2,
        defesa: 0.05,
        fisico: 0.05
      }
    };

    const positionWeights = weights[player.posicao as keyof typeof weights] || {
      velocidade: 0.2,
      finalizacao: 0.2,
      passe: 0.15,
      drible: 0.15,
      defesa: 0.15,
      fisico: 0.15
    };

    return Object.entries(player.caracteristicas).reduce((sum, [key, value]) => {
      return sum + (value * (positionWeights[key as keyof typeof positionWeights] || 0));
    }, 0);
  };

  const getPlayersPerTeam = () => {
    switch (groupType) {
      case 'campo':
        return 11;
      case 'society':
        return 7;
      case 'quadra':
        return 5;
      default:
        return 5;
    }
  };

  const getMinimumPlayers = () => {
    switch (groupType) {
      case 'campo':
        return 14; // 7 per team minimum
      case 'society':
        return 10; // 5 per team minimum
      case 'quadra':
        return 6; // 3 per team minimum
      default:
        return 6;
    }
  };

  const drawTeams = () => {
    if (selectedPlayers.length < 4) {
      setError('Selecione pelo menos 4 jogadores para o sorteio');
      return;
    }

    const selectedPlayerObjects = players.filter(p => selectedPlayers.includes(p.id));
    const playersPerTeam = Math.floor(selectedPlayerObjects.length / 2);
    const numberOfTeams = 2;

    // Sort players by position and rating
    const sortedPlayers = [...selectedPlayerObjects].sort((a, b) => {
      // First by position priority
      const positionPriority = { goleiro: 1, zagueiro: 2, 'meio-campo': 3, atacante: 4 };
      const posA = positionPriority[a.posicao as keyof typeof positionPriority] || 5;
      const posB = positionPriority[b.posicao as keyof typeof positionPriority] || 5;
      if (posA !== posB) return posA - posB;

      // Then by rating
      return calculatePlayerRating(b) - calculatePlayerRating(a);
    });

    // Initialize teams
    const newTeams: Team[] = Array.from({ length: numberOfTeams }, (_, i) => ({
      name: `Time ${i + 1}`,
      players: [],
      averageRating: 0
    }));

    // Distribute goalkeepers first
    const goalkeepers = sortedPlayers.filter(p => p.posicao === 'goleiro');
    goalkeepers.forEach((gk, i) => {
      if (i < numberOfTeams) {
        newTeams[i].players.push(gk);
      }
    });

    // Distribute remaining players using snake draft
    const remainingPlayers = sortedPlayers.filter(p => p.posicao !== 'goleiro');
    let direction = 1;
    let currentTeam = 0;

    remainingPlayers.forEach((player) => {
      newTeams[currentTeam].players.push(player);
      
      if (direction === 1) {
        if (currentTeam === numberOfTeams - 1) {
          direction = -1;
          currentTeam--;
        } else {
          currentTeam++;
        }
      } else {
        if (currentTeam === 0) {
          direction = 1;
          currentTeam++;
        } else {
          currentTeam--;
        }
      }
    });

    // Calculate team ratings
    newTeams.forEach(team => {
      team.averageRating = team.players.reduce((sum, player) => 
        sum + calculatePlayerRating(player), 0) / team.players.length;
    });

    setTeams(newTeams);
    setError(null);
  };

  const saveGame = async () => {
    if (!activeGroup || !teams.length || !user) return;

    setSaving(true);
    setError(null);

    try {
      // Delete existing game for this date if it exists
      if (existingGame) {
        const { error: deleteError } = await supabase
          .from('jogos')
          .delete()
          .eq('grupo_id', activeGroup.id)
          .eq('data', gameDate);

        if (deleteError) throw deleteError;
      }

      // Create new game
      const { data: game, error: gameError } = await supabase
        .from('jogos')
        .insert({
          data: gameDate,
          grupo_id: activeGroup.id,
          times: teams,
          criado_por: user.id
        })
        .select()
        .single();

      if (gameError) throw gameError;

      // Record player participation
      const participations = selectedPlayers.map(playerId => ({
        jogo_id: game.id,
        jogador_id: playerId
      }));

      const { error: participationError } = await supabase
        .from('jogos_jogadores')
        .insert(participations);

      if (participationError) throw participationError;

      setExistingGame(true);
      alert('Jogo salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar jogo:', error);
      setError('Erro ao salvar jogo');
    } finally {
      setSaving(false);
    }
  };

  if (!activeGroup) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Nenhum grupo selecionado</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Selecione um grupo ativo para realizar o sorteio
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Sorteio de Times</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Selecione os jogadores e sorteie os times automaticamente
          </p>
          <div className="flex flex-row gap-2 w-full sm:hidden">
            <div className="flex-1">
              <label htmlFor="gameDate" className="block text-sm font-medium mb-1">
                Data do Jogo
              </label>
              <input
                type="date"
                id="gameDate"
                className="input w-full"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
              />
            </div>
            {teams.length > 0 ? (
              <button
                onClick={saveGame}
                className="btn-primary flex-1 self-end"
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Times'}
              </button>
            ) : (
              <button
                onClick={drawTeams}
                className="btn-primary flex-1 self-end"
                disabled={selectedPlayers.length < 4}
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Sortear Times
              </button>
            )}
          </div>
        </div>
        <div className="hidden sm:flex sm:items-center sm:justify-between">
          <div></div>
          <div className="flex items-center gap-4">
            <div>
              <label htmlFor="gameDate" className="block text-sm font-medium mb-1">
                Data do Jogo
              </label>
              <input
                type="date"
                id="gameDate"
                className="input"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
              />
            </div>
            {teams.length > 0 ? (
              <button
                onClick={saveGame}
                className="btn-primary"
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Times'}
              </button>
            ) : (
              <button
                onClick={drawTeams}
                className="btn-primary"
                disabled={selectedPlayers.length < 4}
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Sortear Times
              </button>
            )}
          </div>
        </div>
      </div>

      {existingGame && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>Já existe um jogo registrado para esta data. Salvar novamente irá substituir o sorteio anterior.</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4">Jogadores Disponíveis</h2>
          
          <div className="space-y-2">
            {players.map((player) => (
              <label
                key={player.id}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPlayers.includes(player.id)
                    ? 'bg-primary-50 border-primary-500 dark:bg-primary-900/20 dark:border-primary-500'
                    : 'border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-light'
                }`}
              >
                <input
                  type="checkbox"
                  className="mr-3"
                  checked={selectedPlayers.includes(player.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPlayers([...selectedPlayers, player.id]);
                    } else {
                      setSelectedPlayers(selectedPlayers.filter(id => id !== player.id));
                    }
                    setTeams([]); // Clear teams when selection changes
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{player.nome}</span>
                    <div className="flex items-center gap-2">
                      {player.posicao && (
                        <span className="text-sm px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-light capitalize">
                          {player.posicao}
                        </span>
                      )}
                      <div className="flex">
                        {Array.from({ length: player.nivel }).map((_, i) => (
                          <Star
                            key={i}
                            className="w-4 h-4 text-yellow-400 fill-current"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {teams.length > 0 && (
          <div className="space-y-6">
            {teams.map((team, index) => (
              <div key={index} className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">{team.name}</h3>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="font-bold">
                      {Math.round(team.averageRating)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {team.players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-dark-light"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-sm font-medium">
                          {player.nome.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{player.nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {player.posicao && (
                          <span className="text-sm px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-paper capitalize">
                            {player.posicao}
                          </span>
                        )}
                        <div className="flex">
                          {Array.from({ length: player.nivel }).map((_, i) => (
                            <Star
                              key={i}
                              className="w-4 h-4 text-yellow-400 fill-current"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SorteioPage;