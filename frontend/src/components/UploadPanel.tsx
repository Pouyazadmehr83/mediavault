import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, ChevronDown, X } from "lucide-react";
import clsx from "clsx";
import { useUploads } from "../providers/uploads";
import { formatBytes } from "../lib/format";
import { spring, springSheet } from "../lib/motion";
import { IconButton } from "./ui/Button";

/** Floating progress panel, bottom-right; collapses to a summary pill. */
export function UploadPanel() {
  const { items, clearFinished } = useUploads();
  const [collapsed, setCollapsed] = useState(false);

  const active = items.filter((i) => i.status === "uploading");
  const failed = items.filter((i) => i.status === "error").length;
  const overall = items.length ? items.reduce((sum, i) => sum + i.progress, 0) / items.length : 0;
  // Tuck the panel away a few seconds after everything succeeds; keep it if anything failed.
  useEffect(() => {
    if (!items.length || active.length || failed) return;
    const t = setTimeout(clearFinished, 4000);
    return () => clearTimeout(t);
  }, [items.length, active.length, failed, clearFinished]);

  const title = active.length
    ? `Uploading ${active.length} ${active.length === 1 ? "photo" : "photos"}`
    : failed
      ? `${failed} upload${failed === 1 ? "" : "s"} failed`
      : "Uploads complete";

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.section
          aria-label="Uploads"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={springSheet}
          className="material fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line shadow-float md:right-6 md:bottom-6"
        >
          <header className="flex items-center gap-2 py-2.5 pr-2 pl-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" aria-live="polite">
                {title}
              </p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
                <motion.div
                  className={clsx("h-full rounded-full", failed && !active.length ? "bg-danger" : "bg-accent")}
                  animate={{ width: `${overall * 100}%` }}
                  transition={spring}
                />
              </div>
            </div>
            <IconButton label={collapsed ? "Expand uploads" : "Collapse uploads"} className="size-8" onClick={() => setCollapsed((c) => !c)}>
              <ChevronDown className={clsx("size-4 transition-transform duration-200", collapsed && "rotate-180")} />
            </IconButton>
            {!active.length && (
              <IconButton label="Dismiss" className="size-8" onClick={clearFinished}>
                <X className="size-4" />
              </IconButton>
            )}
          </header>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.ul
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={spring}
                className="max-h-72 overflow-y-auto border-t border-line"
              >
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <img src={item.preview} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{item.name}</p>
                      <p className={clsx("truncate text-xs", item.status === "error" ? "text-danger" : "text-fg-2")}>
                        {item.status === "error"
                          ? item.error
                          : item.status === "done"
                            ? formatBytes(item.size)
                            : `${Math.round(item.progress * 100)}% of ${formatBytes(item.size)}`}
                      </p>
                    </div>
                    <StatusIcon status={item.status} progress={item.progress} />
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function StatusIcon({ status, progress }: { status: string; progress: number }) {
  if (status === "done")
    return (
      <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="flex size-6 items-center justify-center rounded-full bg-success text-white">
        <Check className="size-3.5" strokeWidth={3} />
      </motion.span>
    );
  if (status === "error") return <AlertCircle className="size-6 text-danger" aria-hidden />;
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg className="size-6 -rotate-90 text-accent" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2.5" />
      <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} className="transition-[stroke-dashoffset] duration-200" />
    </svg>
  );
}
