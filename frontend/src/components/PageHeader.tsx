import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  back?: ReactNode;
}

/** Large title + sticky translucent toolbar that content scrolls under. */
export function PageHeader({ title, subtitle, actions, toolbar, back }: PageHeaderProps) {
  return (
    <>
      <div className="mx-auto max-w-[1400px] px-4 pt-8 sm:px-8 md:pt-10">
        {back}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="display truncate text-[32px] font-bold sm:text-[40px]">{title}</h1>
            {subtitle && <div className="mt-1 text-[15px] text-fg-2">{subtitle}</div>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
      {toolbar && (
        <div className="material sticky top-0 z-20 mt-4 border-b border-line">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-8">{toolbar}</div>
        </div>
      )}
    </>
  );
}
