import { useRef, useState, useCallback, useEffect } from 'react';
import type { CameraPermission, CameraState, UseRecognitionCameraReturn } from '../types/recognition.types';

export const useRecognitionCamera = (): UseRecognitionCameraReturn => {
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

    if (!navigator.mediaDevices?.getUserMedia) {
      setState({
        stream: null,
        isLoading: false,
        permission: 'unavailable',
        error: 'Tu navegador no soporta acceso a la cámara.',
      });
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
        permission: 'granted',
        error: null,
        isLoading: false,
      });
    } catch (err: unknown) {
      let errorMsg = 'No se pudo acceder a la cámara.';
      let permission: CameraPermission = 'denied';

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = 'Permiso de cámara denegado.';
          permission = 'denied';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = 'No se encontró ninguna cámara.';
          permission = 'unavailable';
        } else if (err.name === 'NotReadableError') {
          errorMsg = 'La cámara está siendo usada por otra aplicación.';
          permission = 'unavailable';
        }
      }

      setState({ stream: null, permission, error: errorMsg, isLoading: false });
    }
  }, []);

  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    if (!videoRef.current || !state.stream) return null;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
  }, [state.stream]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return {
    videoRef,
    ...state,
    startCamera,
    stopCamera,
    capturePhoto,
  };
};
