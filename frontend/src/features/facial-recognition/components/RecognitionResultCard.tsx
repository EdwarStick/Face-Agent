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
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import type { RecognitionResultCardProps, RecognitionStatusType } from '../types/recognition.types';

const confidenceColor = (value: number): 'success' | 'warning' | 'error' => {
  if (value >= 80) return 'success';
  if (value >= 50) return 'warning';
  return 'error';
};

export const RecognitionResultCard: React.FC<RecognitionResultCardProps> = ({
  status,
  result,
  error,
}) => {
  if (status === 'loading' || status === 'idle') return null;

  if (status === 'success' && result) {
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
            bgcolor: 'success.main',
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

          <Divider sx={{ mb: 2.5 }} />

          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Nivel de confianza
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, color: `${confidenceColor(result.confidence)}.main` }}
              >
                {result.confidence.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(result.confidence, 100)}
              color={confidenceColor(result.confidence)}
              sx={{ height: 8, borderRadius: 4 }}
            />
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
