import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { Calendar as CalendarIcon, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Unavailability {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

export default function Calendar() {
  const [unavailability, setUnavailability] = useState<Unavailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    reason: ''
  });

  useEffect(() => {
    fetchUnavailability();
  }, []);

  async function fetchUnavailability() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: musicianData } = await supabase
        .from('musicians')
        .select('id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single();

      if (!musicianData) throw new Error('Músico não encontrado');

      const { data, error } = await supabase
        .from('musician_unavailability')
        .select('*')
        .eq('musician_id', musicianData.id)
        .is('deleted_at', null)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setUnavailability(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao carregar indisponibilidades');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: musicianData } = await supabase
        .from('musicians')
        .select('id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single();

      if (!musicianData) throw new Error('Músico não encontrado');

      const { error } = await supabase
        .from('musician_unavailability')
        .insert([{
          musician_id: musicianData.id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          reason: formData.reason
        }]);

      if (error) throw error;

      toast.success('Período de indisponibilidade adicionado!');
      setShowForm(false);
      setFormData({
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
        reason: ''
      });
      fetchUnavailability();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao adicionar indisponibilidade');
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('musician_unavailability')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success('Período de indisponibilidade removido!');
      fetchUnavailability();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao remover indisponibilidade');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Calendário de Indisponibilidade
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Adicionar Período
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Data Final
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Motivo
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {unavailability.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {unavailability.map((period) => (
              <div key={period.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {format(new Date(period.start_date), "dd 'de' MMMM", { locale: ptBR })}
                        {' - '}
                        {format(new Date(period.end_date), "dd 'de' MMMM", { locale: ptBR })}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{period.reason}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(period.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            Nenhum período de indisponibilidade registrado
          </div>
        )}
      </div>
    </div>
  );
}