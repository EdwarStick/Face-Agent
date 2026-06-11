export type AttendanceStatus = 'presente' | 'ausente' | 'pendiente_salida';

export interface AttendanceRecord {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  documento: string;
  cargo: string | null;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  tiempo_trabajado: number | null;
  estado: AttendanceStatus;
}

export interface AttendanceDetail extends AttendanceRecord {}

export interface AttendanceFiltersState {
  nombre: string;
  documento: string;
  fecha: string;
  desde: string;
  hasta: string;
}

export interface AttendancePagination {
  page: number;
  limit: number;
  total: number;
}

export interface AttendanceStatsResponse {
  total: number;
  hoy: number;
  total_empleados: number;
  presentes: number;
  completados: number;
  ausentes: number;
  pendientes: number;
}

export interface AttendanceListResponse {
  data: AttendanceRecord[];
  pagination: AttendancePagination;
}

export interface DashboardSummary {
  total: number;
  presentes: number;
  ausentes: number;
  pendientes: number;
}

export const DEFAULT_FILTERS: AttendanceFiltersState = {
  nombre: '',
  documento: '',
  fecha: '',
  desde: '',
  hasta: '',
};

export const DEFAULT_PAGINATION: AttendancePagination = {
  page: 1,
  limit: 10,
  total: 0,
};

export interface AsistenciaListApiItem {
  id: string;
  empleado_id: string;
  empleado_nombre: string | null;
  cargo: string | null;
  fecha_marcacion: string;
  tipo: string;
}

export interface AsistenciaFullApiItem {
  id: string;
  empleado_id: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  horas_trabajadas: number | null;
  estado: string | null;
  porcentaje_confianza: number | null;
  fecha_registro: string;
}

export interface EmpleadoApiItem {
  id: string;
  codigo_empleado: string;
  prim_nombre: string;
  seg_nombres: string;
  prim_apellido: string;
  seg_apellido: string;
  cargo: string | null;
}
