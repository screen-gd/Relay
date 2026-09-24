"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionConfig, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import InteractiveDashboard from "./InteractiveDashboard";
import ProductStory from "./ProductStory";
import SpecularButton from "./react-bits/SpecularButton";
import GradualBlur from "./react-bits/GradualBlur";

const MagicRings = dynamic(() => import("./react-bits/MagicRings"), {
  ssr: false,
});

gsap.registerPlugin(useGSAP, ScrollTrigger);

function useViewportEntry() {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry?.isIntersecting ?? false);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, isInView] as const;
}

export default function Home() {
  const siteRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [ringsRef, ringsInView] = useViewportEntry();
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);

  useEffect(() => {
    const updateHeader = () => setIsHeaderCompact(window.scrollY > 120);

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(".hero-heading span", {
            yPercent: 115,
            opacity: 0,
            duration: 0.95,
            stagger: 0.1,
          })
          .from(
            ".hero-support > *",
            {
              y: 22,
              opacity: 0,
              duration: 0.65,
              stagger: 0.08,
            },
            "-=0.48"
          )
          .from(
            ".product-frame",
            {
              y: 64,
              scale: 0.94,
              opacity: 0,
              duration: 1.05,
            },
            "-=0.38"
          );
      });

      media.add(
        "(min-width: 701px) and (prefers-reduced-motion: no-preference)",
        () => {
          const productSurfaces = [
            "#workflow > :last-child",
            "#client-review .review-room",
            "#delivery > :last-child",
            "#proof .proof-workspace",
          ];

          productSurfaces.forEach((selector) => {
            const surface =
              siteRef.current?.querySelector<HTMLElement>(selector);
            if (!surface) return;

            gsap.from(surface, {
              y: 44,
              scale: 0.97,
              duration: 0.85,
              ease: "power3.out",
              clearProps: "transform",
              scrollTrigger: {
                trigger: surface,
                start: "top 88%",
                once: true,
              },
            });
          });
        }
      );

      return () => media.revert();
    },
    { scope: siteRef }
  );

  return (
    <MotionConfig reducedMotion="user">
      <div ref={siteRef} className="site" id="top">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>

        <GradualBlur
          className="site-page-blur"
          position="top"
          target="page"
          strength={2}
          height="80px"
          divCount={10}
          curve="ease-out"
          opacity={0.8}
          zIndex={1000}
        />

        <div
          className={`site-header-shell${isHeaderCompact ? " is-compact" : ""}`}
        >
          <header className="site-header">
            <a className="brand" href="#top" aria-label="Relay home">
              <Image
                src="/brand/relay/lockup-accent.svg"
                width={320}
                height={100}
                alt="Relay"
                priority
              />
            </a>
            <nav className="site-nav" aria-label="Main navigation">
              <a href="#product">Product</a>
              <a href="#pricing">Pricing</a>
              <SpecularButton className="nav-action" href="/waitlist">
                Join the waitlist
              </SpecularButton>
            </nav>
          </header>
        </div>

        <main className="w-full max-w-full overflow-x-hidden" id="main-content">
          <section className="hero" aria-labelledby="hero-title">
            <div ref={ringsRef} className="hero-rings" aria-hidden="true">
              {!reduceMotion && ringsInView && (
                <MagicRings
                  color="#c6ff00"
                  colorTwo="#f4f4f5"
                  ringCount={7}
                  speed={0.58}
                  attenuation={8}
                  lineThickness={2.2}
                  baseRadius={0.28}
                  radiusStep={0.12}
                  scaleRate={0.1}
                  opacity={0.92}
                  noiseAmount={0.025}
                  rotation={-8}
                  ringGap={1.28}
                  fadeIn={0.6}
                  fadeOut={0.7}
                  followMouse={false}
                  mouseInfluence={0}
                  hoverScale={1}
                  parallax={0}
                />
              )}
            </div>

            <div className="hero-message">
              <div className="hero-heading">
                <h1 id="hero-title">
                  <span>Manage editing</span>
                  <span>projects.</span>
                </h1>
              </div>
              <div className="hero-support">
                <p className="hero-copy">
                  Track projects and deadlines, collect client feedback on
                  uploaded videos, and manage delivery in one workspace.
                </p>
                <p className="hero-access-note">
                  Early access. Selected testers receive an email invite.
                </p>
              </div>
            </div>

            <div className="product-reveal" id="product">
              <div className="product-glow">
                <div className="product-frame">
                  <div className="dashboard-crop">
                    <InteractiveDashboard />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <ProductStory />
        </main>
      </div>
    </MotionConfig>
  );
}
