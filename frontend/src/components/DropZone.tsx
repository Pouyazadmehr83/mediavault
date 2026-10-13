import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ImageUp } from "lucide-react";
import { useUploads } from "../providers/uploads";
import { spring } from "../lib/motion";

/** Window-wide drop target: drag photos anywhere in the app to upload. */
export function DropZone({ album }: { album: number | null }) {
  const { upload } = useUploads();
  const [active, setActive] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current++;
      setActive(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (!depth.current) setActive(false);
    };
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setActive(false);
      if (e.dataTransfer?.files.length) upload(e.dataTransfer.files, album);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [album, upload]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-accent/10 p-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.94 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.94 }}
            transition={spring}
            className="flex h-full max-h-[480px] w-full max-w-2xl flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-accent bg-surface/90 text-center shadow-float"
          >
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-accent text-white">
              <ImageUp className="size-8" />
            </div>
            <p className="title text-2xl font-semibold">Drop to upload</p>
            <p className="mt-1 text-fg-2">{album ? "Photos will be added to this album" : "JPG, PNG or WebP up to 10 MB"}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
