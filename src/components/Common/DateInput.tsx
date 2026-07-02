import type { InputHTMLAttributes } from "react";
import { useRef } from "react";

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function DateInput({ className = "", onClick, onFocus, ...props }: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input || input.disabled || input.readOnly) return;
    try {
      (input as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
    } catch {
      // Browsers without showPicker, or calls without user activation, still keep native date input behavior.
    }
  }

  return (
    <input
      {...props}
      ref={inputRef}
      className={`date-input ${className}`.trim()}
      type="date"
      onClick={(event) => {
        onClick?.(event);
        openPicker();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        openPicker();
      }}
    />
  );
}
