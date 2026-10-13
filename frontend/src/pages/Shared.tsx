import { useState } from "react";
import { useInfiniteQuery, useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Eye, Link2, Link2Off, TriangleAlert } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { api, shareUrl } from "../lib/api";
import type { MediaFile, ShareLink } from "../lib/types";
import { formatDateTime, formatRelative } from "../lib/format";
import { spring } from "../lib/motion";
import { PageHeader } from "../components/PageHeader";
import { Segmented } from "../components/ui/Segmented";
import { EmptyState } from "../components/ui/EmptyState";
import { Button, IconButton } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";

type Filter = "active" | "expired" | "all";

export function Shared() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("active");
  const [revoking, setRevoking] = useState<ShareLink | null>(null);

  const query = useInfiniteQuery({
    queryKey: ["shares"],
    queryFn: ({ pageParam }) => api.shares.list({ page: pageParam, page_size: 50 }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  });
  const links = query.data?.pages.flatMap((p) => p.results) ?? [];
  const visible = links.filter((l) => (filter === "all" ? true : filter === "expired" ? l.is_expired : !l.is_expired));

  // Share links only carry the file id; look up each file for its name and thumbnail.
  const fileIds = [...new Set(visible.map((l) => l.media_file))];
  const fileQueries = useQueries({
    queries: fileIds.map((id) => ({ queryKey: ["files", "detail", id], queryFn: () => api.files.get(id), staleTime: 5 * 60e3 })),
  });
  const filesById = new Map<number, MediaFile>();
  fileQueries.forEach((q) => q.data && filesById.set(q.data.id, q.data));

  const revoke = useMutation({
    mutationFn: (id: number) => api.shares.remove(id),
    onSuccess: () => {
      toast.success("Link revoked");
      setRevoking(null);
      queryClient.invalidateQueries({ queryKey: ["shares"] });
    },
    onError: (e: Error) => toast.error("Couldn't revoke link", { description: e.message }),
  });

  const activeCount = links.filter((l) => !l.is_expired).length;

  return (
    <>
      <PageHeader
        title="Shared Links"
        subtitle={query.data ? `${activeCount} active ${activeCount === 1 ? "link" : "links"}` : " "}
        toolbar={
          <Segmented
            label="Filter links"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "active", label: "Active" },
              { value: "expired", label: "Expired" },
              { value: "all", label: "All" },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
        {query.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-[76px] rounded-2xl" />)}
          </div>
        ) : query.isError ? (
          <EmptyState icon={<TriangleAlert />} title="Couldn't load links" description={query.error.message} action={<Button variant="secondary" onClick={() => query.refetch()}>Try again</Button>} />
        ) : !visible.length ? (
          <EmptyState
            icon={<Link2 />}
            title={filter === "expired" ? "No expired links" : "Nothing shared yet"}
            description={filter === "expired" ? "Expired links will show up here." : "Open any photo and tap Share to create a link that expires automatically."}
          />
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-surface shadow-card">
            <AnimatePresence initial={false}>
              {visible.map((link) => (
                <motion.li
                  key={link.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={spring}
                  className="border-b border-line last:border-0"
                >
                  <LinkRow link={link} file={filesById.get(link.media_file)} onRevoke={() => setRevoking(link)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
        {query.hasNextPage && (
          <div className="mt-6 flex justify-center">
            <Button variant="secondary" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>Show more</Button>
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        title="Revoke this link?"
        description="Anyone using it will immediately lose access. The photo stays in your library."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRevoking(null)}>Cancel</Button>
            <Button variant="danger" loading={revoke.isPending} onClick={() => revoking && revoke.mutate(revoking.id)}>Revoke</Button>
          </>
        }
      >
        {null}
      </Dialog>
    </>
  );
}

function LinkRow({ link, file, onRevoke }: { link: ShareLink; file?: MediaFile; onRevoke: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(link.token));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
      <div className="size-[52px] shrink-0 overflow-hidden rounded-xl bg-surface-2">
        {(file?.thumbnail_url || file?.url) && <img src={file.thumbnail_url ?? file.url!} alt="" className={clsx("size-full object-cover", link.is_expired && "grayscale")} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={clsx("truncate text-[15px] font-medium", link.is_expired && "text-fg-2")}>
          {file?.original_name ?? <span className="skeleton inline-block h-4 w-40 rounded align-middle" />}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[13px] text-fg-2">
          <span className={clsx("inline-flex items-center gap-1 font-medium", link.is_expired ? "text-fg-3" : "text-success")}>
            <span className={clsx("size-1.5 rounded-full", link.is_expired ? "bg-fg-3" : "bg-success")} />
            {link.is_expired ? "Expired" : "Active"}
          </span>
          <span title={formatDateTime(link.expires_at)}>
            {link.is_expired ? "Ended" : "Expires"} {formatRelative(link.expires_at)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3.5" /> {link.views_count} {link.views_count === 1 ? "view" : "views"}
          </span>
        </p>
      </div>
      {!link.is_expired && (
        <Button size="sm" variant="secondary" onClick={copy} icon={copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}>
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy Link"}</span>
        </Button>
      )}
      <IconButton label={link.is_expired ? "Remove link" : "Revoke link"} onClick={onRevoke} className="hover:text-danger!">
        <Link2Off className="size-[18px]" />
      </IconButton>
    </div>
  );
}
