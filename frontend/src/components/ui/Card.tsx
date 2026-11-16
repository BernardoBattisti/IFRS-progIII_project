import type { ComponentProps } from "react";
import { cx } from "./cx";

export function Card({ className, ...resto }: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-6",
        className,
      )}
      {...resto}
    />
  );
}
