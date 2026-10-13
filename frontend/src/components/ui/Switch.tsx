import clsx from "clsx";
import { motion } from "motion/react";
import { springFast } from "../../lib/motion";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function Switch({ checked, onChange, label, description }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl text-left"
    >
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {description && <span className="block text-[13px] text-fg-2">{description}</span>}
      </span>
      <span
        className={clsx(
          "relative flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-200",
          checked ? "justify-end bg-success" : "justify-start bg-line-strong",
        )}
      >
        <motion.span layout transition={springFast} className="size-[27px] rounded-full bg-white shadow-md" />
      </span>
    </button>
  );
}
