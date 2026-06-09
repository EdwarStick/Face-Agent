import React from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Chip,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import type { FacePreviewProps } from '../types/facial.types';

/**
 * Muestra la fotografía capturada y permite confirmarla o repetirla.
 */
export const FacePreview: React.FC<FacePreviewProps> = ({
  imageUrl,
  onRetake,
  onConfirm,
  isUploading,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5 }}>
      {/* Etiqueta de vista previa */}
      <Chip
        icon={<VerifiedUserIcon sx={{ fontSize: 16 }} />}
        label="Vista Previa — Revisa antes de confirmar"
        variant="outlined"
        color="primary"
        size="small"
        sx={{ fontWeight: 600 }}
      />

      {/* Imagen capturada */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          aspectRatio: '4/3',
          borderRadius: 3,
          overflow: 'hidden',
          border: '2px solid',
          borderColor: 'primary.main',
          boxShadow: '0 0 0 3px rgba(37,99,235,0.12), 0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        <img
          src={imageUrl}
          alt="Fotografía capturada para registro facial"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />

        {/* Overlay de carga durante el envío */}
        {isUploading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.55)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
            }}
          >
            <CircularProgress size={48} sx={{ color: 'white' }} />
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
              Registrando rostro…
            </Typography>
          </Box>
        )}
      </Box>

      {/* Texto de ayuda */}
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        ¿La foto se ve bien? Asegúrate de que tu rostro esté visible y bien iluminado.
      </Typography>

      {/* Acciones */}
      <Box sx={{ display: 'flex', gap: 2, width: '100%', maxWidth: 480 }}>
        <Button
          id="btn-retake-photo"
          variant="outlined"
          size="large"
          onClick={onRetake}
          disabled={isUploading}
          startIcon={<ReplayIcon />}
          sx={{ flex: 1, borderRadius: 2.5, fontWeight: 600 }}
        >
          Repetir
        </Button>

        <Button
          id="btn-confirm-face"
          variant="contained"
          size="large"
          onClick={onConfirm}
          disabled={isUploading}
          startIcon={
            isUploading ? (
              <CircularProgress size={18} sx={{ color: 'inherit' }} />
            ) : (
              <CheckCircleOutlineIcon />
            )
          }
          sx={{
            flex: 2,
            borderRadius: 2.5,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            boxShadow: '0 4px 18px rgba(37,99,235,0.3)',
            '&:hover:not(:disabled)': {
              background: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)',
              boxShadow: '0 6px 24px rgba(37,99,235,0.4)',
              transform: 'translateY(-1px)',
            },
            '&:disabled': {
              opacity: 0.7,
            },
            transition: 'all 0.2s ease',
          }}
        >
          {isUploading ? 'Registrando…' : 'Confirmar Registro'}
        </Button>
      </Box>
    </Box>
  );
};

export default FacePreview;
