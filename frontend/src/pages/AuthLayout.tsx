import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Logo } from "../components/Logo";
import { spring } from "../lib/motion";

const MOSAIC = [
  "from-amber-300 to-rose-400",
  "from-sky-300 to-indigo-500",
  "from-emerald-300 to-teal-500",
  "from-fuchsia-300 to-purple-500",
  "from-orange-300 to-amber-500",
  "from-cyan-300 to-blue-500",
  "from-lime-300 to-emerald-500",
  "from-pink-300 to-rose-500",
  "from-violet-300 to-indigo-500",
];

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center gap-2.5">
          <Logo className="size-8" />
          <span className="title text-[17px] font-semibold">MediaVault</span>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mx-auto my-auto w-full max-w-[380px] py-12"
        >
          <h1 className="display text-[34px] font-bold">{title}</h1>
          <p className="mt-2 text-[15px] text-fg-2">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 text-center text-sm text-fg-2">{footer}</div>
        </motion.div>
        <p className="text-xs text-fg-3">Private by default · Signed, expiring links</p>
      </div>

      <div className="relative hidden overflow-hidden bg-[#0b0b0f] lg:block" aria-hidden>
        <div className="absolute inset-0 grid -rotate-6 scale-125 grid-cols-3 gap-4 p-10 opacity-90">
          {Array.from({ length: 18 }, (_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.1 + (i % 9) * 0.05 }}
              className={`rounded-3xl bg-gradient-to-br ${MOSAIC[i % MOSAIC.length]} ${i % 3 === 1 ? "aspect-[3/4] translate-y-12" : "aspect-square"}`}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-14 text-white">
          <p className="display max-w-md text-[40px] font-bold text-balance">Every photo, safely in one place.</p>
          <p className="mt-3 max-w-md text-[17px] text-white/70">
            Upload, organize into albums, and share with links that expire on your terms.
          </p>
        </div>
      </div>
    </div>
  );
}
