import type { ReactNode } from "react";
import { motion } from "motion/react";
import { spring } from "../../lib/motion";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="mx-auto flex max-w-sm flex-col items-center px-6 py-20 text-center"
    >
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-accent-soft text-accent [&>svg]:size-7">
        {icon}
      </div>
      <h2 className="title text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-[15px] text-fg-2">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
