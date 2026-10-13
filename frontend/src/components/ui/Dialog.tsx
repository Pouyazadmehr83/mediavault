import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { X } from "lucide-react";
import { spring, springSheet } from "../../lib/motion";
import { IconButton } from "./Button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Modal sheet: dims the page, traps focus, closes on Escape or scrim click. */
export function Dialog({ open, onClose, title, description, children, footer }: DialogProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <DialogPanel onClose={onClose} title={title} description={description} footer={footer}>
          {children}
        </DialogPanel>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function DialogPanel({ onClose, title, description, children, footer }: Omit<DialogProps, "open">) {
  const panel = useRef<HTMLDivElement>(null);
  const isPresent = useIsPresent();

  useEffect(() => {
    // While animating out, stop intercepting keys so Escape reaches what's underneath.
    if (!isPresent) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = panel.current;
    const focusable = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [],
      ).filter((el) => !el.hasAttribute("disabled"));

    (node?.querySelector<HTMLElement>("[autofocus], input, textarea") ?? focusable()[0])?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab") {
        const items = focusable();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose, isPresent]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        className="absolute inset-0 bg-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.98, transition: spring }}
        transition={springSheet}
        className="relative w-full max-w-md rounded-t-3xl bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-float sm:rounded-3xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="dialog-title" className="title text-lg font-semibold">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-fg-2">{description}</p>}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mt-1.5 -mr-2 size-9">
            <X className="size-[18px]" />
          </IconButton>
        </div>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </motion.div>
    </div>
  );
}
