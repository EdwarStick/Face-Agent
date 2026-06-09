import { useState, useCallback } from 'react';
import { facialService } from '../services/facialService';
import type { FaceCaptureState, CaptureStep } from '../types/facial.types';

interface UseFaceCaptureReturn extends FaceCaptureState {
  setCapture: (blob: Blob, url: string) => void;
  retake: () => void;
  upload: (employeeId: string) => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE: FaceCaptureState = {
  step: 'camera',
  capturedImageBlob: null,
  capturedImageUrl: null,
  error: null,
};

/**
 * Hook que orquesta el flujo completo de captura y envío facial.
 * Gestiona los pasos: camera → preview → uploading → success | error
 */
export const useFaceCapture = (): UseFaceCaptureReturn => {
  const [state, setState] = useState<FaceCaptureState>(INITIAL_STATE);

  /**
   * Guarda el blob e URL capturados y avanza al paso de previsualización.
   */
  const setCapture = useCallback((blob: Blob, url: string) => {
    setState({
      step: 'preview' as CaptureStep,
      capturedImageBlob: blob,
      capturedImageUrl: url,
      error: null,
    });
  }, []);

  /**
   * Descarta la foto actual y vuelve al paso de cámara.
   */
  const retake = useCallback(() => {
    setState((prev) => {
      // Revocar URL de objeto para liberar memoria
      if (prev.capturedImageUrl) {
        URL.revokeObjectURL(prev.capturedImageUrl);
      }
      return {
        step: 'camera' as CaptureStep,
        capturedImageBlob: null,
        capturedImageUrl: null,
        error: null,
      };
    });
  }, []);

  /**
   * Envía la imagen capturada al backend.
   */
  const upload = useCallback(async (employeeId: string) => {
    setState((prev) => {
      if (!prev.capturedImageBlob) return prev;
      return { ...prev, step: 'uploading' as CaptureStep, error: null };
    });

    setState((prev) => {
      if (!prev.capturedImageBlob) return prev;

      // Lanzar la petición de forma asíncrona
      facialService
        .registerFace(employeeId, prev.capturedImageBlob)
        .then(() => {
          setState((s) => ({ ...s, step: 'success' as CaptureStep }));
        })
        .catch((err: unknown) => {
          let errorMsg = 'Ocurrió un error al registrar el rostro.';
          if (
            err &&
            typeof err === 'object' &&
            'response' in err
          ) {
            const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
            errorMsg =
              axiosErr.response?.data?.detail ||
              axiosErr.message ||
              errorMsg;
          }
          setState((s) => ({
            ...s,
            step: 'error' as CaptureStep,
            error: errorMsg,
          }));
        });

      return { ...prev, step: 'uploading' as CaptureStep };
    });
  }, []);

  /**
   * Reinicia el estado completo al estado inicial.
   */
  const reset = useCallback(() => {
    setState((prev) => {
      if (prev.capturedImageUrl) {
        URL.revokeObjectURL(prev.capturedImageUrl);
      }
      return INITIAL_STATE;
    });
  }, []);

  return {
    ...state,
    setCapture,
    retake,
    upload,
    reset,
  };
};
