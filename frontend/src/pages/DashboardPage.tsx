import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Paper, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Skeleton, Alert, Chip,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { empleadosService } from '../services/empleados.service';
import { rostrosService } from '../services/rostros.service';
import { marcacionesService } from '../services/marcaciones.service';
import type { MarcacionResponse, MarcacionStats } from '../services/marcaciones.service';

interface DashboardData {
  totalEmpleados: number;
  totalRostros: number;
  marcacionesStats: MarcacionStats;
  ultimasMarcaciones: MarcacionResponse[];
}

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [empleados, rostros, marcacionesStats, ultimasMarcaciones] = await Promise.all([
          empleadosService.getAll(),
          rostrosService.getCount(),
          marcacionesService.getStats(),
          marcacionesService.getUltimas(),
        ]);
        setData({
          totalEmpleados: empleados.length,
          totalRostros: rostros.total,
          marcacionesStats,
          ultimasMarcaciones,
        });
      } catch (err) {
        const message =
          err && typeof err === 'object' && 'response' in err
            ? String((err as { response: { data?: { detail?: string } } }).response?.data?.detail ?? err)
            : 'Error al cargar los datos del panel. Intenta nuevamente.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (error) {
    return (
      <Box>
        <Typography variant="h4" color="text.primary" sx={{ fontWeight: 'bold', mb: 1 }}>
          Panel de Control
        </Typography>
        <Alert severity="error" sx={{ borderRadius: 2, mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" color="text.primary" sx={{ fontWeight: 'bold', mb: 1 }}>
        Panel de Control
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Bienvenido al sistema de asistencia con reconocimiento facial FaceAttendance AI.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 2 }}>
                <PeopleIcon fontSize="large" />
              </Paper>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Empleados
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {loading ? <Skeleton width={40} /> : data!.totalEmpleados}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Paper sx={{ p: 2, bgcolor: 'secondary.light', color: 'secondary.contrastText', borderRadius: 2 }}>
                <CameraAltIcon fontSize="large" />
              </Paper>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Modelos de Rostro
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {loading ? <Skeleton width={40} /> : data!.totalRostros}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText', borderRadius: 2 }}>
                <ScheduleIcon fontSize="large" />
              </Paper>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Marcaciones
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {loading ? <Skeleton width={40} /> : data!.marcacionesStats.total}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText', borderRadius: 2 }}>
                <CheckCircleIcon fontSize="large" />
              </Paper>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Marcaciones Hoy
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {loading ? <Skeleton width={40} /> : data!.marcacionesStats.hoy}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {!loading && data!.ultimasMarcaciones.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Últimas Marcaciones
          </Typography>
          <TableContainer
            component={Paper}
            sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Empleado</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Cargo</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Hora</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data!.ultimasMarcaciones.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.empleado_nombre}</TableCell>
                    <TableCell>{m.cargo || '—'}</TableCell>
                    <TableCell>
                      {new Date(m.fecha_marcacion).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(m.fecha_marcacion).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={m.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                        color={m.tipo === 'entrada' ? 'success' : 'warning'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default DashboardPage;
