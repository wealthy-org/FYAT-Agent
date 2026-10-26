import { cn } from "@/lib/cn";

export function HeroOrb({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("hero-orb", className)} />;
}