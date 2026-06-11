// Estados del flujo de captura facial
export type CaptureStep = 'camera' | 'preview' | 'uploading' | 'success' | 'error';

// Estado de permisos de cámara
export type CameraPermission = 'idle' | 'granted' | 'denied' | 'unavailable';

// Respuesta del backend al registrar un rostro (RegistroResponse de FastAPI)
export interface FaceRegisterResponse {
  status: 'success' | 'completed';
  message: string;
  total: number;
}

// Estado interno del hook useCamera
export interface CameraState {
  stream: MediaStream | null;
  permission: CameraPermission;
  error: string | null;
  isLoading: boolean;
}

// Estado interno del hook useFaceCapture
export interface FaceCaptureState {
  step: CaptureStep;
  capturedImageBlob: Blob | null;
  capturedImageUrl: string | null;
  error: string | null;
  totalTomas: number;
  infoMessage: string | null;
}

// Props del botón de captura facial
export interface FaceCaptureButtonProps {
  employeeId: string;
  employeeName?: string;
  onSuccess?: () => void;
}

// Props del modal de captura facial
export interface FaceCaptureModalProps {
  open: boolean;
  employeeId: string;
  employeeName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

// Props del componente de cámara
export interface FaceCameraProps {
  onCapture: (blob: Blob, url: string) => void;
  onError: (error: string) => void;
  totalTomas?: number;
  infoMessage?: string | null;
}

// Props del componente de vista previa
export interface FacePreviewProps {
  imageUrl: string;
  onRetake: () => void;
  onConfirm: () => void;
  isUploading: boolean;
}
