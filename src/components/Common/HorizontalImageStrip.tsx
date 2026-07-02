import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ImagePreviewModal } from "./ImagePreviewModal";

interface HorizontalImageStripProps {
  images: string[];
  onRemove: (index: number) => void;
}

export function HorizontalImageStrip({ images, onRemove }: HorizontalImageStripProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    if (previewIndex !== null && previewIndex >= images.length) setPreviewIndex(images.length > 0 ? images.length - 1 : null);
  }, [images.length, previewIndex]);

  if (images.length === 0) return null;

  function scrollStrip(direction: "previous" | "next") {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const distance = Math.max(160, Math.floor(scroller.clientWidth * 0.8));
    scroller.scrollBy({ left: direction === "previous" ? -distance : distance, behavior: "smooth" });
  }

  return (
    <div className="horizontal-image-strip-shell">
      <button className="icon-button image-strip-arrow" type="button" aria-label="向左滑动图片" title="向左滑动" onClick={() => scrollStrip("previous")}>
        <ChevronLeft size={18} />
      </button>
      <div className="horizontal-image-strip" ref={scrollerRef} tabIndex={0} aria-label="已添加图片附件">
        {images.map((image, index) => (
          <div className="image-strip-thumb" key={`${image}-${index}`}>
            <button className="image-strip-preview-button" type="button" onClick={() => setPreviewIndex(index)}>
              <img src={image} alt={`图片附件 ${index + 1}`} />
              <span>{index + 1}</span>
            </button>
            <button
              className="icon-button danger-icon image-strip-remove"
              type="button"
              aria-label={`删除图片附件 ${index + 1}`}
              title="删除图片"
              onClick={() => onRemove(index)}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <button className="icon-button image-strip-arrow" type="button" aria-label="向右滑动图片" title="向右滑动" onClick={() => scrollStrip("next")}>
        <ChevronRight size={18} />
      </button>
      {previewIndex !== null && (
        <ImagePreviewModal images={images} currentIndex={previewIndex} onClose={() => setPreviewIndex(null)} onChange={setPreviewIndex} />
      )}
    </div>
  );
}
