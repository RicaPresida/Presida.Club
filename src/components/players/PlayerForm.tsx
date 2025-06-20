import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Upload, X } from 'lucide-react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useAuth } from '../../hooks/useAuth';
import { formatPhoneNumber } from '../../utils/formatters';

interface PlayerFormProps {
  groupId: string;
  playerId?: string;
  onCancel: () => void;
  onSuccess?: () => void;
}

const PlayerForm: React.FC<PlayerFormProps> = ({ groupId, playerId, onCancel, onSuccess }) => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');
  const [tipo, setTipo] = useState('ativo');
  const [posicao, setPosicao] = useState('');
  const [referencia, setReferencia] = useState('');
  const [telefone, setTelefone] = useState('');
  const [nivel, setNivel] = useState(3);

  // Gerar cor aleatória para avatar
  const getRandomColor = () => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };
  
  const [avatarColor] = useState(getRandomColor());

  useEffect(() => {
    const fetchPlayer = async () => {
      if (!playerId) return;

      try {
        const { data, error } = await supabase
          .from('jogadores')
          .select('*')
          .eq('id', playerId)
          .single();

        if (error) throw error;

        if (data) {
          setNome(data.nome);
          setIdade(data.idade?.toString() || '');
          setTipo(data.tipo || 'ativo');
          setPosicao(data.posicao || '');
          setReferencia(data.referencia || '');
          setTelefone(data.telefone || '');
          setNivel(data.nivel);
          if (data.foto_url) {
            setFotoPreview(data.foto_url);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar jogador:', error);
        setError('Erro ao carregar dados do jogador');
      }
    };

    fetchPlayer();
  }, [playerId, supabase]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setTelefone(formatted);
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFoto(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const validateForm = () => {
    if (!nome.trim()) return 'Nome é obrigatório';
    if (!idade || parseInt(idade) <= 0) return 'Idade inválida';
    if (!posicao) return 'Posição é obrigatória';
    if (!telefone) return 'Telefone é obrigatório';
    return null;
  };

  const checkExistingPlayer = async () => {
    const { data } = await supabase
      .from('jogadores')
      .select('id')
      .eq('nome', nome.trim())
      .eq('grupo_id', groupId);

    return data && data.length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verificar se jogador já existe (apenas para criação)
      if (!playerId) {
        const exists = await checkExistingPlayer();
        if (exists) {
          setError('Já existe um jogador com este nome no grupo');
          return;
        }
      }

      let fotoUrl = fotoPreview;
      if (foto) {
        const fileExt = foto.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('player-photos')
          .upload(fileName, foto);

        if (uploadError) throw uploadError;

        if (data) {
          const { data: { publicUrl } } = supabase.storage
            .from('player-photos')
            .getPublicUrl(data.path);
          fotoUrl = publicUrl;
        }
      }

      const playerData = {
        nome: nome.trim(),
        idade: parseInt(idade),
        tipo,
        posicao,
        referencia: referencia.trim() || null,
        telefone,
        foto_url: fotoUrl,
        nivel,
        grupo_id: groupId,
      };

      if (playerId) {
        // Atualizar jogador existente
        const { error: updateError } = await supabase
          .from('jogadores')
          .update(playerData)
          .eq('id', playerId);

        if (updateError) throw updateError;
      } else {
        // Criar novo jogador
        const { error: insertError } = await supabase
          .from('jogadores')
          .insert(playerData);

        if (insertError) throw insertError;
      }

      onSuccess?.(); // Call onSuccess callback if provided
      onCancel(); // Close the form
    } catch (err) {
      console.error('Erro ao salvar jogador:', err);
      setError('Erro ao salvar jogador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Foto */}
      <div className="flex flex-col items-center">
        <div className="relative">
          {fotoPreview ? (
            <img
              src={fotoPreview}
              alt="Preview"
              className="w-32 h-32 rounded-full object-cover"
            />
          ) : (
            <div className={`w-32 h-32 rounded-full flex items-center justify-center text-3xl text-white ${avatarColor}`}>
              {nome.charAt(0).toUpperCase()}
            </div>
          )}
          <label
            htmlFor="foto"
            className="absolute bottom-0 right-0 p-2 bg-white dark:bg-dark-paper rounded-full shadow-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-light transition-colors"
          >
            <input
              type="file"
              id="foto"
              accept="image/*"
              onChange={handleFotoChange}
              className="hidden"
            />
            {fotoPreview ? (
              <X className="w-5 h-5" onClick={() => {
                setFoto(null);
                setFotoPreview(null);
              }} />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </label>
        </div>
      </div>

      {/* Nome */}
      <div>
        <label htmlFor="nome" className="block text-sm font-medium mb-1">
          Nome Completo *
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

      {/* Idade */}
      <div>
        <label htmlFor="idade" className="block text-sm font-medium mb-1">
          Idade *
        </label>
        <input
          type="number"
          id="idade"
          className="input"
          value={idade}
          onChange={(e) => setIdade(e.target.value)}
          min="1"
          required
        />
      </div>

      {/* Tipo */}
      <div>
        <label htmlFor="tipo" className="block text-sm font-medium mb-1">
          Tipo de Jogador *
        </label>
        <select
          id="tipo"
          className="input"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          required
        >
          <option value="ativo">Ativo</option>
          <option value="avulso">Avulso</option>
        </select>
      </div>

      {/* Posição */}
      <div>
        <label htmlFor="posicao" className="block text-sm font-medium mb-1">
          Posição *
        </label>
        <select
          id="posicao"
          className="input"
          value={posicao}
          onChange={(e) => setPosicao(e.target.value)}
          required
        >
          <option value="">Selecione uma posição</option>
          <option value="goleiro">Goleiro</option>
          <option value="zagueiro">Zagueiro</option>
          <option value="meio-campo">Meio Campo</option>
          <option value="atacante">Atacante</option>
        </select>
      </div>

      {/* Nível */}
      <div>
        <label htmlFor="nivel" className="block text-sm font-medium mb-1">
          Nível *
        </label>
        <select
          id="nivel"
          className="input"
          value={nivel}
          onChange={(e) => setNivel(parseInt(e.target.value))}
          required
        >
          <option value="1">1 - Iniciante</option>
          <option value="2">2 - Básico</option>
          <option value="3">3 - Intermediário</option>
          <option value="4">4 - Avançado</option>
          <option value="5">5 - Profissional</option>
        </select>
      </div>

      {/* Referência */}
      <div>
        <label htmlFor="referencia" className="block text-sm font-medium mb-1">
          Referência (opcional)
        </label>
        <input
          type="text"
          id="referencia"
          className="input"
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          placeholder="Ex: Indicado por João"
        />
      </div>

      {/* Telefone */}
      <div>
        <label htmlFor="telefone" className="block text-sm font-medium mb-1">
          Telefone (WhatsApp) *
        </label>
        <input
          type="tel"
          id="telefone"
          className="input"
          value={telefone}
          onChange={handlePhoneChange}
          placeholder="(00) 00000-0000"
          required
        />
      </div>

      {/* Botões */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn-outline flex-1"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="btn-primary flex-1"
          disabled={loading}
        >
          {loading ? 'Salvando...' : (playerId ? 'Atualizar' : 'Salvar')}
        </button>
      </div>
    </form>
  );
};

export default PlayerForm;