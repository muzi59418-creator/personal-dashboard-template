import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" type="button" aria-label="关闭" title="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
