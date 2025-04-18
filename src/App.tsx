import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Music, Mail, Lock, User, Phone, Menu, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Schedules from './pages/Schedules';
import ScheduleDetails from './pages/ScheduleDetails';

function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-primary-lighter/10">
      <header className="bg-primary shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Music className="h-8 w-8 text-white" />
              <h1 className="ml-3 text-2xl font-bold text-white">Muscale</h1>
            </div>
            
            {/* Mobile menu button */}
            {user && (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden text-white hover:text-primary-lighter"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            )}

            {/* Desktop navigation */}
            {user && (
              <nav className="hidden md:flex items-center space-x-6">
                <a href="/dashboard" className="text-primary-lighter hover:text-primary-light transition-colors">
                  Dashboard
                </a>
                <a href="/schedules" className="text-primary-lighter hover:text-primary-light transition-colors">
                  Escalas
                </a>
                <a href="/profile" className="text-primary-lighter hover:text-primary-light transition-colors">
                  Perfil
                </a>
                <button
                  onClick={() => signOut()}
                  className="text-primary-lighter hover:text-primary-light transition-colors"
                >
                  Sair
                </button>
              </nav>
            )}
          </div>

          {/* Mobile navigation */}
          {user && isMenuOpen && (
            <nav className="md:hidden mt-4 pb-4 space-y-2">
              <a 
                href="/dashboard" 
                className="block text-primary-lighter hover:text-primary-light transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </a>
              <a 
                href="/schedules" 
                className="block text-primary-lighter hover:text-primary-light transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Escalas
              </a>
              <a 
                href="/profile" 
                className="block text-primary-lighter hover:text-primary-light transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Perfil
              </a>
              <button
                onClick={() => {
                  signOut();
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left text-primary-lighter hover:text-primary-light transition-colors py-2"
              >
                Sair
              </button>
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

function AuthPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
  });
  const [error, setError] = useState('');

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email ou senha incorretos'
        : 'Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (signUpError) {
        if (signUpError.message === 'User already registered') {
          throw new Error('Este email já está cadastrado. Tente fazer login.');
        }
        throw signUpError;
      }

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            user_id: authData.user.id,
            name: formData.name,
            phone: formData.phone,
            role: 'musician'
          }]);

        if (profileError) throw profileError;

        const { error: musicianError } = await supabase
          .from('musicians')
          .insert([{
            user_id: authData.user.id,
            name: formData.name,
            whatsapp: formData.phone,
            email: formData.email,
            active: true
          }]);

        if (musicianError) throw musicianError;
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center px-4"
      style={{
        backgroundImage: 'linear-gradient(rgba(24, 29, 39, 0.9), rgba(24, 29, 39, 0.9)), url("https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=2070&auto=format&fit=crop")',
        backgroundBlendMode: 'multiply'
      }}
    >
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Music className="h-16 w-16 text-white mx-auto" />
          <h1 className="mt-6 text-4xl font-bold text-white">Muscale</h1>
          <p className="mt-3 text-xl text-white">
            Gestão de Ministério de Louvor
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">
              {view === 'sign_in' ? 'Bem-vindo de volta!' : 'Criar nova conta'}
            </h2>
            <p className="mt-2 text-sm text-white">
              {view === 'sign_in' 
                ? 'Entre com suas credenciais para acessar sua conta'
                : 'Preencha os dados abaixo para criar sua conta'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-white text-sm">
              {error}
            </div>
          )}

          <form onSubmit={view === 'sign_in' ? handleSignIn : handleSignUp} className="space-y-6">
            {view === 'sign_up' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="block w-full h-12 px-4 rounded-lg bg-white/10 border-white/20 text-white placeholder-white focus:ring-white focus:border-white"
                    placeholder="Digite seu nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="block w-full h-12 px-4 rounded-lg bg-white/10 border-white/20 text-white placeholder-white focus:ring-white focus:border-white"
                    placeholder="Digite seu telefone"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                E-mail
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="block w-full h-12 px-4 rounded-lg bg-white/10 border-white/20 text-white placeholder-white focus:ring-white focus:border-white"
                placeholder="Digite seu e-mail"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Senha
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="block w-full h-12 px-4 rounded-lg bg-white/10 border-white/20 text-white placeholder-white focus:ring-white focus:border-white"
                placeholder="Digite sua senha"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-primary bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors ${
                isLoading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {view === 'sign_in' ? 'Entrando...' : 'Criando conta...'}
                </span>
              ) : (
                view === 'sign_in' ? 'Entrar' : 'Criar conta'
              )}
            </button>

            <div className="text-sm text-center">
              {view === 'sign_in' ? (
                <p className="text-white">
                  Não tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setView('sign_up');
                      setError('');
                    }}
                    className="font-medium text-white hover:text-gray-200 transition-colors"
                  >
                    Cadastre-se
                  </button>
                </p>
              ) : (
                <p className="text-white">
                  Já tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setView('sign_in');
                      setError('');
                    }}
                    className="font-medium text-white hover:text-gray-200 transition-colors"
                  >
                    Faça login
                  </button>
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-lighter/10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { isAdmin } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedules"
          element={
            <ProtectedRoute>
              <Layout>
                <Schedules />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedules/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <ScheduleDetails />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App