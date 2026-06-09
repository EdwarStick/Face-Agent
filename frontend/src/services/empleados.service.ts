import api from '../api/axios';
import type { EmpleadoResponse } from '../features/empleados/types';

export const empleadosService = {
  getAll: async (): Promise<EmpleadoResponse[]> => {
    const { data } = await api.get<EmpleadoResponse[]>('/empleados/');
    return data;
  },
};
