export interface RecognitionResponse {
  employee_id: number | null;
  employee_name: string | null;
  position: string | null;
  confidence: number;
}

export type RecognitionStatusType = 'idle' | 'loading' | 'success' | 'no_match' | 'error';

export type CameraPermission = 'idle' | 'granted' | 'denied' | 'unavailable';

export interface CameraState {
  stream: MediaStream | null;
  permission: CameraPermission;
  error: string | null;
  isLoading: boolean;
}

export interface UseRecognitionCameraReturn extends CameraState {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => Promise<Blob | null>;
}

export interface RecognitionCameraProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  isLoading: boolean;
  permission: CameraPermission;
  error: string | null;
  onRetry: () => void;
}

export interface RecognitionResultCardProps {
  status: RecognitionStatusType;
  result: RecognitionResponse | null;
  error: string | null;
}

export interface RecognitionStatusProps {
  status: RecognitionStatusType;
}
