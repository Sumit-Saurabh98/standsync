import type { TextareaHTMLAttributes } from "react";

export function TextArea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full resize-y rounded-2xl border border-transparent bg-white px-5 py-4 text-ink shadow-sm outline-none transition placeholder:text-muted focus:border-primary/40 focus:ring-2 focus:ring-primary/20 ${className}`}
    />
  );
}
