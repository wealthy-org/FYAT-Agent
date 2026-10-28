import { permanentRedirect } from "next/navigation";

/** Builder dan Receipts sekarang bagian dari docs. Link lama tetap hidup. */
export default function BuilderPage() {
  permanentRedirect("/docs/playground");
}