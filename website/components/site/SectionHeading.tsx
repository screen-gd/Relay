import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Reveal from "./Reveal";

/**
 * Title row used at the top of every home and inner-page section: heading and
 * optional description on the left, optional link on the right. Pass the
 * section's `aria-labelledby` value as `id`. `align="center"` stacks and
 * centers everything (used for pricing). Reveals on scroll. Styled by
 * `.section-head`.
 */
export default function SectionHeading({
  id,
  title,
  description,
  action,
  align = "start",
}: {
  id: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  align?: "start" | "center";
}) {
  return (
    <Reveal
      className={
        align === "center" ? "section-head is-centered" : "section-head"
      }
    >
      <div>
        <h2 id={id}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? (
        <Link className="section-link" href={action.href}>
          {action.label} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      ) : null}
    </Reveal>
  );
}
