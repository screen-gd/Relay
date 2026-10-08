import Image from "next/image";
import Link from "next/link";
import {
  APP_PRIVACY_URL,
  CONTACT_EMAIL_URL,
  INSTAGRAM_URL,
  NAV_ITEMS,
  X_URL,
} from "../../lib/links";

type FooterLink = { label: string; href: string; external?: boolean };

const columns: { title: string; links: readonly FooterLink[] }[] = [
  { title: "Product", links: NAV_ITEMS },
  { title: "Contact", links: [{ label: "Email", href: CONTACT_EMAIL_URL }] },
  {
    title: "Social",
    links: [
      { label: "Instagram", href: INSTAGRAM_URL, external: true },
      { label: "X", href: X_URL, external: true },
    ],
  },
  { title: "Legal", links: [{ label: "Privacy", href: APP_PRIVACY_URL }] },
];

/**
 * Site-wide footer below a dashed frame line: brand, tagline, and copyright
 * on the left; Product, Contact, Social, and Legal columns on the right.
 */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <div className="site-footer-brand">
          <Link href="/" aria-label="Relay home">
            <Image
              className="brand-logo-light"
              src="/brand/relay/lockup-black.svg"
              width={320}
              height={100}
              alt="Relay"
            />
            <Image
              className="brand-logo-dark"
              src="/brand/relay/lockup-accent.svg"
              width={320}
              height={100}
              alt="Relay"
            />
          </Link>
          <p>Production workspace for video editors.</p>
          <small>© 2026 Relay</small>
        </div>
        <nav className="site-footer-cols" aria-label="Footer navigation">
          {columns.map((column) => (
            <div key={column.title} className="site-footer-col">
              <h2>{column.title}</h2>
              {column.links.map((link) =>
                link.href.startsWith("/") ? (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noreferrer" : undefined}
                  >
                    {link.label}
                  </a>
                )
              )}
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}
