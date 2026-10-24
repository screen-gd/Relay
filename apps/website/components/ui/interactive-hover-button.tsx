import Link from "next/link";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

const roll = "inline-block transition-transform duration-300 ease-out";

/**
 * Call-to-action link adapted from Magic UI's Interactive Hover Button
 * (https://magicui.design/docs/components/interactive-hover-button).
 * On hover or keyboard focus the label rolls up and a copy rolls in from
 * below. Unlike the original it keeps the site's button shape, has no arrow,
 * and never floods the background with color. Works for internal and
 * external URLs.
 */
export function InteractiveHoverButton({
  children,
  className,
  variant,
  size,
  ...linkProps
}: Omit<ComponentProps<typeof Link>, "children"> & {
  children: string;
} & Pick<ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link {...linkProps}>
        <span className="relative inline-flex overflow-hidden">
          <span
            className={`${roll} motion-safe:group-hover/button:-translate-y-full motion-safe:group-focus-visible/button:-translate-y-full`}
          >
            {children}
          </span>
          <span
            aria-hidden="true"
            className={`${roll} absolute inset-0 translate-y-full motion-safe:group-hover/button:translate-y-0 motion-safe:group-focus-visible/button:translate-y-0`}
          >
            {children}
          </span>
        </span>
      </Link>
    </Button>
  );
}
