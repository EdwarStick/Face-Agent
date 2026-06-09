export interface EmpleadoCreate {
  codigo_empleado: string;
  prim_nombre: string;
  seg_nombres?: string;
  prim_apellido: string;
  seg_apellido?: string;
  correo?: string;
  telefono?: string;
  cargo?: string;
  area?: string;
}

export interface EmpleadoUpdate {
  codigo_empleado?: string;
  prim_nombre?: string;
  seg_nombres?: string;
  prim_apellido?: string;
  seg_apellido?: string;
  correo?: string;
  telefono?: string;
  cargo?: string;
  area?: string;
  activo?: boolean;
}

export interface EmpleadoResponse {
  id: string;
  codigo_empleado: string;
  prim_nombre: string;
  seg_nombres: string;
  prim_apellido: string;
  seg_apellido: string;
  correo?: string;
  telefono?: string;
  cargo?: string;
  area?: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}
