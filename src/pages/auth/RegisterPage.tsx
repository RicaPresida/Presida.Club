import React, { useState, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Sun, Moon, Eye, EyeOff, User, Trophy } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();

  const referralCode = searchParams.get('ref');
  const { signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const validatePassword = (password: string) => {
    const lengthValid = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return {
      lengthValid,
      hasUpperCase,
      hasNumber,
      hasSpecialChar,
      isValid: lengthValid && hasUpperCase && hasNumber && hasSpecialChar,
    };
  };

  const passwordValidation = validatePassword(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email || !password || !name) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (!passwordValidation.isValid) {
      setError('A senha não atende aos critérios mínimos de segurança');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await signUp(email, password, name, referralCode || undefined);

      if (signUpError) {
        setError(signUpError);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('Ocorreu um erro ao criar sua conta');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-8 w-full max-w-md text-center">
          <Trophy className="w-16 h-16 text-primary-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">Verifique seu email</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Enviamos um link de confirmação para {email}. Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
          </p>
          <Link to="/login" className="btn-primary">
            Voltar para Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ backgroundImage: 'url(http://presida.club/wp-content/uploads/2025/05/presida_BG.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 bg-black/50" />

      <button onClick={toggleTheme} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="card p-8 w-full max-w-md relative z-10 bg-white/95 dark:bg-dark-paper/95 backdrop-blur-sm">
        <div className="flex flex-col items-center mb-6">
          <img src="https://presida.club/wp-content/uploads/2025/05/logo_presida_vertical.png" alt="Presida.Club" className="h-24 w-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-center">Crie sua conta no Presida.Club</p>
          {referralCode && <div className="mt-2 text-sm text-primary-600 dark:text-primary-400">Você foi convidado por um amigo! 🎉</div>}
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium mb-1">Nome</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input id="name" type="text" className="input pl-10" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input id="email" type="email" className="input pl-10" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium mb-1">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input id="password" type={showPassword ? "text" : "password"} className="input pl-10 pr-10" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <div className="mt-2 text-xs space-y-1">
              <p className={`flex items-center gap-1 ${passwordValidation.lengthValid ? 'text-green-600' : 'text-gray-400'}`}>✔ Pelo menos 8 caracteres</p>
              <p className={`flex items-center gap-1 ${passwordValidation.hasUpperCase ? 'text-green-600' : 'text-gray-400'}`}>✔ Letra maiúscula</p>
              <p className={`flex items-center gap-1 ${passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>✔ Pelo menos um número</p>
              <p className={`flex items-center gap-1 ${passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-gray-400'}`}>✔ Pelo menos um caractere especial</p>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Criando conta...' : 'Criar conta'}</button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;