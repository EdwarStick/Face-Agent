import api from '../../../api/axios';
import type {
  AttendanceRecognitionResponse,
  RecognitionResponse,
} from '../types/recognition.types';

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = reader.result as string;

      const base64 = result.split(',')[1];

      resolve(base64);
    };

    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });
};

export const recognitionService = {
  identify: async (imageBlob: Blob): Promise<RecognitionResponse> => {
    const imagen_base64 = await blobToBase64(imageBlob);

    const { data } = await api.post<Record<string, unknown>>(
      '/reconocimiento/identificar',
      {
        imagen_base64,
      }
    );

    return {
      employee_id: (data.empleado_id as number | null) ?? null,
      employee_name: (data.nombre_completo as string | null) ?? null,
      position: (data.cargo as string | null) ?? null,
      confidence: (data.confianza as number) ?? 0,
    };
  },

  identifyAndRegisterAttendance: async (
    imageBlob: Blob,
  ): Promise<AttendanceRecognitionResponse> => {
    const imagen_base64 = await blobToBase64(imageBlob);

    const { data } = await api.post<AttendanceRecognitionResponse>(
      '/reconocimiento/marcar',
      {
        imagen_base64,
      },
    );

    return data;
  },
};