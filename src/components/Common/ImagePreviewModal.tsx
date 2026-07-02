import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImagePreviewModalProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onChange: (index: number) => void;
}

export function ImagePreviewModal({ images, currentIndex, onClose, onChange }: ImagePreviewModalProps) {
  const currentImage = images[currentIndex];
  if (!currentImage) return null;

  const canGoPrevious = images.length > 1;
  const canGoNext = images.length > 1;

  function showPrevious() {
    onChange((currentIndex - 1 + images.length) % images.length);
  }

  function showNext() {
    onChange((currentIndex + 1) % images.length);
  }

  return (
    <div className="image-preview-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="image-preview-modal" role="dialog" aria-modal="true" aria-label="图片预览" onMouseDown={(event) => event.stopPropagation()}>
        <div className="image-preview-toolbar">
          <span>{`${currentIndex + 1} / ${images.length}`}</span>
          <button className="icon-button" type="button" aria-label="关闭图片预览" title="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="image-preview-stage">
          {canGoPrevious && (
            <button className="image-preview-nav previous" type="button" aria-label="上一张图片" title="上一张" onClick={showPrevious}>
              <ChevronLeft size={24} />
            </button>
          )}
          <img src={currentImage} alt={`图片预览 ${currentIndex + 1}`} />
          {canGoNext && (
            <button className="image-preview-nav next" type="button" aria-label="下一张图片" title="下一张" onClick={showNext}>
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
