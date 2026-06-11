import api from '../../../api/axios';
import type { HorarioCreate, HorarioResponse, HorarioUpdate } from '../types/horario.types';

export const horarioService = {
  list: async (empleadoId?: string): Promise<HorarioResponse[]> => {
    const params = empleadoId ? { empleado_id: empleadoId } : {};
    const { data } = await api.get<HorarioResponse[]>('/horarios/', { params });
    return data;
  },

  create: async (payload: HorarioCreate): Promise<HorarioResponse> => {
    const { data } = await api.post<HorarioResponse>('/horarios/', payload);
    return data;
  },

  update: async (id: string, payload: HorarioUpdate): Promise<HorarioResponse> => {
    const { data } = await api.put<HorarioResponse>(`/horarios/${id}`, payload);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/horarios/${id}`);
  },
};
