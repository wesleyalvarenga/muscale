import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { 
  Plus,
  X,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface Location {
  id: string;
  name: string;
}

interface Musician {
  id: string;
  name: string;
  active: boolean;
}

interface Instrument {
  id: string;
  name: string;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
}

interface Rehearsal {
  date: string;
  start_time: string;
}

interface ScheduleFormProps {
  onSuccess?: () => void;
}

const initialFormState = {
  title: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  location_id: '',
  notes: '',
};

export default function ScheduleForm({ onSuccess }: ScheduleFormProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [formData, setFormData] = useState(initialFormState);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { start_time: '09:00', end_time: '11:00' }
  ]);
  const [selectedMusicians, setSelectedMusicians] = useState<Array<{
    musician_id: string;
    instrument_id: string;
  }>>([]);
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/schedules');
      return;
    }

    Promise.all([
      fetchLocations(),
      fetchInstruments(),
    ]).then(() => {
      if (id && id !== 'new') {
        fetchSchedule();
      } else {
        fetchAvailableMusicians(formData.date);
        setLoading(false);
      }
    });
  }, [id, isAdmin, navigate]);

  async function fetchLocations() {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Erro ao carregar locais');
    }
  }

  async function fetchAvailableMusicians(date: string) {
    try {
      const { data, error } = await supabase
        .from('musicians')
        .select('*')
        .eq('active', true)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;

      // Get unavailable musicians for the selected date
      const { data: unavailable } = await supabase
        .from('musician_unavailability')
        .select('musician_id')
        .lte('start_date', date)
        .gte('end_date', date)
        .is('deleted_at', null);

      const unavailableIds = new Set((unavailable || []).map(u => u.musician_id));

      // Filter out unavailable musicians
      const availableMusicians = (data || []).filter(
        musician => !unavailableIds.has(musician.id)
      );

      setMusicians(availableMusicians);
    } catch (error) {
      console.error('Error fetching musicians:', error);
      toast.error('Erro ao carregar músicos');
    }
  }

  async function fetchInstruments() {
    try {
      const { data, error } = await supabase
        .from('instruments')
        .select('*')
        .order('name');

      if (error) throw error;
      setInstruments(data || []);
    } catch (error) {
      console.error('Error fetching instruments:', error);
      toast.error('Erro ao carregar instrumentos');
    }
  }

  async function fetchSchedule() {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          times:schedule_times(start_time, end_time),
          rehearsals:schedule_rehearsals(date, start_time),
          musicians:schedule_musicians(
            musician_id,
            instrument_id
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Escala não encontrada');

      setFormData({
        title: data.title,
        date: data.date,
        location_id: data.location_id || '',
        notes: data.notes || '',
      });
      setTimeSlots(data.times || [{ start_time: '09:00', end_time: '11:00' }]);
      setRehearsals(data.rehearsals || []);
      setSelectedMusicians(data.musicians || []);

      // Fetch available musicians for the schedule date
      await fetchAvailableMusicians(data.date);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Erro ao carregar escala');
      navigate('/schedules');
    } finally {
      setLoading(false);
    }
  }

  function validateRehearsalDates(scheduleDate: string, rehearsalDates: Rehearsal[]) {
    const eventDate = new Date(scheduleDate);
    eventDate.setHours(0, 0, 0, 0);

    return rehearsalDates.every(rehearsal => {
      const rehearsalDate = new Date(rehearsal.date);
      rehearsalDate.setHours(0, 0, 0, 0);
      return rehearsalDate < eventDate;
    });
  }

  const handleRehearsalDateChange = (index: number, date: string) => {
    const newRehearsals = [...rehearsals];
    newRehearsals[index].date = date;

    if (validateRehearsalDates(formData.date, newRehearsals)) {
      setRehearsals(newRehearsals);
    } else {
      toast.error('O ensaio deve acontecer antes da data da escala');
    }
  };

  const handleScheduleDateChange = async (date: string) => {
    if (rehearsals.length > 0 && !validateRehearsalDates(date, rehearsals)) {
      toast.error('A nova data da escala não pode ser anterior aos ensaios marcados');
      return;
    }
    
    // Update available musicians for the new date
    await fetchAvailableMusicians(date);

    // Remove any selected musicians who are now unavailable
    const availableMusicianIds = new Set(musicians.map(m => m.id));
    const updatedSelectedMusicians = selectedMusicians.filter(
      sm => availableMusicianIds.has(sm.musician_id)
    );

    setFormData({ ...formData, date });
    setSelectedMusicians(updatedSelectedMusicians);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (selectedMusicians.length === 0) {
      toast.error('Adicione pelo menos um músico à escala');
      return;
    }

    if (timeSlots.length === 0) {
      toast.error('Adicione pelo menos um horário à escala');
      return;
    }

    if (rehearsals.length > 0 && !validateRehearsalDates(formData.date, rehearsals)) {
      toast.error('Os ensaios devem acontecer antes da data da escala');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const scheduleData = {
        title: formData.title,
        date: formData.date,
        location_id: formData.location_id || null,
        notes: formData.notes,
        status: 'draft',
        created_by: user.id
      };

      let scheduleId;

      if (id && id !== 'new') {
        const { data, error } = await supabase
          .from('schedules')
          .update(scheduleData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        scheduleId = data.id;

        // Delete existing data
        await Promise.all([
          supabase.from('schedule_times').delete().eq('schedule_id', scheduleId),
          supabase.from('schedule_rehearsals').delete().eq('schedule_id', scheduleId),
          supabase.from('schedule_musicians').delete().eq('schedule_id', scheduleId)
        ]);
      } else {
        const { data, error } = await supabase
          .from('schedules')
          .insert([scheduleData])
          .select()
          .single();

        if (error) throw error;
        scheduleId = data.id;
      }

      // Insert time slots
      const { error: timesError } = await supabase
        .from('schedule_times')
        .insert(
          timeSlots.map(slot => ({
            schedule_id: scheduleId,
            start_time: slot.start_time,
            end_time: slot.end_time
          }))
        );

      if (timesError) throw timesError;

      // Insert rehearsals
      if (rehearsals.length > 0) {
        const { error: rehearsalsError } = await supabase
          .from('schedule_rehearsals')
          .insert(
            rehearsals.map(rehearsal => ({
              schedule_id: scheduleId,
              date: rehearsal.date,
              start_time: rehearsal.start_time
            }))
          );

        if (rehearsalsError) throw rehearsalsError;
      }

      // Insert musicians
      const { error: musiciansError } = await supabase
        .from('schedule_musicians')
        .insert(
          selectedMusicians.map(sm => ({
            schedule_id: scheduleId,
            musician_id: sm.musician_id,
            instrument_id: sm.instrument_id,
            status: 'pending'
          }))
        );

      if (musiciansError) throw musiciansError;

      toast.success(id && id !== 'new' ? 'Escala atualizada!' : 'Escala criada!');
      
      // Reset form if it's a new schedule
      if (!id || id === 'new') {
        setFormData(initialFormState);
        setTimeSlots([{ start_time: '09:00', end_time: '11:00' }]);
        setSelectedMusicians([]);
        setRehearsals([]);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        navigate('/schedules');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao salvar escala');
    }
  }

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-8">
      {/* Basic Information Section */}
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Título
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="block w-full h-12 px-4 rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleScheduleDateChange(e.target.value)}
              className="block w-full h-12 px-4 rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Local
            </label>
            <select
              value={formData.location_id}
              onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
              className="block w-full h-12 px-4 rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="">Selecione um local</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Time Slots Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h4 className="text-lg font-medium text-gray-900">Horários</h4>
          <button
            type="button"
            onClick={() => setTimeSlots([...timeSlots, { start_time: '', end_time: '' }])}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-primary bg-primary-lighter/20 hover:bg-primary-lighter/30"
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Horário
          </button>
        </div>

        <div className="space-y-4">
          {timeSlots.map((slot, index) => (
            <div key={index} className="flex gap-4 items-start bg-primary/5 p-4 rounded-lg border-l-4 border-primary">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hora Início
                </label>
                <input
                  type="time"
                  value={slot.start_time}
                  onChange={(e) => {
                    const newSlots = [...timeSlots];
                    newSlots[index].start_time = e.target.value;
                    setTimeSlots(newSlots);
                  }}
                  className="block w-full h-12 px-4 rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  required
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hora Fim
                </label>
                <input
                  type="time"
                  value={slot.end_time}
                  onChange={(e) => {
                    const newSlots = [...timeSlots];
                    newSlots[index].end_time = e.target.value;
                    setTimeSlots(newSlots);
                  }}
                  className="block w-full h-12 px-4 rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  required
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const newSlots = [...timeSlots];
                  newSlots.splice(index, 1);
                  setTimeSlots(newSlots);
                }}
                className="inline-flex items-center p-2 border border-transparent rounded-md text-red-600 hover:bg-red-50 mt-8"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Rehearsals Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h4 className="text-lg font-medium text-gray-900">Ensaios</h4>
          <button
            type="button"
            onClick={() => setRehearsals([...rehearsals, { date: '', start_time: '' }])}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-primary bg-primary-lighter/20 hover:bg-primary-lighter/30"
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Ensaio
          </button>
        </div>

        <div className="space-y-4">
          {rehearsals.map((rehearsal, index) => (
            <div key={index} className="flex gap-4 items-start bg-primary/5 p-4 rounded-lg border-l-4 border-primary">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data
                </label>
                <input
                  type="date"
                  value={rehearsal.date}
                  onChange={(e) => handleRehearsalDateChange(index, e.target.value)}
                  max={formData.date}
                  className="block w-full h-12 px-4 rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  required
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hora
                </label>
                <input
                  type="time"
                  value={rehearsal.start_time}
                  onChange={(e) => {
                    const newRehearsals = [...rehearsals];
                    newRehearsals[index].start_time = e.target.value;
                    setRehearsals(newRehearsals);
                  }}
                  className="block w-full h-12 px-4 rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  required
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const newRehearsals = [...rehearsals];
                  newRehearsals.splice(index, 1);
                  setRehearsals(newRehearsals);
                }}
                className="inline-flex items-center p-2 border border-transparent rounded-md text-red-600 hover:bg-red-50 mt-8"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Musicians Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h4 className="text-lg font-medium text-gray-900">Músicos</h4>
          <button
            type="button"
            onClick={() => setSelectedMusicians([...selectedMusicians, { musician_id: '', instrument_id: '' }])}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-primary bg-primary-lighter/20 hover:bg-primary-lighter/30"
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Músico
          </button>
        </div>

        <div className="space-y-4">
          {selectedMusicians.map((selected, index) => (
            <div key={index} className="flex gap-4 items-start bg-primary/5 p-4 rounded-lg border-l-4 border-primary">
              <div className="flex-1">
                <select
                  value={selected.musician_id}
                  onChange={(e) => {
                    const newSelected = [...selectedMusicians];
                    newSelected[index].musician_id = e.target.value;
                    setSelectedMusicians(newSelected);
                  }}
                  className="block w-full h-12 px-4 rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  required
                >
                  <option value="">Selecione um músico</option>
                  {musicians.map((musician) => (
                    <option key={musician.id} value={musician.id}>
                      {musician.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <select
                  value={selected.instrument_id}
                  onChange={(e) => {
                    const newSelected = [...selectedMusicians];
                    newSelected[index].instrument_id = e.target.value;
                    setSelectedMusicians(newSelected);
                  }}
                  className="block w-full h-12 px-4 rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  required
                >
                  <option value="">Selecione um instrumento</option>
                  {instruments.map((instrument) => (
                    <option key={instrument.id} value={instrument.id}>
                      {instrument.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newSelected = [...selectedMusicians];
                  newSelected.splice(index, 1);
                  setSelectedMusicians(newSelected);
                }}
                className="inline-flex items-center p-2 border border-transparent rounded-md text-red-600 hover:bg-red-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Notes Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observações
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        {id && id !== 'new' && (
          <button
            type="button"
            onClick={() => navigate('/schedules')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          {id && id !== 'new' ? 'Atualizar' : 'Criar'} Escala
        </button>
      </div>
    </form>
  );
}