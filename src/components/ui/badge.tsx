import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const tones = {
  muted: "bg-bg-subtle text-fg-muted border-border",
  unique: "bg-unique/15 text-unique border-unique/30",
  set: "bg-set/15 text-set border-set/30",
  rune: "bg-rune/15 text-rune border-rune/30",
  figure: "bg-figure/15 text-figure border-figure/30",
  ok: "bg-ok/15 text-ok border-ok/30",
};

export function Badge({
  className,
  tone = "muted",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
