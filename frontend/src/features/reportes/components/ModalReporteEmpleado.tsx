import { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Stack,
  Box,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HistoryIcon from '@mui/icons-material/History';
import { useEstadisticasEmpleado } from '../hooks/useReportes';

interface Props {
  open: boolean;
  empleadoId: string | null;
  onClose: () => void;
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number | null }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160, fontWeight: 600 }}>
        {label}:
      </Typography>
      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
        {value ?? '-'}
      </Typography>
    </Stack>
  );
}

export function ModalReporteEmpleado({ open, empleadoId, onClose }: Props) {
  const { estadisticas, loading, error } = useEstadisticasEmpleado(empleadoId);

  useEffect(() => {
    if (!open) return;
  }, [open]);

  const formatDate = (iso: string | null): string => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString([], {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Reporte Individual
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && estadisticas && (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Field icon={<PersonIcon />} label="Nombre" value={estadisticas.nombre_completo} />
            <Field icon={<WorkIcon />} label="Cargo" value={estadisticas.cargo} />
            <Field icon={<BusinessIcon />} label="Área" value={estadisticas.area} />
            <Divider />
            <Field icon={<CalendarMonthIcon />} label="Total de Días" value={estadisticas.total_dias} />
            <Field
              icon={<AccessTimeIcon />}
              label="Promedio Horas"
              value={estadisticas.promedio_horas != null ? `${estadisticas.promedio_horas.toFixed(2)} hrs` : null}
            />
            <Field icon={<HistoryIcon />} label="Última Asistencia" value={formatDate(estadisticas.ultima_asistencia)} />
          </Stack>
        )}
        {!loading && !error && !estadisticas && (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No se encontraron datos para este empleado.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
