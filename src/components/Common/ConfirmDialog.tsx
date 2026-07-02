import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ open, title, description, confirmText = "确认删除", onCancel, onConfirm }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <AlertTriangle size={24} />
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            取消
          </button>
          <button className="danger-button" type="button" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}
