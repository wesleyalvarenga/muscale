import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface Musician {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  active: boolean;
  user_id?: string;
  deleted_at?: string | null;
}

export default function Musicians() {
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchCurrentUser();
    fetchMusicians();
  }, [isAdmin]);

  async function fetchCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  }

  async function fetchMusicians() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Você precisa estar autenticado para ver músicos');
        return;
      }

      let query = supabase
        .from('musicians')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      // If not admin, only show own musicians
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMusicians(data || []);
    } catch (error) {
      toast.error('Erro ao carregar músicos');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleMusicianStatus(musician: Musician) {
    try {
      const { error } = await supabase
        .from('musicians')
        .update({ active: !musician.active })
        .eq('id', musician.id);

      if (error) throw error;

      toast.success(`Músico ${musician.active ? 'desativado' : 'ativado'} com sucesso!`);
      fetchMusicians();
    } catch (error) {
      toast.error('Erro ao atualizar status do músico');
      console.error('Error:', error);
    }
  }

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isAdmin ? 'Todos os Músicos' : 'Meus Músicos'}
          </h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                WhatsApp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {musicians.map((musician) => (
              <tr key={musician.id}>
                <td className="px-6 py-4 whitespace-nowrap">{musician.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{musician.whatsapp}</td>
                <td className="px-6 py-4 whitespace-nowrap">{musician.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      musician.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {musician.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(isAdmin || musician.user_id === currentUserId) && (
                    <button
                      onClick={() => toggleMusicianStatus(musician)}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        musician.active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {musician.active ? 'Desativar' : 'Ativar'}
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