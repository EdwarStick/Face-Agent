import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import ErrorIcon from '@mui/icons-material/Error';
import type { RecognitionStatusType, RecognitionStatusProps } from '../types/recognition.types';

const statusInfo: Record<RecognitionStatusType, {
  text: string;
  color: string;
  icon: React.ReactElement;
}> = {
  idle: {
    text: 'Cámara lista para reconocimiento',
    color: 'info.main',
    icon: <VideocamIcon sx={{ fontSize: 20 }} />,
  },
  loading: {
    text: 'Reconociendo empleado...',
    color: 'warning.main',
    icon: <CircularProgress size={20} />,
  },
  registering: {
    text: 'Registrando asistencia...',
    color: 'info.main',
    icon: <CircularProgress size={20} />,
  },
  success: {
    text: 'Empleado identificado',
    color: 'success.main',
    icon: <CheckCircleIcon sx={{ fontSize: 20 }} />,
  },
  no_match: {
    text: 'No se encontró coincidencia',
    color: 'warning.main',
    icon: <PersonOffIcon sx={{ fontSize: 20 }} />,
  },
  error: {
    text: 'Error en el reconocimiento',
    color: 'error.main',
    icon: <ErrorIcon sx={{ fontSize: 20 }} />,
  },
};

export const RecognitionStatus: React.FC<RecognitionStatusProps> = ({ status }) => {
  const info = statusInfo[status];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: 2,
        bgcolor: status === 'idle' ? 'action.hover' : `${info.color}.15`,
        border: '1px solid',
        borderColor: status === 'idle' ? 'divider' : info.color,
      }}
    >
      <Box sx={{ display: 'flex', color: info.color }}>
        {info.icon}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600, color: info.color }}>
        {info.text}
      </Typography>
    </Box>
  );
};
