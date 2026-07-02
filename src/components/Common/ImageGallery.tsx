import { useState } from "react";

interface ImageGalleryProps {
  images: string[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [preview, setPreview] = useState("");
  if (images.length === 0) return null;

  return (
    <>
      <div className="detail-image-grid">
        {images.map((image, index) => (
          <button className="detail-image-button" type="button" key={`${image}-${index}`} onClick={() => setPreview(image)}>
            <img src={image} alt="记录图片附件" />
          </button>
        ))}
      </div>
      {preview && (
        <div className="image-preview-backdrop" role="presentation" onMouseDown={() => setPreview("")}>
          <img src={preview} alt="图片预览" onMouseDown={(event) => event.stopPropagation()} />
        </div>
      )}
    </>
  );
}
