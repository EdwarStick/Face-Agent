import api from '../../../api/axios';
import type {
  AsistenciaFullApiItem,
  AsistenciaListApiItem,
  EmpleadoApiItem,
} from '../types/attendance.types';

export const attendanceService = {
  getAllEmployees: async (): Promise<EmpleadoApiItem[]> => {
    const { data } = await api.get<EmpleadoApiItem[]>('/empleados/');
    return data;
  },

  getTodayAttendance: async (): Promise<AsistenciaFullApiItem[]> => {
    const { data } = await api.get<AsistenciaFullApiItem[]>('/asistencias/hoy');
    return data;
  },

  getRecentAttendance: async (
    limite = 100,
  ): Promise<AsistenciaListApiItem[]> => {
    const { data } = await api.get<AsistenciaListApiItem[]>('/asistencias/', {
      params: { limite },
    });
    return data;
  },

  getRecordsByEmployee: async (
    empleadoId: string,
  ): Promise<AsistenciaFullApiItem[]> => {
    const { data } = await api.get<AsistenciaFullApiItem[]>(
      `/asistencias/empleado/${empleadoId}`,
    );
    return data;
  },
};
