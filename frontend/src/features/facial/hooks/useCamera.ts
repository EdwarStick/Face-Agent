import { useRef, useState, useCallback, useEffect } from 'react';
import type { CameraState, CameraPermission } from '../types/facial.types';

interface UseCameraReturn extends CameraState {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => Promise<{ blob: Blob; url: string } | null>;
}

/**
 * Hook para gestionar el ciclo de vida de la cámara web.
 * Maneja permisos, stream de video y captura de fotogramas.
 */
export const useCamera = (): UseCameraReturn => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<CameraState>({
    stream: null,
    permission: 'idle',
    error: null,
    isLoading: false,
  });

  const stopCamera = useCallback(() => {
    setState((prev) => {
      if (prev.stream) {
        prev.stream.getTracks().forEach((track) => track.stop());
      }
      return { ...prev, stream: null };
    });
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    // Verificar soporte del navegador
    if (!navigator.mediaDevices?.getUserMedia) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        permission: 'unavailable',
        error: 'Tu navegador no soporta acceso a la cámara.',
      }));
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setState({
        stream: mediaStream,
        permission: 'granted' as CameraPermission,
        error: null,
        isLoading: false,
      });
    } catch (err: unknown) {
      let errorMsg = 'No se pudo acceder a la cámara.';
      let permission: CameraPermission = 'denied';

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = 'Permiso de cámara denegado. Por favor, permite el acceso en la configuración de tu navegador.';
          permission = 'denied';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = 'No se encontró ninguna cámara en este dispositivo.';
          permission = 'unavailable';
        } else if (err.name === 'NotReadableError') {
          errorMsg = 'La cámara está siendo usada por otra aplicación.';
          permission = 'unavailable';
        }
      }

      setState({
        stream: null,
        permission,
        error: errorMsg,
        isLoading: false,
      });
    }
  }, []);

  /**
   * Captura el fotograma actual del video y lo devuelve como Blob + URL de objeto.
   */
  const capturePhoto = useCallback(async (): Promise<{ blob: Blob; url: string } | null> => {
    if (!videoRef.current || !state.stream) return null;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Espejo horizontal para experiencia natural (selfie)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const url = URL.createObjectURL(blob);
          resolve({ blob, url });
        },
        'image/jpeg',
        0.92,
      );
    });
  }, [state.stream]);

  // Limpieza automática al desmontar el componente
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    ...state,
    startCamera,
    stopCamera,
    capturePhoto,
  };
};
