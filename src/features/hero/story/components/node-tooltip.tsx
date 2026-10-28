import type { RefObject } from "react";

type NodeTooltipProps = {
  tipRef: RefObject<HTMLDivElement | null>;
};

/** Dekoratif: teks dan posisi diisi oleh loop animasi saat kursor berada di atas node. */
export function NodeTooltip({ tipRef }: NodeTooltipProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-40">
      <div
        ref={tipRef}
        data-show="false"
        className="group absolute left-0 top-0 will-change-transform"
      >
        <div className="origin-bottom -translate-x-1/2 -translate-y-full scale-90 whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-[15px] font-medium text-black opacity-0 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.65)] transition duration-200 ease-out group-data-[show=true]:scale-100 group-data-[show=true]:opacity-100" />
      </div>
    </div>
  );
}