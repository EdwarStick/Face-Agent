import React from 'react';
import { Box, Typography, Grid, Paper, Card, CardContent } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export const DashboardPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" color="text.primary" sx={{ fontWeight: 'bold', mb: 1 }}>
        Panel de Control
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Bienvenido al sistema de asistencia con reconocimiento facial FaceAttendance AI.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
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
                  --
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
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
                  --
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
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
                  --
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
