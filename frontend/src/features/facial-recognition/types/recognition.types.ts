export interface RecognitionResponse {
  employee_id: number | null;
  employee_name: string | null;
  position: string | null;
  confidence: number;
}

export interface AttendanceRecognitionResponse {
  reconocido: boolean;
  empleado_id: string | null;
  nombre_completo: string | null;
  cargo: string | null;
  area: string | null;
  confianza: number | null;
  tipo_marcacion: string | null;
  fecha_hora: string | null;
  mensaje: string;
}

export type RecognitionStatusType =
  | 'idle'
  | 'loading'
  | 'registering'
  | 'success'
  | 'no_match'
  | 'error';

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
  attendanceResult: AttendanceRecognitionResponse | null;
  error: string | null;
}

export interface RecognitionStatusProps {
  status: RecognitionStatusType;
}
