import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import { BuilderPlayground } from "@/features/builder";
import { DocsCallout } from "@/features/docs/components/docs-callout";
import { DocsCode } from "@/features/docs/components/docs-code";
import { DocsHeader } from "@/features/docs/components/docs-header";
import { DocsHeading } from "@/features/docs/components/docs-heading";
import { DocsPager } from "@/features/docs/components/docs-pager";
import { DocsShell } from "@/features/docs/components/docs-shell";
import { DocsSidebar } from "@/features/docs/components/docs-sidebar";
import { DocsTitleCard } from "@/features/docs/components/docs-title-card";
import { DocsToc } from "@/features/docs/components/docs-toc";
import { allDocs, isLiveDoc, type LiveDocSlug } from "@/features/docs/data";
import { docsPages, findDoc, getPager } from "@/features/docs/pages";
import { ReceiptsPanel } from "@/features/receipts";
import { getInitialReceipts } from "@/server/services/receipt-feed";

/** Feed receipts di-cache; diperbarui paling lama tiap 60 detik. */
export const revalidate = 60;

type PageProps = { params: Promise<{ slug: string }> };

const liveLeads: Record<LiveDocSlug, string> = {
  playground:
    "Configure a bounded mandate, preview the execution flow and copy the SDK code. Previewing needs no funds.",
  "live-receipts":
    "Every attempt under a mandate leaves a public record: what the agent tried, and whether the policy let it through.",
};

export function generateStaticParams() {
  return allDocs.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = findDoc(slug);
  return doc ? { title: doc.label, alternates: { canonical: `/docs/${slug}` } } : {};
}

async function LiveBody({ slug }: { slug: LiveDocSlug }) {
  if (slug === "playground") return <BuilderPlayground />;
  return <ReceiptsPanel initial={await getInitialReceipts()} />;
}

export default async function DocsArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const doc = findDoc(slug);
  if (!doc) notFound();

  const { prev, next } = getPager(slug);
  const callout = (
    <div className="mb-8">
      <DocsCallout>
        <strong>Devnet prototype.</strong> FYAT Agent is unaudited, has no token, and uses no real funds.
      </DocsCallout>
    </div>
  );

  /* ---------- Halaman interaktif ---------- */
  if (isLiveDoc(slug)) {
    return (
      <>
        <DocsHeader />

        <DocsShell wide sidebar={<DocsSidebar activeSlug={slug} />}>
          {callout}
          <DocsTitleCard eyebrow={doc.group} title={doc.label} />
          <p className="mt-8 max-w-3xl text-lg text-fg-muted">{liveLeads[slug]}</p>

          <div id={slug} className="mt-10 scroll-mt-28">
            <LiveBody slug={slug} />
          </div>

          <DocsPager prev={prev} next={next} />
        </DocsShell>

        <Footer />
      </>
    );
  }

  /* ---------- Halaman artikel ---------- */
  const content = docsPages[slug] ?? { lead: "This page is coming soon.", sections: [] };
  const toc = content.sections.map((section) => ({ id: section.id, label: section.title }));

  return (
    <>
      <DocsHeader />

      <DocsShell sidebar={<DocsSidebar activeSlug={slug} />} toc={<DocsToc items={toc} />}>
        {callout}

        <DocsTitleCard eyebrow={doc.group} title={doc.label} />
        <p className="mt-8 text-lg text-fg-muted">{content.lead}</p>

        {content.sections.map((section) => (
          <section key={section.id}>
            <DocsHeading id={section.id}>{section.title}</DocsHeading>
            {section.body.map((paragraph, index) => (
              <p key={index} className="mt-4 text-sm leading-relaxed text-fg-muted">
                {paragraph}
              </p>
            ))}
            {section.bullets && (
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-fg-muted marker:text-fg-subtle">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
            {section.code && <DocsCode label={section.code.label} code={section.code.text} />}
          </section>
        ))}

        <DocsPager prev={prev} next={next} />
      </DocsShell>

      <Footer />
    </>
  );
}