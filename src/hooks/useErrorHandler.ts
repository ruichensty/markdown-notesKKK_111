import { useCallback } from 'react';

export interface ErrorInfo {
  message: string;
  code?: string;
  timestamp: number;
}

export function useErrorHandler() {
  const handleError = useCallback((error: Error | string, code?: string) => {
    const message = typeof error === 'string' ? error : error.message;
    console.error('[ErrorHandler]', code || 'ERROR', message);
    return { message, code, timestamp: Date.now() } as ErrorInfo;
  }, []);

  const handleStorageError = useCallback((error: Error) => {
    if (error.name === 'QuotaExceededError') {
      return handleError(
        'Storage quota exceeded. Please delete some notes to free up space.',
        'QUOTA_EXCEEDED'
      );
    }
    if (error.name === 'SecurityError') {
      return handleError(
        'Unable to access storage. Please check your browser permissions.',
        'STORAGE_ACCESS_DENIED'
      );
    }
    return handleError(error, 'STORAGE_ERROR');
  }, [handleError]);

  return {
    handleError,
    handleStorageError,
  };
}
