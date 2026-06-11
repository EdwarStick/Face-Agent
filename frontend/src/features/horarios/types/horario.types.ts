export interface HorarioResponse {
  id: string;
  empleado_id: string;
  dia_semana: number;
  hora_entrada: string;
  hora_salida: string;
  activo: boolean;
}

export interface HorarioCreate {
  empleado_id: string;
  dia_semana: number;
  hora_entrada: string;
  hora_salida: string;
}

export interface HorarioUpdate {
  dia_semana?: number;
  hora_entrada?: string;
  hora_salida?: string;
  activo?: boolean;
}

export const DIAS_SEMANA = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];
