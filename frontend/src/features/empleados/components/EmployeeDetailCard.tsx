import React from 'react';
import { Card, CardContent, Typography, Grid, Chip, Box, Avatar, Divider } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BadgeIcon from '@mui/icons-material/Badge';
import DomainIcon from '@mui/icons-material/Domain';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import type { EmpleadoResponse } from '../types';

interface EmployeeDetailCardProps {
  employee: EmpleadoResponse;
}

export const EmployeeDetailCard: React.FC<EmployeeDetailCardProps> = ({ employee }) => {
  const formatFullName = () => {
    return [
      employee.prim_nombre,
      employee.seg_nombres,
      employee.prim_apellido,
      employee.seg_apellido,
    ]
      .filter(Boolean)
      .join(' ');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No registrado';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
      <Box sx={{ bgcolor: 'primary.dark', p: 4, display: 'flex', alignItems: 'center', gap: 3, color: 'white' }}>
        <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.light', border: '3px solid white' }}>
          <PersonIcon sx={{ fontSize: 48 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {formatFullName()}
          </Typography>
          <Typography variant="subtitle1" sx={{ opacity: 0.8 }}>
            {employee.cargo || 'Sin Cargo'}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Chip
              label={employee.activo ? 'Activo' : 'Inactivo'}
              color={employee.activo ? 'success' : 'default'}
              size="small"
              sx={{ fontWeight: 'bold', bgcolor: employee.activo ? 'success.main' : 'rgba(255,255,255,0.2)', color: 'white' }}
            />
          </Box>
        </Box>
      </Box>

      <CardContent sx={{ p: 4 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontWeight: 'bold' }}>
          Información Personal y Laboral
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <BadgeIcon color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Documento / Código
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {employee.codigo_empleado}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <DomainIcon color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Área / Departamento
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {employee.area || 'No asignado'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <EmailIcon color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Correo Electrónico
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {employee.correo || 'No registrado'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <PhoneIcon color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Teléfono
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {employee.telefono || 'No registrado'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CalendarTodayIcon color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Fecha de Registro
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {formatDate(employee.created_at)}
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CalendarTodayIcon color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Última Actualización
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {formatDate(employee.updated_at)}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default EmployeeDetailCard;
