import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Info, Share, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import type { MediaFile } from "../lib/types";
import { api } from "../lib/api";
import { formatBytes, formatDate, formatDateTime } from "../lib/format";
import { spring, springSheet } from "../lib/motion";
import { useAllAlbums } from "../hooks/queries";
import { IconButton, Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import { ShareDialog } from "./ShareDialog";

interface LightboxProps {
  files: MediaFile[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

export function Lightbox({ files, index, onIndexChange }: LightboxProps) {
  const file = index !== null ? files[index] : undefined;
  return createPortal(
    <AnimatePresence>
      {file && index !== null && (
        <Viewer key="viewer" files={files} index={index} file={file} onIndexChange={onIndexChange} />
      )}
    </AnimatePresence>,
    document.body,
  );
}

// Apple's momentum projection: where a flick would come to rest.
const project = (velocity: number, rate = 0.998) => ((velocity / 1000) * rate) / (1 - rate);

function Viewer({ files, index, file, onIndexChange }: { files: MediaFile[]; index: number; file: MediaFile; onIndexChange: (i: number | null) => void }) {
  const queryClient = useQueryClient();
  const [showInfo, setShowInfo] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  const [sharing, setSharing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [direction, setDirection] = useState(0);

  const close = useCallback(() => onIndexChange(null), [onIndexChange]);
  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next < 0 || next >= files.length) return;
      setDirection(delta);
      onIndexChange(next);
    },
    [index, files.length, onIndexChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sharing || confirmDelete) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key.toLowerCase() === "i") setShowInfo((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [close, go, sharing, confirmDelete]);

  const remove = useMutation({
    mutationFn: () => api.files.remove(file.id),
    onSuccess: () => {
      toast.success("Photo deleted");
      setConfirmDelete(false);
      if (files.length <= 1) close();
      else if (index >= files.length - 1) onIndexChange(index - 1);
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["albums"] });
    },
    onError: (e: Error) => toast.error("Couldn't delete photo", { description: e.message }),
  });

  const download = useMutation({
    mutationFn: () => api.files.downloadUrl(file.id),
    onSuccess: ({ download_url }) => {
      const a = document.createElement("a");
      a.href = download_url;
      a.rel = "noopener";
      a.click();
    },
    onError: (e: Error) => toast.error("Couldn't start download", { description: e.message }),
  });

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const projected = info.offset.x + project(info.velocity.x);
    if (projected < -window.innerWidth / 3) go(1);
    else if (projected > window.innerWidth / 3) go(-1);
    else if (info.offset.y > 140 || project(info.velocity.y) > 300) close();
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={file.original_name}
      className="fixed inset-0 z-50 flex text-white"
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      />
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-8 sm:px-5"
        >
          <IconButton label="Close" tone="onMedia" onClick={close}>
            <X className="size-5" />
          </IconButton>
          <div className="min-w-0 flex-1 px-2">
            <p className="truncate text-[15px] font-semibold">{file.original_name}</p>
            <p className="truncate text-xs text-white/60">
              {formatDateTime(file.created_at)}
              <span className="hidden sm:inline"> · {index + 1} of {files.length}</span>
            </p>
          </div>
          <IconButton label="Download" tone="onMedia" onClick={() => download.mutate()} disabled={download.isPending}>
            <Download className="size-[18px]" />
          </IconButton>
          <IconButton label="Share" tone="onMedia" onClick={() => setSharing(true)}>
            <Share className="size-[18px]" />
          </IconButton>
          <IconButton label="Delete" tone="onMedia" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-[18px]" />
          </IconButton>
          <IconButton
            label="Info"
            tone="onMedia"
            onClick={() => setShowInfo((v) => !v)}
            className={clsx(showInfo && "bg-white! text-black!")}
          >
            <Info className="size-[18px]" />
          </IconButton>
        </motion.header>

        {/* stage */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pt-20 pb-8 sm:px-20">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={file.id}
              custom={direction}
              variants={{
                enter: (d: number) => ({ x: d === 0 ? 0 : d > 0 ? "60%" : "-60%", opacity: d === 0 ? 1 : 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d > 0 ? "-60%" : d < 0 ? "60%" : 0, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={spring}
              drag
              dragSnapToOrigin
              dragElastic={0.6}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              onDragEnd={onDragEnd}
              className="flex size-full touch-none items-center justify-center"
            >
              {file.url && (
                <motion.img
                  layoutId={`media-${file.id}`}
                  transition={spring}
                  src={file.url}
                  alt={file.original_name}
                  draggable={false}
                  className="max-h-full max-w-full rounded-sm object-contain select-none"
                />
              )}
            </motion.div>
          </AnimatePresence>

          <NavArrow side="left" disabled={index === 0} onClick={() => go(-1)} />
          <NavArrow side="right" disabled={index === files.length - 1} onClick={() => go(1)} />
        </div>
      </div>

      <AnimatePresence>
        {showInfo && <InfoPanel key="info" file={file} onClose={() => setShowInfo(false)} />}
      </AnimatePresence>

      <ShareDialog file={sharing ? file : null} onClose={() => setSharing(false)} />
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this photo?"
        description={`“${file.original_name}” will be permanently removed from your vault, along with any share links.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              Delete
            </Button>
          </>
        }
      >
        {null}
      </Dialog>
    </motion.div>
  );
}

function NavArrow({ side, disabled, onClick }: { side: "left" | "right"; disabled: boolean; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={clsx(
        "pressable absolute top-1/2 hidden size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/12 backdrop-blur-xl transition-opacity hover:bg-white/22 disabled:pointer-events-none disabled:opacity-0 sm:flex",
        side === "left" ? "left-5" : "right-5",
      )}
    >
      <Icon className="size-6" />
    </button>
  );
}

function InfoPanel({ file, onClose }: { file: MediaFile; onClose: () => void }) {
  const queryClient = useQueryClient();
  const albums = useAllAlbums();

  const move = useMutation({
    mutationFn: (album: number | null) => api.files.move(file.id, album),
    onSuccess: (updated) => {
      const name = albums.data?.find((a) => a.id === updated.album)?.title;
      toast.success(name ? `Moved to ${name}` : "Removed from album");
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["albums"] });
    },
    onError: (e: Error) => toast.error("Couldn't move photo", { description: e.message }),
  });

  const rows: [string, string][] = [
    ["Name", file.original_name],
    ["Type", file.content_type],
    ["Size", formatBytes(file.size)],
    ["Added", formatDate(file.created_at)],
  ];

  return (
    <motion.aside
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={springSheet}
      className="absolute inset-y-0 right-0 z-20 flex w-[min(340px,100vw)] flex-col border-l border-white/10 bg-[#1c1c1e]/90 backdrop-blur-2xl lg:relative"
      aria-label="Photo details"
    >
      <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <h2 className="title text-[17px] font-semibold">Info</h2>
        <IconButton label="Close info" tone="onMedia" className="size-8" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>
      <dl className="mx-5 mt-2 divide-y divide-white/10 rounded-xl bg-white/6">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm">
            <dt className="shrink-0 text-white/60">{k}</dt>
            <dd className="min-w-0 truncate text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <label htmlFor="album-select" className="mx-5 mt-6 mb-2 block text-[13px] font-medium text-white/60">
        Album
      </label>
      <div className="relative mx-5">
        <select
          id="album-select"
          value={file.album ?? ""}
          disabled={move.isPending || albums.isLoading}
          onChange={(e) => move.mutate(e.target.value ? Number(e.target.value) : null)}
          className="h-11 w-full cursor-pointer appearance-none rounded-xl bg-white/10 px-4 pr-10 text-[15px] text-white outline-none focus:ring-2 focus:ring-[#0a84ff]"
        >
          <option value="">Not in an album</option>
          {albums.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
        <ChevronRight className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 rotate-90 text-white/50" />
      </div>
      <p className="mx-5 mt-auto mb-[max(1.25rem,env(safe-area-inset-bottom))] text-xs text-white/40">
        Tip: use ← → to browse, I to toggle info, Esc to close.
      </p>
    </motion.aside>
  );
}
