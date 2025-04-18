import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Music, 
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  TrendingUp,
  CalendarCheck,
  CalendarX,
  CalendarClock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface DashboardStats {
  totalSchedules: number;
  totalMusicians: number;
  declinedCount: number;
  pendingCount: number;
  confirmedCount: number;
  topMusicians: Array<{
    name: string;
    confirmed: number;
    total: number;
  }>;
}

interface MusicianStats {
  totalAssignments: number;
  confirmedAssignments: number;
  declinedAssignments: number;
  pendingAssignments: number;
  upcomingSchedules: Array<{
    id: string;
    title: string;
    date: string;
    status: 'pending' | 'confirmed' | 'declined';
  }>;
  participationRate: number;
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSchedules: 0,
    totalMusicians: 0,
    declinedCount: 0,
    pendingCount: 0,
    confirmedCount: 0,
    topMusicians: [],
  });
  const [musicianStats, setMusicianStats] = useState<MusicianStats>({
    totalAssignments: 0,
    confirmedAssignments: 0,
    declinedAssignments: 0,
    pendingAssignments: 0,
    upcomingSchedules: [],
    participationRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardStats();
    } else {
      fetchMusicianStats();
    }
  }, [isAdmin]);

  async function fetchMusicianStats() {
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

      const currentDate = new Date();
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // Get all assignments for the musician
      const { data: assignments, error: assignmentsError } = await supabase
        .from('schedule_musicians')
        .select(`
          status,
          schedule:schedules(
            id,
            title,
            date,
            deleted_at
          )
        `)
        .eq('musician_id', musicianData.id)
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Filter out deleted schedules and process assignments
      const validAssignments = assignments?.filter(
        a => !a.schedule.deleted_at
      ) || [];

      const upcomingSchedules = validAssignments
        .filter(a => new Date(a.schedule.date) >= new Date())
        .map(a => ({
          id: a.schedule.id,
          title: a.schedule.title,
          date: a.schedule.date,
          status: a.status,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);

      const confirmedAssignments = validAssignments.filter(
        a => a.status === 'confirmed'
      ).length;

      const totalAssignments = validAssignments.length;

      setMusicianStats({
        totalAssignments,
        confirmedAssignments,
        declinedAssignments: validAssignments.filter(
          a => a.status === 'declined'
        ).length,
        pendingAssignments: validAssignments.filter(
          a => a.status === 'pending'
        ).length,
        upcomingSchedules,
        participationRate: totalAssignments > 0 
          ? (confirmedAssignments / totalAssignments) * 100 
          : 0,
      });
    } catch (error) {
      console.error('Error fetching musician stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDashboardStats() {
    try {
      const currentDate = new Date();
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // Get total schedules for the current month
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select('id')
        .gte('date', monthStart.toISOString())
        .lte('date', monthEnd.toISOString())
        .is('deleted_at', null);

      if (schedulesError) throw schedulesError;

      // Get total active musicians
      const { data: musicians, error: musiciansError } = await supabase
        .from('musicians')
        .select('id')
        .eq('active', true)
        .is('deleted_at', null);

      if (musiciansError) throw musiciansError;

      // Get response stats for the current month
      const { data: responses, error: responsesError } = await supabase
        .from('schedule_musicians')
        .select(`
          status,
          schedule:schedules(date)
        `)
        .not('status', 'eq', null);

      if (responsesError) throw responsesError;

      // Get top musicians by participation
      const { data: musicianStats, error: musicianStatsError } = await supabase
        .from('schedule_musicians')
        .select(`
          musician:musicians(name),
          status
        `)
        .not('status', 'eq', null)
        .order('created_at', { ascending: false });

      if (musicianStatsError) throw musicianStatsError;

      // Process musician stats
      const musicianParticipation = new Map();
      musicianStats?.forEach(stat => {
        if (!stat.musician?.name) return;
        
        if (!musicianParticipation.has(stat.musician.name)) {
          musicianParticipation.set(stat.musician.name, {
            confirmed: 0,
            total: 0
          });
        }

        const current = musicianParticipation.get(stat.musician.name);
        current.total++;
        if (stat.status === 'confirmed') {
          current.confirmed++;
        }
      });

      // Sort musicians by participation rate
      const topMusicians = Array.from(musicianParticipation.entries())
        .map(([name, stats]) => ({
          name,
          confirmed: stats.confirmed,
          total: stats.total,
          rate: (stats.confirmed / stats.total) * 100
        }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5);

      // Count responses by status
      const monthlyResponses = responses?.filter(r => {
        const scheduleDate = new Date(r.schedule?.date);
        return scheduleDate >= monthStart && scheduleDate <= monthEnd;
      }) || [];

      setStats({
        totalSchedules: schedules?.length || 0,
        totalMusicians: musicians?.length || 0,
        declinedCount: monthlyResponses.filter(r => r.status === 'declined').length,
        pendingCount: monthlyResponses.filter(r => r.status === 'pending').length,
        confirmedCount: monthlyResponses.filter(r => r.status === 'confirmed').length,
        topMusicians,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
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

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-primary">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Meu Dashboard
          </h2>
          <p className="text-gray-600">
            Acompanhe suas participações e próximas escalas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Escalas Confirmadas</p>
                <p className="text-2xl font-semibold text-gray-900">{musicianStats.confirmedAssignments}</p>
              </div>
              <CalendarCheck className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Escalas Pendentes</p>
                <p className="text-2xl font-semibold text-gray-900">{musicianStats.pendingAssignments}</p>
              </div>
              <CalendarClock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Participação</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round(musicianStats.participationRate)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-primary" />
            Próximas Escalas
          </h3>
          <div className="space-y-4">
            {musicianStats.upcomingSchedules.length > 0 ? (
              musicianStats.upcomingSchedules.map((schedule, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{schedule.title}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(schedule.date), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      schedule.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : schedule.status === 'declined'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {schedule.status === 'confirmed'
                      ? 'Confirmado'
                      : schedule.status === 'declined'
                      ? 'Recusado'
                      : 'Pendente'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                Nenhuma escala programada
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Guia Rápido
            </h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Visualize suas escalas
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Confirme sua participação
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Atualize seu perfil
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Mantenha seus dados em dia
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Precisa de ajuda?
            </h3>
            <p className="text-gray-600 mb-4">
              Se você tiver dúvidas sobre como usar o sistema, nossa equipe de suporte está pronta para ajudar:
            </p>
            <a 
              href="mailto:suporte@muscale.com"
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Contatar Suporte
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-primary">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Dashboard Administrativo
        </h2>
        <p className="text-gray-600">
          Visão geral das escalas e engajamento dos músicos em {format(new Date(), 'MMMM', { locale: ptBR })}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Escalas</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalSchedules}</p>
            </div>
            <Calendar className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Músicos Ativos</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalMusicians}</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Confirmação</p>
              <p className="text-2xl font-semibold text-gray-900">
                {Math.round((stats.confirmedCount / (stats.confirmedCount + stats.declinedCount + stats.pendingCount)) * 100 || 0)}%
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Respostas Pendentes</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingCount}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Award className="h-5 w-5 mr-2 text-primary" />
            Top 5 Músicos Mais Engajados
          </h3>
          <div className="space-y-4">
            {stats.topMusicians.map((musician, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="w-8 text-sm font-medium text-gray-500">#{index + 1}</span>
                  <span className="font-medium text-gray-900">{musician.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    {musician.confirmed}/{musician.total} escalas
                  </span>
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(musician.confirmed / musician.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-primary" />
            Status das Respostas
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                <span className="font-medium text-gray-900">Confirmadas</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{stats.confirmedCount} respostas</span>
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full"
                    style={{ 
                      width: `${(stats.confirmedCount / (stats.confirmedCount + stats.declinedCount + stats.pendingCount)) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 mr-2 text-red-500" />
                <span className="font-medium text-gray-900">Recusadas</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{stats.declinedCount} respostas</span>
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full"
                    style={{ 
                      width: `${(stats.declinedCount / (stats.confirmedCount + stats.declinedCount + stats.pendingCount)) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-yellow-500" />
                <span className="font-medium text-gray-900">Pendentes</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{stats.pendingCount} respostas</span>
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 rounded-full"
                    style={{ 
                      width: `${(stats.pendingCount / (stats.confirmedCount + stats.declinedCount + stats.pendingCount)) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}