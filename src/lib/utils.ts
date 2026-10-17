import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Quartz type roles (type-label, type-body, ...) set font size and weight in
// one class, so a later role replaces an earlier one instead of stacking.
const twMerge = extendTailwindMerge<"type-role">({
  extend: {
    classGroups: {
      "type-role": [
        {
          type: [
            "display-xl",
            "display-lg",
            "display",
            "heading-lg",
            "heading",
            "heading-sm",
            "heading-xs",
            "body-lg",
            "body",
            "body-sm",
            "button",
            "label",
            "label-sm",
            "code",
            "code-sm",
            "tag",
            "stat-xl",
            "stat-lg",
            "stat",
            "state-word",
          ],
        },
      ],
    },
  },
});

/** Joins class names; later Tailwind classes win over earlier conflicting ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
