import { useId, type SVGProps } from "react";

/**
 * Full-colour platform marks for places that name a platform, such as
 * template cards. Brand colours are literal on purpose: a platform's mark
 * keeps its own colours in both themes. Decorative; pair with a text label.
 */
type BrandMarkProps = Omit<SVGProps<SVGSVGElement>, "ref">;

/** YouTube: the red rounded play button. */
export function YoutubeMark(props: BrandMarkProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" data-brand-mark="" {...props}>
      <rect x="1" y="4.5" width="22" height="15" rx="4.5" fill="#FF0000" />
      <path d="M9.75 8.75v6.5L15.5 12z" fill="#FFFFFF" />
    </svg>
  );
}

/** Instagram: the gradient camera glyph. */
export function InstagramMark(props: BrandMarkProps) {
  const gradient = `${useId()}-instagram`;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" data-brand-mark="" {...props}>
      <defs>
        <radialGradient id={gradient} cx="0.3" cy="1.05" r="1.2">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset="0.25" stopColor="#FA7E1E" />
          <stop offset="0.5" stopColor="#D62976" />
          <stop offset="0.75" stopColor="#962FBF" />
          <stop offset="1" stopColor="#4F5BD5" />
        </radialGradient>
      </defs>
      <rect
        x="1.5"
        y="1.5"
        width="21"
        height="21"
        rx="6"
        fill={`url(#${gradient})`}
      />
      <rect
        x="5.5"
        y="5.5"
        width="13"
        height="13"
        rx="4"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.6"
      />
      <circle
        cx="12"
        cy="12"
        r="3.1"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.6"
      />
      <circle cx="16" cy="8" r="0.95" fill="#FFFFFF" />
    </svg>
  );
}
