import api from '../../../api/axios';
import type { FaceRegisterResponse } from '../types/facial.types';

/**
 * Convierte un Blob a string base64 (sin el prefijo data:...).
 */
const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Eliminar el prefijo "data:image/jpeg;base64," y devolver solo el contenido
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/**
 * Servicio para el registro biométrico facial de empleados.
 *
 * Endpoint real del backend:
 *   POST /api/v1/rostros/
 *   Content-Type: application/json
 *   Body: { empleado_id: string, imagen_base64: string }
 */
export const facialService = {
  /**
   * Registra el rostro de un empleado.
   * @param employeeId - UUID del empleado
   * @param imageBlob  - Imagen capturada como Blob (JPEG)
   * @returns FaceRegisterResponse con confirmación del backend
   */
  registerFace: async (
    employeeId: string,
    imageBlob: Blob,
  ): Promise<FaceRegisterResponse> => {
    const imagen_base64 = await blobToBase64(imageBlob);

    const response = await api.post<FaceRegisterResponse>(
      '/rostros/',
      {
        empleado_id: employeeId,
        imagen_base64,
      },
    );

    return response.data;
  },
};
