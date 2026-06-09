import React, { useState } from 'react';
import { Button, Tooltip } from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import { FaceCaptureModal } from './FaceCaptureModal';
import type { FaceCaptureButtonProps } from '../types/facial.types';

/**
 * Botón de acceso rápido al flujo de captura facial.
 * Incluye el modal internamente para facilitar su integración.
 */
export const FaceCaptureButton: React.FC<FaceCaptureButtonProps> = ({
  employeeId,
  employeeName,
  onSuccess,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpen = () => setModalOpen(true);
  const handleClose = () => setModalOpen(false);

  const handleSuccess = () => {
    setModalOpen(false);
    onSuccess?.();
  };

  return (
    <>
      <Tooltip title="Registrar rostro para reconocimiento biométrico" placement="top" arrow>
        <Button
          id="btn-register-face"
          variant="contained"
          size="medium"
          onClick={handleOpen}
          startIcon={<FingerprintIcon />}
          sx={{
            borderRadius: 2.5,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
            boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
            '&:hover': {
              background: 'linear-gradient(135deg, #6d28d9 0%, #1d4ed8 100%)',
              boxShadow: '0 6px 20px rgba(124,58,237,0.45)',
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          Registrar Rostro
        </Button>
      </Tooltip>

      <FaceCaptureModal
        open={modalOpen}
        employeeId={employeeId}
        employeeName={employeeName}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default FaceCaptureButton;
