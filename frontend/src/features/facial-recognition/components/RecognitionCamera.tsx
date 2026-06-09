import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Skeleton,
} from '@mui/material';
import NoPhotographyIcon from '@mui/icons-material/NoPhotography';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import type { RecognitionCameraProps } from '../types/recognition.types';

const liveIndicatorSx = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  bgcolor: '#ef4444',
} as const;

export const RecognitionCamera: React.FC<RecognitionCameraProps> = ({
  videoRef,
  stream,
  isLoading,
  permission,
  error,
  onRetry,
}) => {
  const showCameraBlocked = (permission === 'denied' || permission === 'unavailable') && !isLoading;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 560,
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
        {isLoading && (
          <Skeleton
            variant="rectangular"
            width="100%"
            height="100%"
            sx={{ position: 'absolute', inset: 0, borderRadius: 3 }}
          />
        )}

        {showCameraBlocked && (
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

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: stream ? 'block' : 'none',
          }}
        />

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
              component="span"
              sx={liveIndicatorSx}
            />
            <Typography variant="caption" sx={{ color: 'white', fontSize: '0.65rem', fontWeight: 600 }}>
              EN VIVO
            </Typography>
          </Box>
        )}
      </Box>

      {error && (
        <Alert
          severity="error"
          icon={<NoPhotographyIcon />}
          sx={{ width: '100%', maxWidth: 560, borderRadius: 2 }}
          action={
            <Button size="small" color="error" onClick={onRetry} startIcon={<CameraAltIcon />}>
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      )}
    </Box>
  );
};
