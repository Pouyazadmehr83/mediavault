import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Clock, Download, Link2Off } from "lucide-react";
import { ApiError, api } from "../lib/api";
import { formatBytes, formatDateTime } from "../lib/format";
import { spring } from "../lib/motion";
import { Logo } from "../components/Logo";
import { Spinner } from "../components/ui/Spinner";

/** Public, no-login view for a share link recipient. */
export function PublicShare() {
  const { token = "" } = useParams();
  const share = useQuery({
    queryKey: ["public-share", token],
    queryFn: () => api.shares.open(token),
    retry: false,
    staleTime: Infinity,
  });

  const status = share.error instanceof ApiError ? share.error.status : null;

  return (
    <div className="flex min-h-dvh flex-col bg-[#0b0b0f] text-white">
      <header className="flex items-center gap-2.5 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 sm:px-8">
        <Logo className="size-7" />
        <span className="title text-[15px] font-semibold">MediaVault</span>
        <span className="ml-auto rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/70">Shared with you</span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-10">
        {share.isPending ? (
          <Spinner className="size-6 text-white/60" />
        ) : share.isError ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="max-w-sm text-center">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-white/10">
              {status === 410 ? <Clock className="size-7" /> : <Link2Off className="size-7" />}
            </div>
            <h1 className="title text-2xl font-semibold">{status === 410 ? "This link has expired" : status === 404 ? "Link not found" : "Something went wrong"}</h1>
            <p className="mt-2 text-white/60">
              {status === 410
                ? "Ask the person who shared it to send you a new one."
                : status === 404
                  ? "The link may have been revoked, or the address is incomplete."
                  : share.error.message}
            </p>
          </motion.div>
        ) : (
          <motion.figure initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={spring} className="flex w-full max-w-5xl flex-col items-center">
            <img
              src={share.data.download_url}
              alt={share.data.original_name}
              className="max-h-[68vh] w-auto max-w-full rounded-2xl object-contain shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
            />
            <figcaption className="mt-8 flex w-full max-w-xl flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-semibold">{share.data.original_name}</p>
                <p className="mt-0.5 text-[13px] text-white/60">
                  {formatBytes(share.data.size)} · Available until {formatDateTime(share.data.expires_at)}
                </p>
              </div>
              <a
                href={share.data.download_url}
                download={share.data.original_name}
                target="_blank"
                rel="noopener"
                className="pressable inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold text-black hover:bg-white/90"
              >
                <Download className="size-4" /> Download
              </a>
            </figcaption>
          </motion.figure>
        )}
      </main>
    </div>
  );
}
