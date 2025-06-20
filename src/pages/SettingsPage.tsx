import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSupabase } from '../contexts/SupabaseContext';
import { Camera, Mail, User, Calendar, Trophy, AlertCircle, Save } from 'lucide-react';
import imageCompression from 'browser-image-compression';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [nome, setNome] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
        setNome(data.nome || '');
        setNomeCompleto(data.nome_completo || '');
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [user, supabase]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0 || !user) {
        return;
      }

      setUploading(true);
      setError(null);
      
      const file = event.target.files[0];

      // Image compression options
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true
      };

      // Compress the image
      const compressedFile = await imageCompression(file, options);
      
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
    } catch (error: any) {
      console.error('Error updating avatar:', error);
      setError(error.message || 'Erro ao atualizar foto de perfil');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome,
          nome_completo: nomeCompleto
        })
        .eq('id', user.id);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Configurações</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Gerencie suas informações pessoais
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Principais */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center gap-6 mb-8">
              <div className="relative">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.nome}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
                    <User className="w-12 h-12 text-primary-600 dark:text-primary-400" />
                  </div>
                )}
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-2 bg-white dark:bg-dark-paper rounded-full shadow-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-light transition-colors"
                >
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={uploading}
                  />
                  <Camera className="w-4 h-4" />
                </label>
              </div>

              <div>
                <h2 className="text-xl font-bold">{profile.nome}</h2>
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-1">
                  <Calendar className="w-4 h-4" />
                  <span>Membro desde {new Date(user.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                {error && (
                  <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                    Perfil atualizado com sucesso!
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nome de Exibição
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="input"
                    placeholder="Como você quer ser chamado?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    className="input"
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    className="input bg-gray-50 dark:bg-dark-light"
                    disabled
                  />
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Informações Adicionais */}
        <div>
          <div className="card p-6">
            <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
              <Trophy className="w-5 h-5" />
              <h3 className="text-lg font-bold">Presida.Club</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Versão 1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;