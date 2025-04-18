import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [whatsapp, setWhatsapp] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    verifyToken();
  }, [token]);

  async function verifyToken() {
    if (!token) {
      toast.error('Token de convite inválido');
      navigate('/');
      return;
    }

    try {
      const { data: invitation, error } = await supabase
        .from('musician_invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !invitation) {
        toast.error('Convite inválido ou expirado');
        navigate('/');
        return;
      }

      if (new Date(invitation.expires_at) < new Date()) {
        await supabase
          .from('musician_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);

        toast.error('Este convite expirou');
        navigate('/');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao verificar convite');
      navigate('/');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const { data: invitation } = await supabase
        .from('musician_invitations')
        .select('*')
        .eq('token', token)
        .single();

      if (!invitation) {
        toast.error('Convite não encontrado');
        return;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
      });

      if (authError) throw authError;

      // Create musician profile
      const { error: musicianError } = await supabase
        .from('musicians')
        .insert([
          {
            name,
            whatsapp,
            email: invitation.email,
            user_id: authData.user?.id,
            active: true
          }
        ]);

      if (musicianError) throw musicianError;

      // Update invitation status
      await supabase
        .from('musician_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      toast.success('Conta criada com sucesso!');
      navigate('/');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao criar conta');
    }
  }

  if (loading) {
    return <div>Verificando convite...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Aceitar Convite
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nome
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                WhatsApp
              </label>
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Criar Conta
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}