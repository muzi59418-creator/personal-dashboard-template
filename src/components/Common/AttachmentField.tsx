import { ImagePlus, Trash2, Upload } from "lucide-react";

interface AttachmentFieldProps {
  images: string[];
  onChange: (images: string[]) => void;
  label?: string;
}

export function AttachmentField({ images, onChange, label = "图片附件" }: AttachmentFieldProps) {
  function addFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    Promise.all(
      imageFiles.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => resolve("");
            reader.readAsDataURL(file);
          }),
      ),
    ).then((dataUrls) => {
      const nextImages = [...images, ...dataUrls.filter(Boolean)];
      onChange(nextImages.filter((image, index, all) => all.indexOf(image) === index));
    });
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const imageFiles = Array.from(event.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (imageFiles.length > 0) addFiles(imageFiles);
  }

  function removeImage(target: string) {
    onChange(images.filter((image) => image !== target));
  }

  return (
    <div className="attachment-field" onPaste={handlePaste} tabIndex={0}>
      <div className="attachment-head">
        <label>{label}</label>
        <label className="secondary-button file-button">
          <Upload size={16} />
          选择图片
          <input type="file" accept="image/*" multiple onChange={(event) => addFiles(event.target.files || [])} />
        </label>
      </div>
      <div className="attachment-drop-hint">
        <ImagePlus size={16} />
        <span>可在此区域按 Ctrl + V 粘贴截图，也可上传多张图片。</span>
      </div>
      {images.length > 0 && (
        <div className="attachment-grid">
          {images.map((image) => (
            <div className="attachment-thumb" key={image}>
              <img src={image} alt="图片附件预览" />
              <button className="icon-button danger-icon" type="button" aria-label="删除图片" title="删除图片" onClick={() => removeImage(image)}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
