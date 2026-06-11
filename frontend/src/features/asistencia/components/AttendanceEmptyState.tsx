import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import EventBusyIcon from '@mui/icons-material/EventBusy';

interface Props {
  message?: string;
}

export function AttendanceEmptyState({ message = 'No se encontraron registros de asistencia para los filtros seleccionados.' }: Props) {
  return (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <EventBusyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}
