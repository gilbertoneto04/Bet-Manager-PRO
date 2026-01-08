import React, { useState } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon, ArrowRight, Mail, AlertCircle, CheckCircle2, AtSign } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState(''); // Novo state para cadastro
  const [email, setEmail] = useState(''); // No login, serve como "Identifier" (Email ou User)
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Load existing users
    const storedUsersStr = localStorage.getItem('betManager_users');
    const users: User[] = storedUsersStr ? JSON.parse(storedUsersStr) : [];

    if (isRegistering) {
      // --- LÓGICA DE CADASTRO ---
      if (!name || !email || !password || !username) {
        setError('Preencha todos os campos.');
        return;
      }

      // Validação de duplicidade (Email ou Usuário)
      if (users.some(u => u.email === email)) {
        setError('Este email já está cadastrado.');
        return;
      }
      if (users.some(u => u.username === username)) {
        setError('Este nome de usuário já está em uso.');
        return;
      }

      const newUser: User = {
        id: Math.random().toString(36).substring(7),
        name,
        username,
        email,
        password, // Em produção, usar hash!
        role: users.length === 0 ? 'ADMIN' : 'USER'
      };

      const updatedUsers = [...users, newUser];
      localStorage.setItem('betManager_users', JSON.stringify(updatedUsers));
      
      setSuccess('Conta criada com sucesso! Faça login.');
      setIsRegistering(false);
      setName('');
      setUsername('');
      setPassword('');
      // Mantemos o email preenchido para facilitar o login, ou limpamos se preferir
      setEmail(''); 
    } else {
      // --- LÓGICA DE LOGIN ---
      // identifier pode ser email ou username
      const identifier = email; 
      
      const user = users.find(u => 
        (u.email === identifier || u.username === identifier) && 
        u.password === password
      );

      if (user) {
        // Save session
        localStorage.setItem('betManager_currentUser', JSON.stringify(user));
        onLogin(user);
      } else {
        setError('Usuário/Email ou senha incorretos.');
      }
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setName('');
    setUsername('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
            BetManager Pro
          </h1>
          <p className="text-slate-400">
            {isRegistering ? 'Crie sua conta de acesso' : 'Faça login para continuar'}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm animate-fadeIn">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl flex items-center gap-2 text-sm animate-fadeIn">
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div className="animate-fadeIn space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Usuário (Login)</label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="usuario.login"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all lowercase"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
                {isRegistering ? 'Email' : 'Email ou Usuário'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type={isRegistering ? "email" : "text"}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isRegistering ? "seu@email.com" : "email ou usuario"}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-6 active:scale-[0.98]"
          >
            {isRegistering ? 'Criar Conta' : 'Entrar no Sistema'}
            <ArrowRight size={18} />
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
            <button 
              onClick={toggleMode}
              className="ml-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              {isRegistering ? 'Fazer Login' : 'Cadastre-se'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};