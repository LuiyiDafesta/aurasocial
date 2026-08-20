import { useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

let toastListeners: Array<(toasts: ToastMessage[]) => void> = [];
let memoryToasts: ToastMessage[] = [];

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...memoryToasts]));
}

export function showToast(title: string, options?: { type?: ToastType; description?: string; duration?: number }) {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastMessage = {
    id,
    type: options?.type || 'success',
    title,
    description: options?.description,
    duration: options?.duration || 4000,
  };

  memoryToasts = [...memoryToasts, newToast];
  notifyListeners();

  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      memoryToasts = memoryToasts.filter((t) => t.id !== id);
      notifyListeners();
    }, newToast.duration);
  }
}

export function removeToast(id: string) {
  memoryToasts = memoryToasts.filter((t) => t.id !== id);
  notifyListeners();
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>(memoryToasts);

  useEffect(() => {
    toastListeners.push(setToasts);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setToasts);
    };
  }, []);

  const toast = useCallback((title: string, options?: { type?: ToastType; description?: string; duration?: number }) => {
    showToast(title, options);
  }, []);

  return { toasts, toast, removeToast };
}
