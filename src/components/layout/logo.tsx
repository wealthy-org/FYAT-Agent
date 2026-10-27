import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/lib/site";

export function Logo({ priority = false }: { priority?: boolean }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-3"
      aria-label={`${siteConfig.name} home`}
    >
      <span className="relative size-9 shrink-0 overflow-hidden rounded-xl border border-border-subtle bg-black">
        <Image
          src="/brand/logo.jpeg"
          alt=""
          width={1092}
          height={1092}
          sizes="160px"
          priority={priority}
          className="absolute max-w-none"
          style={{ width: "202%", left: "-61%", top: "-52%" }}
        />
      </span>
      <span className="font-display text-sm font-semibold tracking-wide">
        {siteConfig.name}
      </span>
    </Link>
  );
}