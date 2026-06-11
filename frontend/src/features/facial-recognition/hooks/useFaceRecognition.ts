import { useState, useCallback } from 'react';
import { recognitionService } from '../services/recognitionService';
import type { RecognitionResponse, RecognitionStatusType } from '../types/recognition.types';
import { parseError } from '../../../utils/errorParser';

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
      const errorMsg = parseError(err, 'Error al realizar el reconocimiento.');
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
