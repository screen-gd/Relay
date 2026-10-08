"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { APP_URL, NAV_ITEMS } from "../../lib/links";
import { Button } from "@/components/ui/button";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import ThemeToggle from "./ThemeToggle";

/** Sticky 60px site header: brand, centered nav, theme toggle, and CTAs. */
export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile sheet after navigating; route changes keep it mounted.
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" href="/" aria-label="Relay home">
          <Image
            className="brand-logo-light"
            src="/brand/relay/mark-black.svg"
            width={22}
            height={22}
            alt=""
            priority
          />
          <Image
            className="brand-logo-dark"
            src="/brand/relay/mark-accent.svg"
            width={22}
            height={22}
            alt=""
            priority
          />
          <span>Relay</span>
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              className="nav-link"
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="site-header-actions">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <a href={APP_URL}>Sign in</a>
          </Button>
          <InteractiveHoverButton href={APP_URL} size="sm">
            Get started
          </InteractiveHoverButton>
        </div>
        <div className="site-header-mobile">
          <ThemeToggle />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Open menu"
              >
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav className="sheet-nav" aria-label="Mobile navigation">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    className="nav-link"
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="sheet-actions">
                <Button variant="outline" asChild>
                  <a href={APP_URL}>Sign in</a>
                </Button>
                <Button asChild>
                  <a href={APP_URL}>Get started</a>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
