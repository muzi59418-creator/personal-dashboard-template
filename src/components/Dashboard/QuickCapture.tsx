import { Save, Upload } from "lucide-react";
import { useState } from "react";
import type { Category, DiaryEntryInput, IdeaInput, Project, WorkItemInput, WorkStatus } from "../../types/dashboard";
import { WORK_STATUSES } from "../../types/dashboard";
import { todayInputValue } from "../../utils/date";
import { DateInput } from "../Common/DateInput";
import { HorizontalImageStrip } from "../Common/HorizontalImageStrip";

type CaptureType = "idea" | "diary" | "work";

interface PastedScreenshot {
  dataUrl: string;
  width?: number;
  height?: number;
}

interface QuickCaptureProps {
  categories: Category[];
  projects: Project[];
  onCreateDiary: (input: DiaryEntryInput) => void;
  onCreateIdea: (input: IdeaInput) => void;
  onCreateWorkItem: (input: WorkItemInput) => void;
}

export function QuickCapture({
  categories,
  projects,
  onCreateDiary,
  onCreateIdea,
  onCreateWorkItem,
}: QuickCaptureProps) {
  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const [type, setType] = useState<CaptureType>("idea");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [categoryId, setCategoryId] = useState(sortedCategories[0]?.id || "");
  const [status, setStatus] = useState<WorkStatus>(WORK_STATUSES[0]);
  const [projectId, setProjectId] = useState("");
  const [screenshots, setScreenshots] = useState<PastedScreenshot[]>([]);
  const [error, setError] = useState("");

  function submit() {
    setError("");
    const trimmedContent = content.trim();
    const trimmedTitle = title.trim();
    const images = screenshots.map((screenshot) => screenshot.dataUrl);

    if (!trimmedTitle) {
      setError("请填写标题。");
      return;
    }
    if (type === "work" && !categoryId) {
      setError("请先选择或创建一个分类。");
      return;
    }

    if (type === "idea") {
      onCreateIdea({
        type: images.length > 0 ? "screenshot" : "text",
        title: trimmedTitle,
        content: trimmedContent,
        imageDataUrl: images[0] || "",
        attachments: images,
        status: "unorganized",
        projectId,
        tags: [],
      });
    }

    if (type === "diary") {
      onCreateDiary({
        date,
        title: trimmedTitle,
        content: trimmedContent,
        tags: [],
        linkedProjectIds: projectId ? [projectId] : [],
        images,
      });
    }

    if (type === "work") {
      onCreateWorkItem({
        title: trimmedTitle,
        categoryId,
        status,
        content: trimmedContent,
        date,
        projectId,
        images,
      });
    }

    setTitle("");
    setContent("");
    setProjectId("");
    setScreenshots([]);
  }

  function readImageFile(file: File) {
    return new Promise<PastedScreenshot | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        if (!dataUrl) {
          resolve(null);
          return;
        }
        const image = new window.Image();
        image.onload = () => resolve({ dataUrl, width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => resolve({ dataUrl });
        image.src = dataUrl;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  function addImageFiles(files: File[]) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    Promise.all(imageFiles.map(readImageFile)).then((nextScreenshots) => {
      const validScreenshots = nextScreenshots.filter((screenshot): screenshot is PastedScreenshot => Boolean(screenshot));
      if (validScreenshots.length === 0) return;
      setScreenshots((current) => [...current, ...validScreenshots]);
    });
  }

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const imageFiles = Array.from(event.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (imageFiles.length === 0) return;
    event.preventDefault();
    addImageFiles(imageFiles);
  }

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    addImageFiles(Array.from(event.target.files || []));
    event.currentTarget.value = "";
  }

  function removeScreenshot(index: number) {
    setScreenshots((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <section className="panel quick-capture dashboard-equal-panel">
      <div className="section-head">
        <div>
          <h2>快速记录</h2>
        </div>
        <div className="segmented-control">
          {(["idea", "diary", "work"] as CaptureType[]).map((value) => (
            <button key={value} className={type === value ? "active" : ""} type="button" onClick={() => setType(value)}>
              {value === "idea" ? "灵感" : value === "diary" ? "日记" : "工作"}
            </button>
          ))}
        </div>
      </div>

      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="标题（必填）" aria-label="标题" />
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onPaste={handlePaste}
        placeholder="写下当前内容，或直接 Ctrl + V 粘贴截图"
        aria-label="记录内容"
        rows={5}
      />
      {screenshots.length > 0 && (
        <HorizontalImageStrip images={screenshots.map((screenshot) => screenshot.dataUrl)} onRemove={removeScreenshot} />
      )}
      {type !== "idea" && (
        <div className="form-grid">
          <label>
            日期
            <DateInput value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            关联项目
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">不关联</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {type === "work" && (
        <div className="form-grid">
          <label>
            分类
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            状态
            <select value={status} onChange={(event) => setStatus(event.target.value as WorkStatus)}>
              {WORK_STATUSES.map((itemStatus) => (
                <option key={itemStatus} value={itemStatus}>
                  {itemStatus}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      <div className="quick-capture-actions">
        <div className="quick-capture-upload-group">
          <label className="secondary-button file-button">
            <Upload size={16} />
            选择图片
            <input type="file" accept="image/*" multiple onChange={handleUpload} />
          </label>
          <span>已选 {screenshots.length} 张</span>
        </div>
        <button className="primary-button quick-capture-save-button" type="button" onClick={submit}>
          <Save size={16} />
          保存
        </button>
      </div>
    </section>
  );
}
