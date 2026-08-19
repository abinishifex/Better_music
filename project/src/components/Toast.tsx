import { useEffect } from 'react';
import { CircleCheck as CheckCircle2, CircleAlert as AlertCircle, X } from 'lucide-react';

export type ToastKind = 'success' | 'error';

export type ToastState = { kind: ToastKind; message: string } | null;

type Props = {
  toast: ToastState;
  onDismiss: () => void;
};

export default function Toast({ toast, onDismiss }: Props) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isError = toast.kind === 'error';

  return (
    <div className={`toast ${toast.kind}`} role="status" aria-live="polite">
      {isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      <span>{toast.message}</span>
      <button
        className="toast-close"
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}
