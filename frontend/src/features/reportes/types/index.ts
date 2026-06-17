export interface ResumenDiario {
  fecha: string;
  total_empleados: number;
  presentes: number;
  ausentes: number;
  ya_salieron: number;
  porcentaje_asistencia: number;
}

export interface DetalleAsistenciaHoy {
  empleado_id: string;
  nombre_completo: string;
  cargo: string | null;
  area: string | null;
  hora_entrada: string | null;
  hora_salida: string | null;
  horas_trabajadas: number | null;
  estado: string | null;
  porcentaje_confianza: number | null;
}

export interface AsistenciasHoy {
  fecha: string;
  asistencias: DetalleAsistenciaHoy[];
}

export interface EstadisticasEmpleado {
  empleado_id: string;
  nombre_completo: string;
  cargo: string | null;
  area: string | null;
  total_dias: number;
  promedio_horas: number | null;
  ultima_asistencia: string | null;
}
