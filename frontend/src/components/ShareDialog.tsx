import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Link2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import type { MediaFile, ShareLink } from "../lib/types";
import { api, shareUrl } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { spring } from "../lib/motion";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Segmented } from "./ui/Segmented";

const DURATIONS = [
  { value: "1h", label: "1 hour", ms: 3600e3 },
  { value: "1d", label: "1 day", ms: 86400e3 },
  { value: "7d", label: "7 days", ms: 7 * 86400e3 },
  { value: "30d", label: "30 days", ms: 30 * 86400e3 },
] as const;

type Duration = (typeof DURATIONS)[number]["value"];

export function ShareDialog({ file, onClose }: { file: MediaFile | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState<Duration>("1d");
  const [link, setLink] = useState<ShareLink | null>(null);

  useEffect(() => {
    if (file) setLink(null);
  }, [file]);

  const create = useMutation({
    mutationFn: () => {
      const ms = DURATIONS.find((d) => d.value === duration)!.ms;
      return api.shares.create(file!.id, new Date(Date.now() + ms).toISOString());
    },
    onSuccess: (data) => {
      setLink(data);
      queryClient.invalidateQueries({ queryKey: ["shares"] });
    },
    onError: (e: Error) => toast.error("Couldn't create link", { description: e.message }),
  });

  return (
    <Dialog
      open={Boolean(file)}
      onClose={onClose}
      title="Share photo"
      description={link ? "Anyone with this link can view and download the photo until it expires." : "Create a private link that expires automatically. No account needed to open it."}
    >
      <AnimatePresence mode="wait" initial={false}>
        {link ? (
          <motion.div key="link" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <CopyField value={shareUrl(link.token)} />
            <p className="mt-3 text-[13px] text-fg-2">Expires {formatDateTime(link.expires_at)}</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" icon={<ExternalLink className="size-4" />} onClick={() => window.open(shareUrl(link.token), "_blank", "noopener")}>
                Open
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="mb-2 text-[13px] font-medium text-fg-2">Link expires after</p>
            <Segmented label="Link expires after" value={duration} onChange={setDuration} options={DURATIONS.map(({ value, label }) => ({ value, label }))} className="w-full [&>button]:flex-1" />
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button loading={create.isPending} icon={<Link2 className="size-4" />} onClick={() => create.mutate()}>
                Create link
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copy failed — select the link and copy it manually");
    }
  };
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line-strong bg-surface-2 p-1.5 pl-3.5">
      <input readOnly value={value} aria-label="Share link" onFocus={(e) => e.target.select()} className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none" />
      <Button size="sm" variant={copied ? "secondary" : "primary"} onClick={copy} icon={copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}>
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
