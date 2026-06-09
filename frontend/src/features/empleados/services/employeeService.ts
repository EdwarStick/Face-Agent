import api from '../../../api/axios';
import type { EmpleadoCreate, EmpleadoUpdate, EmpleadoResponse } from '../types';

export const employeeService = {
  getEmployees: async (): Promise<EmpleadoResponse[]> => {
    const response = await api.get<EmpleadoResponse[]>('/empleados/');
    return response.data;
  },

  getEmployee: async (id: string): Promise<EmpleadoResponse> => {
    const response = await api.get<EmpleadoResponse>(`/empleados/${id}`);
    return response.data;
  },

  createEmployee: async (data: EmpleadoCreate): Promise<EmpleadoResponse> => {
    const response = await api.post<EmpleadoResponse>('/empleados/', data);
    return response.data;
  },

  updateEmployee: async (id: string, data: EmpleadoUpdate): Promise<EmpleadoResponse> => {
    const response = await api.put<EmpleadoResponse>(`/empleados/${id}`, data);
    return response.data;
  },

  deleteEmployee: async (id: string): Promise<{ mensaje: string }> => {
    const response = await api.delete<{ mensaje: string }>(`/empleados/${id}`);
    return response.data;
  },
};
