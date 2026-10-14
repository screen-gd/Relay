import { APP_URL } from "./links";

/**
 * Monthly price of the Creator plan in US dollars. Change this one number to
 * reprice Creator everywhere: the pricing cards, the comparison table, the FAQ,
 * the /pricing metadata, and both llms summaries all format this constant.
 */
export const CREATOR_MONTHLY_PRICE_USD = 10;

/** Monthly price of one Team editor seat in US dollars. */
export const TEAM_MONTHLY_PRICE_PER_SEAT_USD = 14;

/** Formats a US dollar amount the way the pricing UI shows it: 10 -> "$10.00". */
export function formatUsd(amount: number) {
  return `$${amount.toFixed(2)}`;
}

/** What every paid plan card says about checkout while billing is off. */
const NOT_LIVE_YET_NOTE =
  "Prices are subject to change. Checkout is not live yet.";

/**
 * Plan data shared by the pricing cards and anywhere else plans are listed.
 * Free is available now. Creator and Team show their planned launch prices but
 * cannot be bought yet, because checkout is not live: their `cta` is null, so
 * the card shows a disabled button instead of a link that would charge a card.
 * `tab` labels the card with a tab above it; `audience` fills the "Who's the
 * plan for?" block; `status` sits under the price.
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
    price: formatUsd(CREATOR_MONTHLY_PRICE_USD),
    period: "/ month",
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
    note: NOT_LIVE_YET_NOTE,
    cta: null,
  },
  {
    name: "Team",
    tab: null,
    price: formatUsd(TEAM_MONTHLY_PRICE_PER_SEAT_USD),
    period: "per member / month",
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
    note: NOT_LIVE_YET_NOTE,
    cta: null,
  },
] as const;

export type Plan = (typeof plans)[number];
export type PlanName = Plan["name"];
