import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subtle",
        "hover:border-border-strong focus:border-primary/50",
        className,
      )}
      {...props}
    />
  );
}
