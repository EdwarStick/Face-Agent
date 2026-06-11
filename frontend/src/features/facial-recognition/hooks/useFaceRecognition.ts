import { useState, useCallback } from 'react';
import { recognitionService } from '../services/recognitionService';
import type {
  AttendanceRecognitionResponse,
  RecognitionResponse,
  RecognitionStatusType,
} from '../types/recognition.types';

export const useFaceRecognition = () => {
  const [status, setStatus] = useState<RecognitionStatusType>('idle');
  const [result, setResult] = useState<RecognitionResponse | null>(null);
  const [attendanceResult, setAttendanceResult] = useState<AttendanceRecognitionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const extractError = (err: unknown): string => {
    let errorMsg = 'Error al realizar el reconocimiento.';

    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as {
        response?: { data?: { detail?: unknown } };
        message?: string;
      };

      const detail = axiosErr.response?.data?.detail;

      if (Array.isArray(detail) && detail.length > 0) {
        errorMsg =
          typeof detail[0] === 'object' &&
            detail[0] !== null &&
            'msg' in detail[0]
            ? String((detail[0] as { msg: string }).msg)
            : JSON.stringify(detail[0]);
      } else if (typeof detail === 'string') {
        errorMsg = detail;
      } else {
        errorMsg = axiosErr.message || errorMsg;
      }
    } else if (err instanceof Error) {
      errorMsg = err.message;
    }

    return errorMsg;
  };

  const identify = useCallback(async (imageBlob: Blob) => {
    setStatus('loading');
    setResult(null);
    setAttendanceResult(null);
    setError(null);

    try {
      const response = await recognitionService.identify(imageBlob);

      if (response.employee_id !== null && response.employee_name) {
        setResult(response);
        setStatus('success');
      } else {
        setResult(response);
        setStatus('no_match');
      }
    } catch (err: unknown) {
      setError(extractError(err));
      setStatus('error');
    }
  }, []);

  const identifyAndRegister = useCallback(async (imageBlob: Blob) => {
    setStatus('loading');
    setResult(null);
    setAttendanceResult(null);
    setError(null);

    try {
      const response = await recognitionService.identifyAndRegisterAttendance(imageBlob);

      setAttendanceResult(response);

      if (!response.reconocido) {
        setStatus('no_match');
        return;
      }

      setResult({
        employee_id: response.empleado_id as unknown as number | null,
        employee_name: response.nombre_completo,
        position: response.cargo,
        confidence: response.confianza ?? 0,
      });

      setStatus('registering');

      setTimeout(() => {
        setStatus('success');
      }, 600);
    } catch (err: unknown) {
      setError(extractError(err));
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setAttendanceResult(null);
    setError(null);
  }, []);

  return {
    status,
    result,
    attendanceResult,
    error,
    identify,
    identifyAndRegister,
    reset,
  };
};
