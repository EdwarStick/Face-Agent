interface ValidationErrorDetail {
  type: string;
  loc: (string | number)[];
  msg: string;
  input?: any;
}

/**
 * Parses any backend API error to extract a user-friendly string message.
 * Specifically handles FastAPI Pydantic validation errors (arrays of objects)
 * as well as custom error string details and standard Axios/Error objects.
 */
export function parseError(err: unknown, defaultMessage = 'Ocurrió un error inesperado'): string {
  if (!err) return defaultMessage;

  if (typeof err === 'object' && 'response' in err) {
    const axiosErr = err as {
      response?: {
        data?: {
          detail?: string | ValidationErrorDetail[] | unknown;
        };
      };
      message?: string;
    };

    const detail = axiosErr.response?.data?.detail;

    if (Array.isArray(detail)) {
      if (detail.length > 0) {
        const first = detail[0];
        if (typeof first === 'object' && first !== null && 'msg' in first) {
          const valErr = first as ValidationErrorDetail;
          const field = valErr.loc ? valErr.loc.slice(1).join('.') : '';
          const prefix = field ? `Campo '${field}': ` : '';
          return `${prefix}${valErr.msg}`;
        }
        return JSON.stringify(first);
      }
      return defaultMessage;
    }

    if (typeof detail === 'string') {
      return detail;
    }

    if (detail && typeof detail === 'object') {
      if ('msg' in detail) {
        return String((detail as any).msg);
      }
      return JSON.stringify(detail);
    }

    return axiosErr.message || defaultMessage;
  }

  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === 'string') {
    return err;
  }

  return defaultMessage;
}
