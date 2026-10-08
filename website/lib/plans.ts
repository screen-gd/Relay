import { APP_URL } from "./links";

/**
 * Plan data shared by the pricing cards and anywhere else plans are listed.
 * Only Free is available; Creator and Team are not available yet (no trial,
 * no purchase). `tab` labels the card with a tab above it; `audience` fills
 * the "Who's the plan for?" block; `status` sits under the price. A plan with
 * no `cta` shows a disabled "Not available yet" button.
 */
export const plans = [
  {
    name: "Free",
    tab: null,
    price: "$0",
    period: "forever",
    status: "Available now",
    description: "Everything you need to run client projects.",
    features: [
      "Unlimited projects and clients",
      "Project tracking and delivery",
      "Client portals with password links",
      "Embedded video review and comments",
      "Payment tracking",
    ],
    comingSoon: [],
    audience: "Freelance editors organizing projects, reviews, and payments.",
    note: null,
    cta: { label: "Get started free", href: APP_URL },
  },
  {
    name: "Creator",
    tab: null,
    price: "TBD",
    period: "price not set",
    status: "Not available yet",
    description: "Branding, templates, and reports on top of Free.",
    features: [
      "Everything in Free",
      "Client hub",
      "Custom portal branding",
      "Custom workflow templates",
      "Advanced reports",
    ],
    comingSoon: ["5 GB of file uploads", "Review uploaded files"],
    audience: "Editors who want their own branding and deeper reports.",
    note: null,
    cta: null,
  },
  {
    name: "Team",
    tab: null,
    price: "TBD",
    period: "price not set",
    status: "Not available yet",
    description: "One shared workspace for a small editing team.",
    features: [
      "Everything in Creator",
      "Three editor seats",
      "Roles and project assignments",
      "Team payouts and workload reports",
      "Free viewer access",
    ],
    comingSoon: ["15 GB of shared file uploads"],
    audience: "Small teams that split editing work and payouts.",
    note: null,
    cta: null,
  },
] as const;

export type Plan = (typeof plans)[number];
export type PlanName = Plan["name"];
