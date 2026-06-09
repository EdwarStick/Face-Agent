import React, { useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Alert,
  Skeleton,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import NoPhotographyIcon from '@mui/icons-material/NoPhotography';
import { useCamera } from '../hooks/useCamera';
import type { FaceCameraProps } from '../types/facial.types';

/**
 * Componente que muestra el stream en tiempo real de la cámara
 * y permite capturar una fotografía.
 */
export const FaceCamera: React.FC<FaceCameraProps> = ({ onCapture, onError }) => {
  const { videoRef, stream, permission, error, isLoading, startCamera, capturePhoto } =
    useCamera();

  // Iniciar cámara al montar el componente
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  // Propagar errores al padre
  useEffect(() => {
    if (error) {
      onError(error);
    }
  }, [error, onError]);

  const handleCapture = async () => {
    const result = await capturePhoto();
    if (result) {
      onCapture(result.blob, result.url);
    } else {
      onError('No se pudo capturar la imagen. Intenta de nuevo.');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* Área de video */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          aspectRatio: '4/3',
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: '#0a0a0a',
          border: '2px solid',
          borderColor: stream ? 'primary.main' : 'divider',
          boxShadow: stream
            ? '0 0 0 3px rgba(37,99,235,0.15), 0 8px 32px rgba(0,0,0,0.18)'
            : 'none',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
      >
        {/* Skeleton mientras carga */}
        {isLoading && (
          <Skeleton
            variant="rectangular"
            width="100%"
            height="100%"
            sx={{ position: 'absolute', inset: 0, borderRadius: 3 }}
          />
        )}

        {/* Estado de error / sin cámara */}
        {(permission === 'denied' || permission === 'unavailable') && !isLoading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              color: 'text.disabled',
            }}
          >
            <NoPhotographyIcon sx={{ fontSize: 56, opacity: 0.4 }} />
            <Typography variant="caption" sx={{ opacity: 0.6, textAlign: 'center', px: 2 }}>
              Cámara no disponible
            </Typography>
          </Box>
        )}

        {/* Indicador de carga */}
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
            }}
          >
            <CircularProgress size={40} />
          </Box>
        )}

        {/* Video en tiempo real */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            // Espejo para efecto selfie natural
            transform: 'scaleX(-1)',
            display: stream ? 'block' : 'none',
          }}
        />

        {/* Overlay guía facial */}
        {stream && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Óvalo guía */}
            <Box
              sx={{
                width: '55%',
                height: '75%',
                border: '2px dashed rgba(255,255,255,0.45)',
                borderRadius: '50%',
                boxShadow: 'inset 0 0 0 1px rgba(37,99,235,0.3)',
              }}
            />
          </Box>
        )}

        {/* Indicador "En vivo" */}
        {stream && (
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 0.6,
              bgcolor: 'rgba(0,0,0,0.5)',
              px: 1,
              py: 0.4,
              borderRadius: 1,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#ef4444',
                animation: 'pulse 1.4s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.3 },
                },
              }}
            />
            <Typography variant="caption" sx={{ color: 'white', fontSize: '0.65rem', fontWeight: 600 }}>
              EN VIVO
            </Typography>
          </Box>
        )}
      </Box>

      {/* Alerta de error */}
      {error && (
        <Alert
          severity="error"
          icon={<NoPhotographyIcon />}
          sx={{ width: '100%', maxWidth: 480, borderRadius: 2 }}
          action={
            <Button size="small" color="error" onClick={startCamera} startIcon={<CameraAltIcon />}>
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Botón capturar */}
      {stream && (
        <Button
          id="btn-capture-photo"
          variant="contained"
          size="large"
          onClick={handleCapture}
          startIcon={<PhotoCameraIcon />}
          sx={{
            px: 5,
            py: 1.4,
            borderRadius: 3,
            fontSize: '1rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            boxShadow: '0 4px 18px rgba(37,99,235,0.35)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)',
              boxShadow: '0 6px 24px rgba(37,99,235,0.45)',
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          Tomar Foto
        </Button>
      )}

      {/* Consejo de posicionamiento */}
      {stream && (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          Centra tu rostro en el óvalo y asegúrate de tener buena iluminación
        </Typography>
      )}
    </Box>
  );
};

export default FaceCamera;
