import { APP_URL } from "./links";
import {
  CREATOR_MONTHLY_PRICE_USD,
  TEAM_MONTHLY_PRICE_USD,
  TEAM_INCLUDED_EDITOR_SEATS,
  EXTRA_EDITOR_MONTHLY_PRICE_USD,
  CREATOR_LAUNCH_STORAGE_GB,
  TEAM_LAUNCH_STORAGE_GB,
} from "../../shared/subscription-plans";
export {
  CREATOR_MONTHLY_PRICE_USD,
  TEAM_MONTHLY_PRICE_USD,
  TEAM_INCLUDED_EDITOR_SEATS,
  EXTRA_EDITOR_MONTHLY_PRICE_USD,
  CREATOR_LAUNCH_STORAGE_GB,
  TEAM_LAUNCH_STORAGE_GB,
};

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
    description: "Track unlimited projects, clients, reviews, and payments.",
    features: [
      "Unlimited projects and clients",
      "Project tracking and delivery",
      "Client portals with password links",
      "Embedded video review and comments",
      "Basic payment tracking",
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
    description: "Your client hub, branding, workflows, and payment plans.",
    features: [
      "Everything in Free",
      "Client hub",
      "Custom portal branding",
      "Custom workflow templates",
      "Advanced reports",
      "Payment plans and batches",
    ],
    comingSoon: [
      `${CREATOR_LAUNCH_STORAGE_GB} GB of review file storage`,
      "Review uploaded files",
    ],
    audience: "Editors who want their own branding and deeper reports.",
    note: NOT_LIVE_YET_NOTE,
    cta: null,
  },
  {
    name: "Team",
    tab: null,
    price: formatUsd(TEAM_MONTHLY_PRICE_USD),
    period: "per workspace / month",
    status: "Not available yet",
    description: "One shared workspace for a small editing team.",
    features: [
      "Everything in Creator",
      `${TEAM_INCLUDED_EDITOR_SEATS} editors, including the owner`,
      `${formatUsd(EXTRA_EDITOR_MONTHLY_PRICE_USD)}/month per extra editor`,
      "Roles and project assignments",
      "Team payouts and workload reports",
      "Free clients and viewers",
    ],
    comingSoon: [`${TEAM_LAUNCH_STORAGE_GB} GB of shared review file storage`],
    audience: "Small teams that split editing work and payouts.",
    note: NOT_LIVE_YET_NOTE,
    cta: null,
  },
] as const;

export type Plan = (typeof plans)[number];
export type PlanName = Plan["name"];
