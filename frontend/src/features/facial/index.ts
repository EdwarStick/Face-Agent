// Componentes
export { FaceCaptureButton } from './components/FaceCaptureButton';
export { FaceCaptureModal } from './components/FaceCaptureModal';
export { FaceCamera } from './components/FaceCamera';
export { FacePreview } from './components/FacePreview';

// Hooks
export { useCamera } from './hooks/useCamera';
export { useFaceCapture } from './hooks/useFaceCapture';

// Servicio
export { facialService } from './services/facialService';

// Tipos
export type {
  CaptureStep,
  CameraPermission,
  CameraState,
  FaceCaptureState,
  FaceRegisterResponse,
  FaceCaptureButtonProps,
  FaceCaptureModalProps,
  FaceCameraProps,
  FacePreviewProps,
} from './types/facial.types';
