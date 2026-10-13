import { useId } from "react";
import clsx from "clsx";
import { motion } from "motion/react";
import { springFast } from "../../lib/motion";

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}

export function Segmented<T extends string>({ value, onChange, options, label, className }: SegmentedProps<T>) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className={clsx("inline-flex rounded-[10px] bg-surface-2 p-0.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              "relative h-7 cursor-pointer rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
              active ? "text-fg" : "text-fg-2 hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={springFast}
                className="absolute inset-0 rounded-lg bg-surface shadow-card dark:bg-line-strong"
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
