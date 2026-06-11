import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  LinearProgress,
  Alert,
  Divider,
  Chip,
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { RecognitionResultCardProps } from '../types/recognition.types';

const confidenceColor = (value: number): 'success' | 'warning' | 'error' => {
  if (value >= 80) return 'success';
  if (value >= 50) return 'warning';
  return 'error';
};

const formatHora = (fechaHora: string | null): string => {
  if (!fechaHora) return '';
  const date = new Date(fechaHora);
  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).toUpperCase();
};

const formatFecha = (fechaHora: string | null): string => {
  if (!fechaHora) return '';
  const date = new Date(fechaHora);
  return date.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const RecognitionResultCard: React.FC<RecognitionResultCardProps> = ({
  status,
  result,
  attendanceResult,
  error,
}) => {
  if (status === 'loading' || status === 'idle') return null;

  if (status === 'registering') {
    return (
      <Card
        sx={{
          width: '100%',
          maxWidth: 560,
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          border: '1px solid',
          borderColor: 'info.light',
        }}
      >
        <Box
          sx={{
            bgcolor: 'info.main',
            py: 1.5,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            color: 'white',
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Empleado Identificado
          </Typography>
        </Box>

        <CardContent sx={{ p: 3 }}>
          {result && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: 'primary.light',
                  color: 'primary.main',
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                {result.employee_name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </Avatar>

              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {result.employee_name}
                </Typography>
                {result.position && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <WorkIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body1" color="text.secondary">
                      {result.position}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          <Divider sx={{ mb: 2.5 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'info.main' }}>
              <AccessTimeIcon sx={{ fontSize: 28 }} />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Registrando asistencia...
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (status === 'success' && attendanceResult) {
    const isEntrada = attendanceResult.tipo_marcacion === 'entrada';

    return (
      <Card
        sx={{
          width: '100%',
          maxWidth: 560,
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          border: '1px solid',
          borderColor: 'success.light',
          overflow: 'visible',
        }}
      >
        <Box
          sx={{
            bgcolor: isEntrada ? 'success.main' : 'warning.main',
            py: 1.5,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            color: 'white',
          }}
        >
          {isEntrada ? <LoginIcon sx={{ fontSize: 24 }} /> : <LogoutIcon sx={{ fontSize: 24 }} />}
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {attendanceResult.mensaje}
          </Typography>
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: 'primary.light',
                color: 'primary.main',
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {attendanceResult.nombre_completo
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </Avatar>

            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {attendanceResult.nombre_completo}
              </Typography>
              {attendanceResult.cargo && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <WorkIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body1" color="text.secondary">
                    {attendanceResult.cargo}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Divider sx={{ mb: 2.5 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Chip
                icon={isEntrada ? <LoginIcon /> : <LogoutIcon />}
                label={isEntrada ? 'ENTRADA' : 'SALIDA'}
                color={isEntrada ? 'success' : 'warning'}
                size="medium"
                sx={{ fontWeight: 700, px: 1 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {formatFecha(attendanceResult.fecha_hora)}
                </Typography>
              </Box>
            </Box>

            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color: isEntrada ? 'success.main' : 'warning.main' }}
            >
              {formatHora(attendanceResult.fecha_hora)}
            </Typography>

            <Divider />

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Nivel de confianza
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: `${confidenceColor(attendanceResult.confianza ?? 0)}.main` }}
                >
                  {(attendanceResult.confianza ?? 0).toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(attendanceResult.confianza ?? 0, 100)}
                color={confidenceColor(attendanceResult.confianza ?? 0)}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (status === 'no_match' && attendanceResult) {
    return (
      <Card
        sx={{
          width: '100%',
          maxWidth: 560,
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          border: '1px solid',
          borderColor: 'warning.light',
        }}
      >
        <Box
          sx={{
            bgcolor: 'warning.main',
            py: 1.5,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            color: 'white',
          }}
        >
          <PersonOffIcon sx={{ fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Sin Coincidencia
          </Typography>
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
            <PersonOffIcon sx={{ fontSize: 56, color: 'warning.main', opacity: 0.6 }} />
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
              {attendanceResult.mensaje}
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center' }}>
              Intenta nuevamente asegurándote de tener buena iluminación y mirando directamente a la cámara.
            </Typography>
            {attendanceResult.confianza !== null && attendanceResult.confianza !== undefined && (
              <Box sx={{ width: '100%', mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Confianza obtenida
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, color: `${confidenceColor(attendanceResult.confianza)}.main` }}
                  >
                    {attendanceResult.confianza.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(attendanceResult.confianza, 100)}
                  color={confidenceColor(attendanceResult.confianza)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (status === 'no_match') {
    return (
      <Card
        sx={{
          width: '100%',
          maxWidth: 560,
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          border: '1px solid',
          borderColor: 'warning.light',
        }}
      >
        <Box
          sx={{
            bgcolor: 'warning.main',
            py: 1.5,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            color: 'white',
          }}
        >
          <PersonOffIcon sx={{ fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Sin Coincidencia
          </Typography>
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
            <PersonOffIcon sx={{ fontSize: 56, color: 'warning.main', opacity: 0.6 }} />
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
              No se encontró una coincidencia en la base de datos.
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center' }}>
              Intenta nuevamente asegurándote de tener buena iluminación y mirando directamente a la cámara.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Alert
        severity="error"
        sx={{ width: '100%', maxWidth: 560, borderRadius: 2 }}
      >
        {error || 'Ocurrió un error inesperado.'}
      </Alert>
    );
  }

  return null;
};
