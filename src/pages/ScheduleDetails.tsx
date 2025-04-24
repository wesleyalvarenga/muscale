import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  FileText,
  Music,
  Check,
  X as XIcon,
  Edit,
  Pencil,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface Schedule {
  id: string;
  title: string;
  date: string;
  times: Array<{
    start_time: string;
    end_time: string;
  }>;
  location?: {
    id: string;
    name: string;
    address?: string;
  };
  notes?: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  rehearsals: Array<{
    date: string;
    start_time: string;
  }>;
  musicians: Array<{
    musician: {
      id: string;
      name: string;
    };
    instrument: {
      id: string;
      name: string;
    };
    status: 'pending' | 'confirmed' | 'declined';
    notes?: string;
  }>;
}

export default function ScheduleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [showEditNotes, setShowEditNotes] = useState(false);
  const [currentMusicianId, setCurrentMusicianId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/schedules');
      return;
    }
    fetchSchedule();
  }, [id, navigate]);

  async function fetchSchedule() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let musicianId = null;
      if (!isAdmin) {
        const { data: musicianData } = await supabase
          .from('musicians')
          .select('id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .single();

        if (musicianData) {
          musicianId = musicianData.id;
          setCurrentMusicianId(musicianId);
        }
      }

      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          location:locations(*),
          times:schedule_times(start_time, end_time),
          rehearsals:schedule_rehearsals(date, start_time),
          musicians:schedule_musicians(
            musician:musicians(id, name),
            instrument:instruments(id, name),
            status,
            notes
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Escala não encontrada');

      setSchedule(data);

      if (!isAdmin && musicianId) {
        const currentUserAssignment = data.musicians.find(
          m => m.musician?.id === musicianId
        );
        if (currentUserAssignment) {
          setEditingNotes(currentUserAssignment.notes || '');
        }
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Erro ao carregar escala');
      navigate('/schedules');
    } finally {
      setLoading(false);
    }
  }

  async function handleResponse(status: 'confirmed' | 'declined') {
    if (!schedule || !currentMusicianId) return;

    try {
      const { error } = await supabase
        .from('schedule_musicians')
        .update({ 
          status,
          notes: editingNotes
        })
        .eq('schedule_id', schedule.id)
        .eq('musician_id', currentMusicianId);

      if (error) throw error;

      toast.success(status === 'confirmed' ? 'Escala confirmada!' : 'Escala recusada');
      fetchSchedule();
    } catch (error) {
      console.error('Error updating response:', error);
      toast.error('Erro ao atualizar resposta');
    }
  }

  async function handleUpdateNotes() {
    if (!schedule || !currentMusicianId) return;

    try {
      const { error } = await supabase
        .from('schedule_musicians')
        .update({ notes: editingNotes })
        .eq('schedule_id', schedule.id)
        .eq('musician_id', currentMusicianId);

      if (error) throw error;

      toast.success('Observações atualizadas!');
      setShowEditNotes(false);
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Erro ao atualizar observações');
    }
  }

  async function handleConfirmSchedule() {
    if (!schedule) return;

    try {
      const { error: scheduleError } = await supabase
        .from('schedules')
        .update({ status: 'confirmed' })
        .eq('id', schedule.id);

      if (scheduleError) throw scheduleError;

      toast.success('Escala confirmada!');
      fetchSchedule();
    } catch (error) {
      console.error('Error confirming schedule:', error);
      toast.error('Erro ao confirmar escala');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Escala não encontrada</h2>
      </div>
    );
  }

  const currentUserAssignment = !isAdmin && currentMusicianId
    ? schedule.musicians.find(m => m.musician?.id === currentMusicianId)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/schedules')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Voltar para Escalas
        </button>
        {!isAdmin && currentUserAssignment && (
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              currentUserAssignment.status === 'confirmed'
                ? 'bg-green-100 text-green-800'
                : currentUserAssignment.status === 'declined'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {currentUserAssignment.status === 'confirmed'
              ? 'Confirmado'
              : currentUserAssignment.status === 'declined'
              ? 'Recusado'
              : 'Pendente'}
          </span>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-bold text-gray-900">
              {schedule.title}
            </h2>
            {isAdmin && schedule.status === 'draft' && (
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate(`/schedules/edit/${schedule.id}`)}
                  className="inline-flex items-center px-3 py-1 text-sm font-medium text-primary hover:text-primary-light"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </button>
                <button
                  onClick={handleConfirmSchedule}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Confirmar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center text-gray-600">
                <Calendar className="h-5 w-5 mr-2" />
                <span>
                  {format(new Date(schedule.date), "dd 'de' MMMM", { locale: ptBR })}
                </span>
              </div>

              {schedule.location && (
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5 mr-2" />
                  <div>
                    <span className="font-medium">{schedule.location.name}</span>
                    {schedule.location.address && (
                      <p className="text-sm text-gray-500">{schedule.location.address}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {schedule.times && schedule.times.length > 0 && (
              <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary">
                <div className="flex items-start text-gray-600">
                  <Clock className="h-5 w-5 mr-2 mt-1" />
                  <div className="space-y-2">
                    <div className="font-medium text-primary">Horários</div>
                    {schedule.times.map((time, index) => (
                      <div key={index} className="text-sm">
                        {time.start_time} - {time.end_time}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {schedule.rehearsals && schedule.rehearsals.length > 0 && (
            <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary">
              <div className="flex items-start text-gray-600">
                <Music className="h-5 w-5 mr-2 mt-1" />
                <div className="space-y-2">
                  <div className="font-medium text-primary">Ensaios</div>
                  {schedule.rehearsals.map((rehearsal, index) => (
                    <div key={index} className="text-sm">
                      {format(new Date(rehearsal.date), "dd/MM/yyyy")} às {rehearsal.start_time}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary">
            <div className="flex items-start text-gray-600">
              <Users className="h-5 w-5 mr-2 mt-1" />
              <div className="space-y-2">
                <div className="font-medium text-primary">Músicos</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {schedule.musicians.map((sm, index) => (
                    <div key={index} className="bg-white p-3 rounded-lg shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{sm.musician.name}</p>
                          <p className="text-sm text-gray-500">{sm.instrument.name}</p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            sm.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : sm.status === 'declined'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {sm.status === 'confirmed'
                            ? 'Confirmado'
                            : sm.status === 'declined'
                            ? 'Recusado'
                            : 'Pendente'}
                        </span>
                      </div>
                      {sm.notes && (
                        <p className="mt-2 text-sm text-gray-600 border-t pt-2">
                          {sm.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {schedule.notes && (
            <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary">
              <div className="flex items-start text-gray-600">
                <FileText className="h-5 w-5 mr-2 mt-1" />
                <div className="space-y-1">
                  <div className="font-medium text-primary">
                    Observações da Escala
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{schedule.notes}</p>
                </div>
              </div>
            </div>
          )}

          {!isAdmin && currentUserAssignment && (
            <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-medium text-primary">
                    Minhas Observações
                  </label>
                  <button
                    onClick={() => setShowEditNotes(!showEditNotes)}
                    className="text-primary hover:text-primary-light"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
                
                {showEditNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      rows={3}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setShowEditNotes(false);
                          setEditingNotes(currentUserAssignment.notes || '');
                        }}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleUpdateNotes}
                        className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary-light"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    {editingNotes || 'Nenhuma observação'}
                  </p>
                )}
              </div>
            </div>
          )}

          {!isAdmin && currentUserAssignment?.status === 'pending' && (
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => handleResponse('declined')}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100"
              >
                <XIcon className="h-4 w-4 mr-1" />
                Recusar
              </button>
              <button
                onClick={() => handleResponse('confirmed')}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Confirmar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}