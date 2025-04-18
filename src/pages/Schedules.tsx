import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  FileText,
  Music,
  Plus,
  Eye
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

export default function Schedules() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMusicianId, setCurrentMusicianId] = useState<string | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, [isAdmin]);

  async function fetchSchedules() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let query = supabase
        .from('schedules')
        .select(`
          *,
          location:locations(*),
          times:schedule_times(start_time, end_time),
          rehearsals:schedule_rehearsals(date, start_time),
          musicians:schedule_musicians(
            musician:musicians(*),
            instrument:instruments(*),
            status,
            notes
          )
        `)
        .is('deleted_at', null)
        .order('date', { ascending: true });

      if (!isAdmin) {
        // Get musician ID first
        const { data: musicianData } = await supabase
          .from('musicians')
          .select('id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .single();

        if (!musicianData) throw new Error('Músico não encontrado');
        
        setCurrentMusicianId(musicianData.id);
        
        // Filter schedules where the musician is assigned
        query = query.eq('musicians.musician_id', musicianData.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Erro ao carregar escalas');
    } finally {
      setLoading(false);
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
          {isAdmin ? 'Todas as Escalas' : 'Minhas Escalas'}
        </h2>
        {isAdmin && (
          <button
            onClick={() => navigate('/schedules/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nova Escala
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schedules.map((schedule) => {
          const currentUserAssignment = !isAdmin && currentMusicianId
            ? schedule.musicians.find(m => m.musician.id === currentMusicianId)
            : null;

          return (
            <div
              key={schedule.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col"
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {schedule.title}
                  </h3>
                  {!isAdmin && currentUserAssignment ? (
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
                  ) : (
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        schedule.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : schedule.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {schedule.status === 'confirmed'
                        ? 'Confirmada'
                        : schedule.status === 'cancelled'
                        ? 'Cancelada'
                        : 'Rascunho'}
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-4">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-5 w-5 mr-2" />
                    <span>
                      {format(new Date(schedule.date), "dd 'de' MMMM", { locale: ptBR })}
                    </span>
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

                  {schedule.location && (
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-5 w-5 mr-2" />
                      <span>{schedule.location.name}</span>
                    </div>
                  )}

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
                        {schedule.musicians.map((sm, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium">{sm.musician.name}</span>
                            <span className="text-gray-500"> - {sm.instrument.name}</span>
                            <span
                              className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full ${
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
                        ))}
                      </div>
                    </div>
                  </div>

                  {schedule.notes && (
                    <div className="flex items-start text-gray-600">
                      <FileText className="h-5 w-5 mr-2 mt-1" />
                      <p className="text-sm">{schedule.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 mt-auto">
                <div className="flex justify-end">
                  <button
                    onClick={() => navigate(`/schedules/${schedule.id}`)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Detalhes
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}