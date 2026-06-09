import api from '../api/axios';

export interface MarcacionResponse {
  id: string;
  empleado_id: string;
  empleado_nombre: string | null;
  cargo: string | null;
  fecha_marcacion: string;
  tipo: string;
}

export interface MarcacionStats {
  total: number;
  hoy: number;
}

export const marcacionesService = {
  getStats: async (): Promise<MarcacionStats> => {
    const { data } = await api.get<MarcacionStats>('/marcaciones/stats');
    return data;
  },

  getUltimas: async (): Promise<MarcacionResponse[]> => {
    const { data } = await api.get<MarcacionResponse[]>('/marcaciones/');
    return data;
  },
};
