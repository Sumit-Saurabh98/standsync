"use client";

import { useState, type InputHTMLAttributes } from "react";
import { EyeIcon, EyeOffIcon } from "./icons";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Render a password field with a show/hide toggle. */
  isPassword?: boolean;
}

export function TextField({
  isPassword = false,
  className = "",
  ...props
}: TextFieldProps) {
  const [show, setShow] = useState(false);
  const type = isPassword ? (show ? "text" : "password") : (props.type ?? "text");

  return (
    <div className="relative">
      <input
        {...props}
        type={type}
        className={`w-full rounded-2xl border border-transparent bg-white px-5 py-4 text-ink shadow-sm outline-none transition placeholder:text-muted focus:border-primary/40 focus:ring-2 focus:ring-primary/20 ${isPassword ? "pr-12" : ""} ${className}`}
      />
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink"
        >
          {show ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        </button>
      )}
    </div>
  );
}
