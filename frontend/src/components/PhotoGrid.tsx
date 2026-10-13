import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import clsx from "clsx";
import type { MediaFile } from "../lib/types";
import { formatDay } from "../lib/format";
import { Spinner } from "./ui/Spinner";

interface PhotoGridProps {
  files: MediaFile[];
  onOpen: (index: number) => void;
  groupByDay?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export function PhotoGrid({ files, onOpen, groupByDay = true, hasMore, loadingMore, onLoadMore }: PhotoGridProps) {
  const groups = useMemo(() => {
    if (!groupByDay) return [{ label: null as string | null, items: files.map((file, index) => ({ file, index })) }];
    const out: { label: string | null; items: { file: MediaFile; index: number }[] }[] = [];
    files.forEach((file, index) => {
      const label = formatDay(file.created_at);
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push({ file, index });
      else out.push({ label, items: [{ file, index }] });
    });
    return out;
  }, [files, groupByDay]);

  // Infinite scroll: fetch the next page as the sentinel approaches the viewport.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || !onLoadMore) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && onLoadMore(), { rootMargin: "800px" });
    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    <div className="mx-auto max-w-[1400px] px-1 sm:px-8">
      {groups.map((group, g) => (
        <section key={`${group.label}-${g}`} className="mb-6">
          {group.label && (
            <h2 className="title px-3 pt-5 pb-3 text-[17px] font-semibold sm:px-0">{group.label}</h2>
          )}
          <ul className="grid grid-cols-3 gap-0.5 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-1.5">
            {group.items.map(({ file, index }) => (
              <Tile key={file.id} file={file} index={index} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
      <div ref={sentinel} className="flex h-20 items-center justify-center text-fg-3">
        {loadingMore && <Spinner className="size-5" />}
      </div>
    </div>
  );
}

const Tile = memo(function Tile({ file, index, onOpen }: { file: MediaFile; index: number; onOpen: (i: number) => void }) {
  const [loaded, setLoaded] = useState(false);
  const placeholder = file.thumbnail_url;

  return (
    <motion.li
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", bounce: 0, duration: 0.45, delay: Math.min(index % 60, 24) * 0.015 }}
    >
      <button
        onClick={() => onOpen(index)}
        aria-label={`Open ${file.original_name}`}
        className="group pressable relative block aspect-square w-full cursor-pointer overflow-hidden bg-surface-2 sm:rounded-lg"
      >
        {placeholder && (
          <img src={placeholder} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover blur-md" />
        )}
        {file.url && (
          <motion.img
            layoutId={`media-${file.id}`}
            src={file.url}
            alt={file.original_name}
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={() => setLoaded(true)}
            className={clsx(
              "absolute inset-0 size-full object-cover transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
        )}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" />
        <span className="pointer-events-none absolute inset-x-2 bottom-1.5 truncate text-left text-xs font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          {file.original_name}
        </span>
      </button>
    </motion.li>
  );
});

export function GridSkeleton({ count = 18 }: { count?: number }) {
  return (
    <div className="mx-auto max-w-[1400px] px-1 pt-5 sm:px-8" aria-busy="true" aria-label="Loading photos">
      <div className="skeleton mx-3 mb-3 h-5 w-32 rounded-md sm:mx-0" />
      <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-1.5">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="skeleton aspect-square sm:rounded-lg" />
        ))}
      </div>
    </div>
  );
}
