import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ALLOWED_EXTENSIONS, ApiError, MAX_UPLOAD_BYTES, api } from "../lib/api";
import { formatBytes } from "../lib/format";

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
  preview: string;
}

interface UploadsContextValue {
  items: UploadItem[];
  upload: (files: FileList | File[], album: number | null) => void;
  clearFinished: () => void;
}

const UploadsContext = createContext<UploadsContextValue | null>(null);

function validate(file: File) {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) return "Only JPG, PNG and WebP images are supported";
  if (file.size > MAX_UPLOAD_BYTES) return `Larger than ${formatBytes(MAX_UPLOAD_BYTES)}`;
  return null;
}

export function UploadsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<UploadItem[]>([]);

  const patch = useCallback((id: string, next: Partial<UploadItem>) => {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }, []);

  const upload = useCallback(
    (fileList: FileList | File[], album: number | null) => {
      const files = Array.from(fileList);
      const rejected: string[] = [];
      const queued: { item: UploadItem; file: File }[] = [];

      for (const file of files) {
        const problem = validate(file);
        if (problem) {
          rejected.push(`${file.name}: ${problem}`);
          continue;
        }
        queued.push({
          file,
          item: {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            progress: 0,
            status: "uploading",
            preview: URL.createObjectURL(file),
          },
        });
      }

      if (rejected.length) {
        toast.error(rejected.length === 1 ? "File skipped" : `${rejected.length} files skipped`, {
          description: rejected.slice(0, 3).join("\n"),
        });
      }
      if (!queued.length) return;

      setItems((list) => [...queued.map((q) => q.item), ...list]);

      // Three at a time keeps the connection busy without starving the UI.
      let cursor = 0;
      let succeeded = 0;
      const worker = async () => {
        while (cursor < queued.length) {
          const { item, file } = queued[cursor++];
          try {
            await api.files.upload(file, album, (p) => patch(item.id, { progress: p }));
            patch(item.id, { progress: 1, status: "done" });
            succeeded++;
          } catch (err) {
            patch(item.id, { status: "error", error: err instanceof ApiError ? err.message : "Upload failed" });
          }
        }
      };
      Promise.all(Array.from({ length: Math.min(3, queued.length) }, worker)).then(() => {
        queryClient.invalidateQueries({ queryKey: ["files"] });
        queryClient.invalidateQueries({ queryKey: ["albums"] });
        if (succeeded) toast.success(succeeded === 1 ? "Photo uploaded" : `${succeeded} photos uploaded`);
        // Thumbnails are generated in the background by Celery; pick them up shortly.
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ["files"] }), 2500);
      });
    },
    [patch, queryClient],
  );

  const clearFinished = useCallback(() => {
    setItems((list) => {
      list.filter((i) => i.status !== "uploading").forEach((i) => URL.revokeObjectURL(i.preview));
      return list.filter((i) => i.status === "uploading");
    });
  }, []);

  const value = useMemo(() => ({ items, upload, clearFinished }), [items, upload, clearFinished]);
  return <UploadsContext.Provider value={value}>{children}</UploadsContext.Provider>;
}

export function useUploads() {
  const ctx = useContext(UploadsContext);
  if (!ctx) throw new Error("useUploads must be used inside UploadsProvider");
  return ctx;
}
