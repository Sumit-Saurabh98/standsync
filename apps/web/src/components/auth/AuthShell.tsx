import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Split-screen auth layout: form panel on the left, brand image on the right.
 * The visual panel collapses on small screens.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-panel shadow-xl md:grid-cols-2">
        <div className="flex flex-col justify-center px-8 py-12 sm:px-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="StandSync"
            width={44}
            height={44}
            className="mb-8 h-11 w-11 rounded-xl"
          />
          {children}
        </div>
        <div className="relative hidden min-h-[620px] md:block">
          <Image
            src="/auth.png"
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 50vw, 0px"
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}
