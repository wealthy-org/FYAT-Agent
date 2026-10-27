export const siteConfig = {
  name: "FYAT Agent",
  title: "FYAT Agent | Transaction Builder for autonomous agents",
  description:
    "Builds complete Solana agent transaction flows with mandate authorization built into the execution path. Give agents execution rights, not your private key.",
  tagline: "Give agents execution rights, not your private key.",
      nav: [
    { label: "Builder", href: "/builder" },
    { label: "Docs", href: "/docs" },
    { label: "Receipts", href: "/builder#receipts" },
    { label: "Security", href: "/#security" },
  ],
  footerGroups: [
    {
      title: "Product",
      links: [
        { label: "Platform", href: "/#platform" },
        { label: "Builder", href: "/builder" },
        { label: "Receipts", href: "/builder#receipts" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Security", href: "/#security" },
        { label: "Developers", href: "/#developers" },
      ],
    },
  ],
  disclaimer:
    "FYAT Agent is a Devnet prototype: unaudited, no token, no real funds.",
} as const;

export type NavItem = (typeof siteConfig.nav)[number];