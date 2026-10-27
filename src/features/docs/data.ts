export type DocsNavItem = { slug: string; label: string };
export type DocsNavGroup = { title: string; items: readonly DocsNavItem[] };

export const docsNav: readonly DocsNavGroup[] = [
  {
    title: "Getting started",
    items: [
      { slug: "introduction", label: "Introduction" },
      { slug: "how-it-works", label: "How FYAT works" },
      { slug: "quickstart", label: "Quickstart" },
      { slug: "installation", label: "Installation" },
    ],
  },
  {
    title: "Core concepts",
    items: [
      { slug: "mandates", label: "Mandates" },
      { slug: "actions-and-plans", label: "Actions and plans" },
      { slug: "receipts", label: "Receipts" },
    ],
  },
  {
    title: "Transaction builder",
    items: [
      { slug: "builder-overview", label: "Overview" },
      { slug: "scope-verification", label: "Scope verification" },
      { slug: "simulation", label: "Simulation and planning" },
    ],
  },
  {
    title: "Security",
    items: [{ slug: "security", label: "Security model" }],
  },
];

export const allDocs = docsNav.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.title })),
);