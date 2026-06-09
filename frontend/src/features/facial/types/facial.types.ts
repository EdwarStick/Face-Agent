// Estados del flujo de captura facial
export type CaptureStep = 'camera' | 'preview' | 'uploading' | 'success' | 'error';

// Estado de permisos de cámara
export type CameraPermission = 'idle' | 'granted' | 'denied' | 'unavailable';

// Respuesta del backend al registrar un rostro (RostroResponse de FastAPI)
export interface FaceRegisterResponse {
  id: string;
  empleado_id: string;
  ruta_imagen?: string | null;
  fecha_registro?: string | null;
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
}

// Props del componente de vista previa
export interface FacePreviewProps {
  imageUrl: string;
  onRetake: () => void;
  onConfirm: () => void;
  isUploading: boolean;
}
