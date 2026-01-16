import React, { useState } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon, ArrowRight, Mail, AlertCircle, CheckCircle2, AtSign } from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  
  // Used for both Email or Username in login mode
  const [loginInput, setLoginInput] = useState(''); 
  
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegistering) {
        // --- REGISTRO ---
        if (!name || !loginInput || !password || !username) {
          throw new Error('Preencha todos os campos.');
        }

        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
           throw new Error('Este nome de usuário já está em uso.');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, loginInput, password);
        const firebaseUser = userCredential.user;

        await updateProfile(firebaseUser, { displayName: name });

        const newUser: User = {
          id: firebaseUser.uid,
          name,
          username: username.toLowerCase(),
          email: loginInput,
          role: 'AGENCIA' // Default role is now AGENCIA
        };

        await setDoc(doc(db, "users", firebaseUser.uid), newUser);
        
        setSuccess('Conta criada com sucesso! Você já pode fazer login.');
        setIsRegistering(false);
        setName('');
        setUsername('');
        setPassword('');
        setLoginInput(''); 
      } else {
        // --- LOGIN ---
        let emailToLogin = loginInput;

        if (!loginInput.includes('@')) {
            const q = query(collection(db, 'users'), where('username', '==', loginInput.toLowerCase()));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                throw new Error('Usuário não encontrado.');
            }
            
            emailToLogin = snapshot.docs[0].data().email;
        }

        const userCredential = await signInWithEmailAndPassword(auth, emailToLogin, password);
        const firebaseUser = userCredential.user;

        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          onLogin(userData);
        } else {
          // Fallback if user doc doesn't exist but auth does
          const fallbackUser: User = {
             id: firebaseUser.uid,
             name: firebaseUser.displayName || 'Usuário',
             username: emailToLogin.split('@')[0],
             email: emailToLogin,
             role: 'AGENCIA'
          };
          onLogin(fallbackUser);
        }
      }
    } catch (err: any) {
      console.error(err);
      let msg = 'Erro ao realizar operação.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Credenciais incorretas.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Este email já está em uso.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setSuccess('');
    setLoginInput('');
    setPassword('');
    setName('');
    setUsername('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-8 rounded-2xl shadow-2xl relative overflow-hidden">
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
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
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
            disabled={loading}
            className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-6 active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Processando...' : (isRegistering ? 'Criar Conta' : 'Entrar no Sistema')}
            {!loading && <ArrowRight size={18} />}
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