import { useState, useCallback } from 'react';
import { recognitionService } from '../services/recognitionService';
import type { RecognitionResponse, RecognitionStatusType } from '../types/recognition.types';

export const useFaceRecognition = () => {
  const [status, setStatus] = useState<RecognitionStatusType>('idle');
  const [result, setResult] = useState<RecognitionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const identify = useCallback(async (imageBlob: Blob) => {
    setStatus('loading');
    setResult(null);
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
      let errorMsg = 'Error al realizar el reconocimiento.';

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: {
            data?: {
              detail?: unknown;
            };
          };
          message?: string;
        };

        const detail = axiosErr.response?.data?.detail;

        if (Array.isArray(detail) && detail.length > 0) {
          errorMsg =
            typeof detail[0] === 'object' &&
              detail[0] !== null &&
              'msg' in detail[0]
              ? String(detail[0].msg)
              : JSON.stringify(detail[0]);
        } else if (typeof detail === 'string') {
          errorMsg = detail;
        } else {
          errorMsg = axiosErr.message || errorMsg;
        }
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }

      setError(errorMsg);
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, identify, reset };
};
