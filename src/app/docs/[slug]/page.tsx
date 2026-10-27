import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import { DocsCallout } from "@/features/docs/components/docs-callout";
import { DocsCode } from "@/features/docs/components/docs-code";
import { DocsHeader } from "@/features/docs/components/docs-header";
import { DocsHeading } from "@/features/docs/components/docs-heading";
import { DocsPager } from "@/features/docs/components/docs-pager";
import { DocsShell } from "@/features/docs/components/docs-shell";
import { DocsSidebar } from "@/features/docs/components/docs-sidebar";
import { DocsTitleCard } from "@/features/docs/components/docs-title-card";
import { DocsToc } from "@/features/docs/components/docs-toc";
import { allDocs } from "@/features/docs/data";
import { docsPages, findDoc, getPager } from "@/features/docs/pages";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return allDocs.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = findDoc(slug);
  return doc ? { title: doc.label, alternates: { canonical: `/docs/${slug}` } } : {};
}

export default async function DocsArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const doc = findDoc(slug);
  if (!doc) notFound();

  const content = docsPages[slug] ?? { lead: "This page is coming soon.", sections: [] };
  const toc = content.sections.map((section) => ({ id: section.id, label: section.title }));
  const { prev, next } = getPager(slug);

  return (
    <>
      <DocsHeader />

      <DocsShell sidebar={<DocsSidebar activeSlug={slug} />} toc={<DocsToc items={toc} />}>
        <div className="mb-8">
          <DocsCallout>
            <strong>Devnet prototype.</strong> FYAT Agent is unaudited, has no token, and uses no real funds.
          </DocsCallout>
        </div>

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