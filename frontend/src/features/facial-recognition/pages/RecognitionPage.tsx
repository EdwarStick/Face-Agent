import React, { useEffect, useCallback } from 'react';
import { Box, Typography, Container, Paper, Button } from '@mui/material';
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNatural';
import FaceIcon from '@mui/icons-material/Face';
import { useRecognitionCamera } from '../hooks/useRecognitionCamera';
import { useFaceRecognition } from '../hooks/useFaceRecognition';
import { RecognitionCamera } from '../components/RecognitionCamera';
import { RecognitionStatus } from '../components/RecognitionStatus';
import { RecognitionResultCard } from '../components/RecognitionResultCard';

const buttonLabel = (status: string): string => {
  switch (status) {
    case 'loading':
      return 'Reconociendo...';
    case 'registering':
      return 'Registrando asistencia...';
    default:
      return 'Reconocer';
  }
};

export const RecognitionPage: React.FC = () => {
  const {
    videoRef,
    stream,
    permission,
    error: cameraError,
    isLoading: cameraLoading,
    startCamera,
    capturePhoto,
  } = useRecognitionCamera();

  const {
    status,
    result,
    attendanceResult,
    error: recError,
    identifyAndRegister,
  } = useFaceRecognition();

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  const handleRecognize = useCallback(async () => {
    if (status === 'loading' || status === 'registering' || !stream) return;

    const blob = await capturePhoto();
    if (!blob) return;

    await identifyAndRegister(blob);
  }, [status, stream, capturePhoto, identifyAndRegister]);

  const handleRetry = useCallback(() => {
    startCamera();
  }, [startCamera]);

  const isBusy = status === 'loading' || status === 'registering';

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <FaceRetouchingNaturalIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Reconocimiento Facial
          </Typography>
        </Box>

        <RecognitionStatus status={status} />

        <RecognitionCamera
          videoRef={videoRef}
          stream={stream}
          isLoading={cameraLoading}
          permission={permission}
          error={cameraError}
          onRetry={handleRetry}
        />

        <Button
          id="btn-recognize"
          variant="contained"
          size="large"
          onClick={handleRecognize}
          disabled={!stream || isBusy}
          startIcon={<FaceIcon />}
          sx={{
            px: 5,
            py: 1.4,
            borderRadius: 3,
            fontSize: '1rem',
            fontWeight: 700,
            minWidth: 220,
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            boxShadow: '0 4px 18px rgba(37,99,235,0.35)',
            '&:hover:not(:disabled)': {
              background: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)',
              boxShadow: '0 6px 24px rgba(37,99,235,0.45)',
            },
            '&:disabled': {
              opacity: 0.6,
            },
          }}
        >
          {buttonLabel(status)}
        </Button>

        <RecognitionResultCard
          status={status}
          result={result}
          attendanceResult={attendanceResult}
          error={recError}
        />
      </Paper>
    </Container>
  );
};
