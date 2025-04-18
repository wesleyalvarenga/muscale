import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Mail, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Invitation {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
  deleted_at: string | null;
}

export default function MusicianInvites() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetchInvitations();
  }, []);

  async function fetchInvitations() {
    try {
      const { data, error } = await supabase
        .from('musician_invitations')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      toast.error('Erro ao carregar convites');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      // First check if an invitation already exists for this email
      const { data: existingInvites } = await supabase
        .from('musician_invitations')
        .select('*')
        .eq('email', email)
        .is('deleted_at', null)
        .eq('status', 'pending');

      if (existingInvites && existingInvites.length > 0) {
        throw new Error('Já existe um convite pendente para este email');
      }

      // Create invitation
      const { data: newInvitation, error: inviteError } = await supabase
        .from('musician_invitations')
        .insert([{
          email,
          token: crypto.randomUUID(),
          expires_at: expiresAt.toISOString(),
          user_id: user.id
        }])
        .select()
        .single();

      if (inviteError) {
        throw new Error(`Erro ao criar convite: ${inviteError.message}`);
      }

      if (!newInvitation) {
        throw new Error('Nenhum convite foi criado');
      }

      await sendInvitationEmail(newInvitation.id);

      toast.success('Convite enviado com sucesso!');
      setEmail('');
      fetchInvitations();
    } catch (error) {
      console.error('Error details:', error);
      toast.error(error.message || 'Erro ao enviar convite');
    } finally {
      setSending(false);
    }
  }

  async function sendInvitationEmail(invitationId: string) {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invitation_id: invitationId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao enviar email de convite');
    }

    return response.json();
  }

  async function handleResendInvite(invitation: Invitation) {
    if (invitation.status === 'expired') {
      toast.error('Não é possível reenviar um convite expirado');
      return;
    }

    try {
      await sendInvitationEmail(invitation.id);
      toast.success('Convite reenviado com sucesso!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao reenviar convite');
    }
  }

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Convidar Músico</h2>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email do Músico</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                placeholder="email@exemplo.com"
                required
                disabled={sending}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={sending}
            className={`${
              sending 
                ? 'bg-indigo-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            } text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
          >
            {sending ? 'Enviando...' : 'Enviar Convite'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data do Convite
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invitations.map((invitation) => (
              <tr key={invitation.id}>
                <td className="px-6 py-4 whitespace-nowrap">{invitation.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      invitation.status === 'accepted'
                        ? 'bg-green-100 text-green-800'
                        : invitation.status === 'expired'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {invitation.status === 'accepted'
                      ? 'Aceito'
                      : invitation.status === 'expired'
                      ? 'Expirado'
                      : 'Pendente'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(invitation.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {invitation.status === 'pending' && (
                    <button
                      onClick={() => handleResendInvite(invitation)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Reenviar convite"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}