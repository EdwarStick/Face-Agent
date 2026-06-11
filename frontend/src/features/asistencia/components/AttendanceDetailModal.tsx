import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import type { AttendanceDetail } from '../types/attendance.types';
import { AttendanceStatusChip } from './AttendanceStatusChip';

interface Props {
  open: boolean;
  onClose: () => void;
  detail: AttendanceDetail | null;
  loading: boolean;
  error: string | null;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <Stack direction="row" spacing={1}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160, fontWeight: 600 }}>
        {label}:
      </Typography>
      <Typography variant="body2" color="text.primary">
        {value ?? '-'}
      </Typography>
    </Stack>
  );
}

function AusenteContent({ detail }: { detail: AttendanceDetail }) {
  return (
    <Stack spacing={2} sx={{ pt: 1 }}>
      <Field label="Empleado" value={detail.empleado_nombre} />
      <Field label="Documento" value={detail.documento} />
      <Field label="Cargo" value={detail.cargo} />
      <Field label="Fecha" value={detail.fecha ? new Date(detail.fecha).toLocaleDateString() : null} />
      <Stack direction="row" spacing={1}>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160, fontWeight: 600 }}>
          Estado:
        </Typography>
        <AttendanceStatusChip estado={detail.estado} />
      </Stack>
      <Alert severity="info" sx={{ mt: 1 }}>
        Sin registro de asistencia para esta fecha.
      </Alert>
    </Stack>
  );
}

function PresenteContent({ detail }: { detail: AttendanceDetail }) {
  return (
    <Stack spacing={2} sx={{ pt: 1 }}>
      <Field label="Empleado" value={detail.empleado_nombre} />
      <Field label="Documento" value={detail.documento} />
      <Field label="Cargo" value={detail.cargo} />
      <Field label="Fecha" value={detail.fecha ? new Date(detail.fecha).toLocaleDateString() : null} />
      <Field
        label="Hora entrada"
        value={detail.hora_entrada ? new Date(detail.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null}
      />
      <Field
        label="Hora salida"
        value={detail.hora_salida ? new Date(detail.hora_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null}
      />
      <Field
        label="Tiempo trabajado"
        value={detail.tiempo_trabajado != null ? `${detail.tiempo_trabajado.toFixed(2)} hrs` : null}
      />
      <Stack direction="row" spacing={1}>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160, fontWeight: 600 }}>
          Estado:
        </Typography>
        <AttendanceStatusChip estado={detail.estado} />
      </Stack>
    </Stack>
  );
}

export function AttendanceDetailModal({ open, onClose, detail, loading, error }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Detalle de Asistencia
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
        {!loading && !error && detail && (
          detail.estado === 'ausente'
            ? <AusenteContent detail={detail} />
            : <PresenteContent detail={detail} />
        )}
      </DialogContent>
    </Dialog>
  );
}
