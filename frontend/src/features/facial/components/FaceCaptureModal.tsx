import React, { useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Alert,
  Button,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import ReplayIcon from '@mui/icons-material/Replay';
import { FaceCamera } from './FaceCamera';
import { FacePreview } from './FacePreview';
import { useFaceCapture } from '../hooks/useFaceCapture';
import type { FaceCaptureModalProps } from '../types/facial.types';

const STEPS = ['Capturar foto', 'Revisar', 'Confirmar'];

const stepIndexMap: Record<string, number> = {
  camera: 0,
  preview: 1,
  uploading: 1,
  success: 2,
  error: 2,
};

/**
 * Modal completo de captura facial.
 * Gestiona los pasos del flujo y la limpieza al cerrar.
 */
export const FaceCaptureModal: React.FC<FaceCaptureModalProps> = ({
  open,
  employeeId,
  employeeName,
  onClose,
  onSuccess,
}) => {
  const {
    step,
    capturedImageUrl,
    error,
    totalTomas,
    infoMessage,
    setCapture,
    retake,
    upload,
    reset,
  } = useFaceCapture();

  const activeStep = stepIndexMap[step] ?? 0;

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSidebarSuccess = useCallback(() => {
    onSuccess?.();
    handleClose();
  }, [onSuccess, handleClose]);

  const handleCapture = useCallback(
    (blob: Blob, url: string) => {
      setCapture(blob, url);
    },
    [setCapture],
  );

  const handleCameraError = useCallback((_err: string) => {
    // El error ya se muestra dentro de FaceCamera
  }, []);

  const handleConfirm = useCallback(() => {
    upload(employeeId);
  }, [upload, employeeId]);

  return (
    <Dialog
      open={open}
      onClose={step === 'uploading' ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          },
        },
      }}
    >
      {/* Header del modal */}
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #1e293b 0%, #2563eb 100%)',
          color: 'white',
          py: 2.5,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <FingerprintIcon sx={{ fontSize: 28, opacity: 0.9 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Registro Facial
          </Typography>
          {employeeName && (
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              {employeeName} {totalTomas > 0 && `(Tomas: ${totalTomas} / 4)`}
            </Typography>
          )}
        </Box>

        {step !== 'uploading' && (
          <IconButton
            id="btn-close-face-modal"
            onClick={handleClose}
            size="small"
            sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'white' } }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Stepper de progreso */}
        {step !== 'success' && step !== 'error' && (
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {/* Indicadores de tomas faciales individuales */}
        {step !== 'success' && step !== 'error' && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 2,
              mb: 3,
            }}
          >
            {[1, 2, 3, 4].map((i) => {
              const isSaved = i <= totalTomas;
              const isCurrent =
                i === totalTomas + 1 &&
                (step === 'camera' || step === 'preview' || step === 'uploading');
              return (
                <Box
                  key={i}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    border: '2px solid',
                    borderColor: isSaved
                      ? 'success.main'
                      : isCurrent
                      ? 'primary.main'
                      : 'grey.300',
                    bgcolor: isSaved
                      ? 'success.main'
                      : isCurrent
                      ? 'rgba(37,99,235,0.08)'
                      : 'transparent',
                    color: isSaved
                      ? 'white'
                      : isCurrent
                      ? 'primary.main'
                      : 'text.disabled',
                    boxShadow: isCurrent ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
                    transition: 'all 0.25s ease',
                  }}
                >
                  {isSaved ? '✓' : i}
                </Box>
              );
            })}
          </Box>
        )}

        {/* ── Paso: Cámara ── */}
        {step === 'camera' && (
          <FaceCamera
            onCapture={handleCapture}
            onError={handleCameraError}
            totalTomas={totalTomas}
            infoMessage={infoMessage}
          />
        )}

        {/* ── Paso: Vista previa / Enviando ── */}
        {(step === 'preview' || step === 'uploading') && capturedImageUrl && (
          <FacePreview
            imageUrl={capturedImageUrl}
            onRetake={retake}
            onConfirm={handleConfirm}
            isUploading={step === 'uploading'}
          />
        )}

        {/* ── Paso: Éxito ── */}
        {step === 'success' && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 4,
              gap: 2,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'success.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                '@keyframes scaleIn': {
                  from: { transform: 'scale(0)', opacity: 0 },
                  to: { transform: 'scale(1)', opacity: 1 },
                },
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main' }} />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.dark' }}>
              ¡Rostro Registrado!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 340 }}>
              Se han registrado con éxito las {totalTomas} tomas faciales de{' '}
              <strong>{employeeName ?? 'el empleado'}</strong> en el sistema biométrico.
            </Typography>

            <Button
              id="btn-close-success"
              variant="contained"
              color="success"
              size="large"
              onClick={handleSidebarSuccess}
              sx={{ mt: 1, borderRadius: 2.5, px: 4, fontWeight: 700 }}
            >
              Entendido
            </Button>
          </Box>
        )}

        {/* ── Paso: Error ── */}
        {step === 'error' && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 3,
              gap: 2,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: 'error.lighter',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 44, color: 'error.main' }} />
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.dark' }}>
              No se pudo registrar el rostro
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: '100%', borderRadius: 2, textAlign: 'left' }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
              <Button
                id="btn-retry-capture"
                variant="outlined"
                startIcon={<ReplayIcon />}
                onClick={retake}
                sx={{ borderRadius: 2.5 }}
              >
                Intentar de Nuevo
              </Button>
              <Button
                id="btn-close-error"
                variant="contained"
                color="error"
                onClick={handleClose}
                sx={{ borderRadius: 2.5 }}
              >
                Cerrar
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FaceCaptureModal;
