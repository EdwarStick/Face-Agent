import { useCallback } from 'react';
import { useCamera } from '../../facial/hooks/useCamera';
import type { CameraPermission, CameraState } from '../../facial/types/facial.types';

export interface UseRecognitionCameraReturn extends CameraState {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => Promise<Blob | null>;
}

export const useRecognitionCamera = (): UseRecognitionCameraReturn => {
  const {
    videoRef,
    stream,
    permission,
    error,
    isLoading,
    startCamera,
    stopCamera,
    capturePhoto: capturePhotoWithUrl,
  } = useCamera();

  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    const result = await capturePhotoWithUrl();
    return result?.blob ?? null;
  }, [capturePhotoWithUrl]);

  return {
    videoRef: videoRef as React.RefObject<HTMLVideoElement | null>,
    stream,
    permission: permission as CameraPermission,
    error,
    isLoading,
    startCamera,
    stopCamera,
    capturePhoto,
  };
};
