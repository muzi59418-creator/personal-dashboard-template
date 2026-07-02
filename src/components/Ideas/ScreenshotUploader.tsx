import { useState } from "react";
import { Upload } from "lucide-react";
import type { IdeaInput } from "../../types/dashboard";

interface ScreenshotUploaderProps {
  onCreate: (input: IdeaInput) => void;
}

// Kept for backward import compatibility. The visible upload entry now lives in IdeaForm.
export function ScreenshotUploader({ onCreate }: ScreenshotUploaderProps) {
  const [message, setMessage] = useState("");

  function readImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const imageDataUrl = String(reader.result || "");
      if (!imageDataUrl) return;
      onCreate({
        type: "screenshot",
        title: "未命名图文记录",
        content: "未命名截图素材",
        imageDataUrl,
        attachments: [imageDataUrl],
        status: "unorganized",
        projectId: "",
        tags: [],
      });
      setMessage("截图已保存到图文记录。");
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="upload-box">
      <label className="secondary-button file-button">
        <Upload size={16} />
        选择图片
        <input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && readImage(event.target.files[0])} />
      </label>
      {message && <p className="success-text">{message}</p>}
    </section>
  );
}
