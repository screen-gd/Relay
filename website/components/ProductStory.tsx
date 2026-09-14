"use client";

import Image from "next/image";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileVideo,
  FolderKanban,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import SiteButton from "./SiteButton";
import WorkflowDemo from "./WorkflowDemo";
import ClientReviewDemo from "./ClientReviewDemo";
import DeliveryDemo from "./DeliveryDemo";

const plans = [
  {
    name: "Free",
    price: "$0",
    billing: "forever",
    annual: null,
    trial: null,
    description: "For freelancers getting their workflow organized.",
    features: [
      "Unlimited projects and clients",
      "Project tracking and delivery",
      "Client portals",
      "External video embeds",
    ],
    note: "Comments are not available on embedded videos.",
    cta: "Join the waitlist",
  },
  {
    name: "Creator",
    price: "$9",
    billing: "/ month",
    annual: "$90 / year",
    trial: "7-day free trial",
    description: "For freelance editors running their business in Relay.",
    features: [
      "Everything in Free",
      "5 GB of upload storage",
      "Comments on uploaded videos",
      "Custom workflow templates",
      "Salary plans and advanced reports",
      "Client hub and custom portal branding",
    ],
    note: null,
    cta: "Join the waitlist",
  },
  {
    name: "Team",
    price: "$24",
    billing: "/ month",
    annual: "$240 / year",
    trial: null,
    description: "For small editing teams managing shared work.",
    features: [
      "Everything in Creator",
      "Three editing seats",
      "15 GB of shared upload storage",
      "Roles and project assignments",
      "Team payouts and workload reports",
      "Free viewer access",
    ],
    note: "Extra editor seats cost $5/month and add 2 GB of shared upload storage.",
    cta: "Join the waitlist",
  },
] as const;

const proofEvents = [
  {
    kind: "Project",
    action: "Project created",
    project: "Summer launch film",
    detail: "",
    time: "9:02 AM",
    owner: "Jordan",
  },
  {
    kind: "Project",
    action: "Status changed",
    project: "Summer launch film",
    detail: "In progress",
    time: "9:04 AM",
    owner: "Jordan",
  },
  {
    kind: "Review",
    action: "Comment added",
    project: "Summer launch film",
    detail: "Tighten the cut here.",
    time: "9:15 AM",
    owner: "Priya",
  },
  {
    kind: "Review",
    action: "Version added",
    project: "Summer launch film",
    detail: "v3.mp4",
    time: "10:11 AM",
    owner: "Alex",
  },
  {
    kind: "Delivery",
    action: "Deliverable status changed",
    project: "Field Notes episode 12",
    detail: "Delivered",
    time: "11:32 AM",
    owner: "Jordan",
  },
] as const;

const proofWeeks = [
  {
    label: "Apr 28 – May 4",
    projects: [
      {
        day: "Tue, Apr 29",
        name: "Product teaser",
        type: "Video · Product",
        due: "Apr 29\n4:00 PM",
        review: "Needs review",
        status: "Review",
      },
      {
        day: "Fri, May 2",
        name: "Campaign cutdowns",
        type: "Video · Social",
        due: "May 2\n2:00 PM",
        review: "Complete",
        status: "Delivered",
      },
    ],
  },
  {
    label: "May 5 – May 11",
    projects: [
      {
        day: "Mon, May 5",
        name: "Summer launch film",
        type: "Video · Campaign",
        due: "May 5\n5:00 PM",
        review: "Needs review",
        status: "In progress",
      },
      {
        day: "Tue, May 6",
        name: "Q2 team reel",
        type: "Video · Social",
        due: "May 6\n3:00 PM",
        review: "Complete",
        status: "Delivered",
      },
      {
        day: "Wed, May 7",
        name: "Founder story cutdown",
        type: "Video · Brand",
        due: "May 7\n10:00 AM",
        review: "Needs review",
        status: "Review",
      },
      {
        day: "Thu, May 8",
        name: "Field Notes episode 12",
        type: "Video · Editorial",
        due: "May 8\n11:00 AM",
        review: "Complete",
        status: "Delivered",
      },
    ],
  },
  {
    label: "May 12 – May 18",
    projects: [
      {
        day: "Mon, May 12",
        name: "Aperture Coffee profile",
        type: "Video · Brand",
        due: "May 12\n1:00 PM",
        review: "Needs review",
        status: "In progress",
      },
      {
        day: "Thu, May 15",
        name: "Orbit Labs demo",
        type: "Video · Product",
        due: "May 15\n6:00 PM",
        review: "Not started",
        status: "Planning",
      },
    ],
  },
] as const;

function SectionTitle({ children }: { children: string }) {
  return <h2 className="story-title">{children}</h2>;
}

export default function ProductStory() {
  const [proofFilter, setProofFilter] = useState("All events");
  const [proofWeek, setProofWeek] = useState(1);
  const visibleProofEvents =
    proofFilter === "All events"
      ? proofEvents
      : proofEvents.filter((event) => event.kind === proofFilter);

  return (
    <div className="product-story">
      <WorkflowDemo />
      <ClientReviewDemo />
      <DeliveryDemo />

      <section
        className="story-section proof-story"
        id="proof"
        aria-label="Activity tracking"
      >
        <div className="story-heading">
          <SectionTitle>Project updates and deadlines.</SectionTitle>
          <p>
            Follow project changes, review activity, and upcoming deadlines.
          </p>
        </div>
        <div className="proof-workspace">
          <section className="proof-activity" aria-label="Project activity">
            <div className="proof-panel-head">
              <h3>Project activity</h3>
              <label>
                <span className="sr-only">Filter activity</span>
                <select
                  value={proofFilter}
                  onChange={(event) => setProofFilter(event.target.value)}
                >
                  <option>All events</option>
                  <option>Project</option>
                  <option>Review</option>
                  <option>Delivery</option>
                </select>
              </label>
            </div>
            <p className="proof-today">Today</p>
            <div className="proof-event-list">
              {visibleProofEvents.map((event) => {
                const EventIcon =
                  event.kind === "Review"
                    ? MessageSquare
                    : event.kind === "Delivery"
                      ? CheckCircle2
                      : FileVideo;
                return (
                  <article
                    className="proof-event"
                    key={`${event.action}-${event.time}`}
                  >
                    <span className="proof-event-icon">
                      <EventIcon size={13} />
                    </span>
                    <div>
                      <strong>{event.action}</strong>
                      <p>
                        {event.project}
                        {event.detail ? (
                          <>
                            {" "}
                            · <em>{event.detail}</em>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <small>
                      {event.time}
                      <br />
                      {event.owner}
                    </small>
                  </article>
                );
              })}
            </div>
            <button
              className="proof-panel-action"
              type="button"
              onClick={() => setProofFilter("All events")}
            >
              View all activity <ArrowRight size={14} />
            </button>
          </section>

          <section
            className="proof-ledger"
            aria-label="Sample project deadlines"
          >
            <div className="proof-panel-head proof-week-head">
              <h3>Project deadlines</h3>
              <div>
                <button
                  type="button"
                  aria-label="Previous week"
                  disabled={proofWeek === 0}
                  onClick={() => setProofWeek((week) => Math.max(0, week - 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>{proofWeeks[proofWeek].label}</span>
                <button
                  type="button"
                  aria-label="Next week"
                  disabled={proofWeek === proofWeeks.length - 1}
                  onClick={() =>
                    setProofWeek((week) =>
                      Math.min(proofWeeks.length - 1, week + 1)
                    )
                  }
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="proof-ledger-head">
              <span>Project</span>
              <span>Due</span>
              <span>Review</span>
              <span>Status</span>
            </div>
            <div className="proof-project-list">
              {proofWeeks[proofWeek].projects.map((project) => (
                <div className="proof-project-group" key={project.name}>
                  <p>{project.day}</p>
                  <div className="proof-project-row">
                    <span className="proof-project-name">
                      <FolderKanban size={16} />
                      <span>
                        <strong>{project.name}</strong>
                        <small>{project.type}</small>
                      </span>
                    </span>
                    <time>
                      {project.due.split("\n").map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </time>
                    <span className="proof-state">
                      <i
                        className={
                          project.review === "Complete" ? "is-complete" : ""
                        }
                      />
                      {project.review}
                    </span>
                    <span className="proof-state">
                      <i
                        className={
                          project.status === "Delivered" ? "is-complete" : ""
                        }
                      />
                      {project.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="proof-panel-action"
              type="button"
              disabled={proofWeek === 1}
              onClick={() => setProofWeek(1)}
            >
              Return to sample week <ArrowRight size={14} />
            </button>
          </section>
        </div>
      </section>

      <section
        className="story-section pricing-story"
        id="pricing"
        aria-label="Pricing"
      >
        <div className="story-heading">
          <SectionTitle>Planned pricing.</SectionTitle>
          <p>
            Early access storage, limits, and features may differ from these
            planned tiers. Storage covers uploaded images, files, and videos.
            Embedded videos stay with the third-party host and do not count
            toward your storage limit.
          </p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan) => (
            <article
              className={`price-plan${plan.name === "Creator" ? " is-featured" : ""}`}
              key={plan.name}
            >
              {plan.name === "Creator" ? (
                <div className="plan-badge">Best value</div>
              ) : null}
              <span>{plan.name}</span>
              <strong>
                {plan.price}
                <small>{plan.billing}</small>
              </strong>
              <div className="plan-billing-meta">
                {plan.annual ? (
                  <div className="plan-status">or {plan.annual}</div>
                ) : null}
                {plan.trial ? (
                  <div className="plan-trial">{plan.trial}</div>
                ) : null}
              </div>
              <p>{plan.description}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={15} />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.note ? (
                <small className="plan-note">{plan.note}</small>
              ) : null}
              <SiteButton href="/waitlist">
                {plan.cta} <ArrowRight size={15} />
              </SiteButton>
            </article>
          ))}
        </div>
      </section>

      <footer className="story-footer">
        <div className="footer-main">
          <div className="footer-statement">
            <a className="footer-brand" href="#top" aria-label="Relay home">
              <Image
                src="/brand/relay/lockup-accent.svg"
                alt="Relay"
                width={160}
                height={50}
              />
            </a>
            <h2>Organize your next editing project.</h2>
          </div>
          <div className="footer-action">
            <p>
              Manage projects, review uploaded videos with clients, and track
              delivery in Relay.
            </p>
            <SiteButton href="/waitlist">
              Join the waitlist <ArrowRight size={17} />
            </SiteButton>
            <nav className="footer-socials" aria-label="Social links">
              <a
                href="https://www.instagram.com/zns.studios/"
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
              <a
                href="https://x.com/znsstudios"
                target="_blank"
                rel="noreferrer"
              >
                X
              </a>
              <a href="mailto:zns.studioss@gmail.com">Email</a>
            </nav>
          </div>
        </div>
        <div className="footer-bottom">
          <p>Production workspace for video editors.</p>
          <nav aria-label="Footer navigation">
            <a href="#workflow">Workflow</a>
            <a href="#client-review">Review</a>
            <a href="#delivery">Delivery</a>
            <a href="#pricing">Pricing</a>
            <a href="https://relay-app.cc.cd/privacy">Privacy</a>
          </nav>
          <p>© 2026 Relay</p>
        </div>
      </footer>
    </div>
  );
}
