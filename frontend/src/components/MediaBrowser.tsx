import { useState, type ReactNode } from "react";
import { useOutletContext } from "react-router-dom";
import { ArrowDownUp, ImagePlus, SearchX, TriangleAlert } from "lucide-react";
import type { FileQuery } from "../lib/api";
import { useFiles } from "../hooks/queries";
import { useDebounced } from "../hooks/useDebounced";
import type { ShellContext } from "./AppShell";
import { GridSkeleton, PhotoGrid } from "./PhotoGrid";
import { Lightbox } from "./Lightbox";
import { SearchField } from "./SearchField";
import { EmptyState } from "./ui/EmptyState";
import { Button } from "./ui/Button";

const SORTS = [
  { value: "-created_at", label: "Newest first" },
  { value: "created_at", label: "Oldest first" },
  { value: "original_name", label: "Name" },
  { value: "-size", label: "Largest first" },
] as const;

interface MediaBrowserProps {
  /** Fixed filters (e.g. the album being viewed). */
  scope: Omit<FileQuery, "page" | "page_size" | "search" | "ordering">;
  /** Extra toolbar controls rendered before the sort menu. */
  filters?: ReactNode;
  empty: { title: string; description: string };
  header: (total: number | undefined) => ReactNode;
}

/** Search + sort toolbar, infinite photo grid and lightbox for any file scope. */
export function MediaBrowser({ scope, filters, empty, header }: MediaBrowserProps) {
  const { pickFiles } = useOutletContext<ShellContext>();
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState<string>("-created_at");
  const [open, setOpen] = useState<number | null>(null);
  const debounced = useDebounced(search.trim());

  const query = useFiles({ ...scope, search: debounced || undefined, ordering });
  const { files, total } = query;
  const byDate = ordering.endsWith("created_at");

  let body: ReactNode;
  if (query.isPending) body = <GridSkeleton />;
  else if (query.isError)
    body = (
      <EmptyState
        icon={<TriangleAlert />}
        title="Couldn't load photos"
        description={query.error.message}
        action={<Button variant="secondary" onClick={() => query.refetch()}>Try again</Button>}
      />
    );
  else if (!files.length && debounced)
    body = <EmptyState icon={<SearchX />} title="No results" description={`Nothing matches “${debounced}”. Try a different name.`} />;
  else if (!files.length)
    body = (
      <EmptyState
        icon={<ImagePlus />}
        title={empty.title}
        description={empty.description}
        action={<Button icon={<ImagePlus className="size-4" />} onClick={pickFiles}>Upload photos</Button>}
      />
    );
  else
    body = (
      <PhotoGrid
        files={files}
        onOpen={setOpen}
        groupByDay={byDate}
        hasMore={query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        onLoadMore={() => !query.isFetchingNextPage && query.fetchNextPage()}
      />
    );

  return (
    <>
      {header(query.isPending ? undefined : total)}
      <div className="material sticky top-0 z-20 mt-4 border-b border-line">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-8">
          <SearchField value={search} onChange={setSearch} placeholder="Search photos" />
          {filters}
          <label className="relative ml-auto flex items-center">
            <span className="sr-only">Sort by</span>
            <ArrowDownUp className="pointer-events-none absolute left-3 size-3.5 text-fg-2" aria-hidden />
            <select
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
              className="h-8 cursor-pointer appearance-none rounded-[10px] bg-surface-2 pr-3 pl-8 text-[13px] font-medium text-fg outline-none focus:ring-4 focus:ring-accent-soft"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {body}
      <Lightbox files={files} index={open !== null && open < files.length ? open : null} onIndexChange={setOpen} />
    </>
  );
}
