import type { AttendanceStatus } from '../types/attendance.types';
import Chip from '@mui/material/Chip';

interface Props {
  estado: AttendanceStatus;
}

const config: Record<AttendanceStatus, { label: string; color: 'success' | 'error' | 'warning' }> = {
  presente: { label: 'Presente', color: 'success' },
  ausente: { label: 'Ausente', color: 'error' },
  pendiente_salida: { label: 'Pendiente salida', color: 'warning' },
  completado: { label: 'Jornada terminada', color: 'success' },
};

export function AttendanceStatusChip({ estado }: Props) {
  const { label, color } = config[estado] ?? { label: estado, color: 'default' as const };
  return <Chip label={label} color={color} size="small" variant="outlined" />;
}
