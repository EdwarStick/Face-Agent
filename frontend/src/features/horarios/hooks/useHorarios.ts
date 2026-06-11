import { useState, useEffect, useCallback } from 'react';
import { horarioService } from '../services/horarioService';
import api from '../../../api/axios';
import type { HorarioCreate, HorarioResponse, HorarioUpdate } from '../types/horario.types';
import type { EmpleadoResponse } from '../../empleados/types/index';

export function useHorarios() {
  const [horarios, setHorarios] = useState<HorarioResponse[]>([]);
  const [employees, setEmployees] = useState<EmpleadoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<string | undefined>(undefined);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, empData] = await Promise.all([
        horarioService.list(selectedEmpleadoId),
        api.get<EmpleadoResponse[]>('/empleados/'),
      ]);
      setHorarios(h);
      setEmployees(empData.data);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? String((err as { response: { data?: { detail?: string } } }).response?.data?.detail ?? err)
        : 'Error al cargar horarios';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedEmpleadoId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = useCallback(async (data: HorarioCreate) => {
    await horarioService.create(data);
    await fetchAll();
  }, [fetchAll]);

  const update = useCallback(async (id: string, data: HorarioUpdate) => {
    await horarioService.update(id, data);
    await fetchAll();
  }, [fetchAll]);

  const remove = useCallback(async (id: string) => {
    await horarioService.remove(id);
    await fetchAll();
  }, [fetchAll]);

  return {
    horarios,
    employees,
    loading,
    error,
    selectedEmpleadoId,
    setSelectedEmpleadoId,
    create,
    update,
    remove,
    refetch: fetchAll,
  };
}
