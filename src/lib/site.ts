export const siteConfig = {
  name: "FYAT Agent",
  title: "FYAT Agent | Transaction Builder for autonomous agents",
  description:
    "Builds complete Solana agent transaction flows with mandate authorization built into the execution path. Give agents execution rights, not your private key.",
  tagline: "Give agents execution rights, not your private key.",
    nav: [
    {
      label: "Builder",
      href: "/docs/playground",
      children: [
        { label: "Playground", href: "/docs/playground", description: "Configure a mandate and preview the flow" },
        { label: "Builder overview", href: "/docs/builder-overview", description: "How the transaction builder works" },
        { label: "Scope verification", href: "/docs/scope-verification", description: "Checks that run before execution" },
        { label: "Simulation", href: "/docs/simulation", description: "Simulation and planning" },
      ],
    },
    {
      label: "Docs",
      href: "/docs",
      children: [
        { label: "Introduction", href: "/docs/introduction", description: "What FYAT Agent is and why it exists" },
        { label: "Quickstart", href: "/docs/quickstart", description: "Run your first mandate in minutes" },
        { label: "Installation", href: "/docs/installation", description: "Set up the SDK" },
        { label: "Mandates", href: "/docs/mandates", description: "Bounded execution rights for agents" },
      ],
    },
    {
      label: "Receipts",
      href: "/docs/live-receipts",
      children: [
        { label: "Live receipts", href: "/docs/live-receipts", description: "Public feed of every agent attempt" },
        { label: "How receipts work", href: "/docs/receipts", description: "What gets recorded and why" },
      ],
    },
    { label: "Security", href: "/docs/security" },
  ],
  footerGroups: [
    {
      title: "Product",
      links: [
        { label: "Platform", href: "/#platform" },
        { label: "Playground", href: "/docs/playground" },
        { label: "Receipts", href: "/docs/live-receipts" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Docs", href: "/docs" },
        { label: "Security", href: "/docs/security" },
        { label: "Developers", href: "/#developers" },
      ],
    },
  ],
  disclaimer:
    "FYAT Agent is a Devnet prototype: unaudited, no token, no real funds.",
} as const;

export type NavItem = (typeof siteConfig.nav)[number];