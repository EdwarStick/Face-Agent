import api from '../../../api/axios';
import type { ResumenDiario, AsistenciasHoy, EstadisticasEmpleado } from '../types';

export const reporteService = {
  getResumenDiario: async (): Promise<ResumenDiario> => {
    const response = await api.get<ResumenDiario>('/reportes/resumen-diario');
    return response.data;
  },

  getAsistenciasHoy: async (): Promise<AsistenciasHoy> => {
    const response = await api.get<AsistenciasHoy>('/reportes/asistencias-hoy');
    return response.data;
  },

  getEstadisticasEmpleado: async (empleadoId: string): Promise<EstadisticasEmpleado> => {
    const response = await api.get<EstadisticasEmpleado>(`/reportes/empleado/${empleadoId}`);
    return response.data;
  },
};
