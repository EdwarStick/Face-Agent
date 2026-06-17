import { useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useReportes } from '../hooks/useReportes';
import { ResumenCards } from '../components/ResumenCards';
import { AsistenciasHoyTable } from '../components/AsistenciasHoyTable';
import { ModalReporteEmpleado } from '../components/ModalReporteEmpleado';

export function ReportesDashboardPage() {
  const { resumen, asistencias, loading, error, refetch } = useReportes();
  const [modalEmpleadoId, setModalEmpleadoId] = useState<string | null>(null);

  const handleVerReporte = (empleadoId: string) => {
    setModalEmpleadoId(empleadoId);
  };

  const handleCerrarModal = () => {
    setModalEmpleadoId(null);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Reportes del Día
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refetch}
          disabled={loading}
        >
          Actualizar
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && !resumen && !asistencias ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {resumen && (
            <Box sx={{ mb: 4 }}>
              <ResumenCards resumen={resumen} />
            </Box>
          )}

          <Box sx={{ mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Asistencias de Hoy
            </Typography>
            {asistencias && (
              <AsistenciasHoyTable
                asistencias={asistencias.asistencias}
                onVerReporte={handleVerReporte}
              />
            )}
          </Box>
        </>
      )}

      <ModalReporteEmpleado
        open={modalEmpleadoId !== null}
        empleadoId={modalEmpleadoId}
        onClose={handleCerrarModal}
      />
    </Box>
  );
}
