import {
  CREATOR_MONTHLY_PRICE_USD,
  TEAM_MONTHLY_PRICE_USD,
  TEAM_INCLUDED_EDITOR_SEATS,
  EXTRA_EDITOR_MONTHLY_PRICE_USD,
  CREATOR_LAUNCH_STORAGE_GB,
  TEAM_LAUNCH_STORAGE_GB,
  FREE_OPEN_PROJECT_LIMIT,
  formatUsd,
} from "../../lib/plans";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Reveal from "../site/Reveal";
import styles from "./PricingFaq.module.css";

const faqs = [
  {
    question: "Is Relay free?",
    answer: `Yes. Free includes ${FREE_OPEN_PROJECT_LIMIT} projects in progress at a time, unlimited clients and project history, external video reviews, standard client portals, and basic payment tracking. Delivered and archived projects do not count toward the limit. There is no time limit, and no invite is required.`,
  },
  {
    question: "Can I upload files?",
    answer: `Not yet. File uploads are still in development. Planned launch storage is ${CREATOR_LAUNCH_STORAGE_GB} GB for Creator and ${TEAM_LAUNCH_STORAGE_GB} GB shared for Team. Link videos from YouTube, Vimeo, Drive, or Dropbox in the meantime.`,
  },
  {
    question: "When can I get Creator or Team?",
    answer: (
      <>
        Creator is {formatUsd(CREATOR_MONTHLY_PRICE_USD)} per month and Team is{" "}
        {formatUsd(TEAM_MONTHLY_PRICE_USD)} per workspace per month, including{" "}
        {TEAM_INCLUDED_EDITOR_SEATS} editors and the owner counts as one. Extra
        editors are {formatUsd(EXTRA_EDITOR_MONTHLY_PRICE_USD)} each per month.
        Prices are subject to change. Both are still in development, and
        checkout is not live, so there is no way to buy either one yet.
      </>
    ),
  },
  {
    question: "What requires Creator or Team?",
    answer:
      "Client Hub, custom portal branding, reusable Workflow Templates, advanced reports, and payment plans and payment batches require Creator or Team. Batches made on a paid plan stay visible on Free. Hosted file uploads are still in development.",
  },
  {
    question: "Do clients and viewers need paid seats?",
    answer:
      "No. Client review access is free on every plan. Team viewers are free too. Team charges only for internal editors beyond the three included seats.",
  },
  {
    question: "Do linked videos use storage?",
    answer: "No. Embedded and linked videos stay with their host.",
  },
];

/** Pricing questions as a single-open shadcn accordion. Used on /pricing. */
export default function PricingFaq() {
  return (
    <div className={styles.faq}>
      <Reveal>
        <h2 id="pricing-faq-title">Questions</h2>
      </Reveal>
      <Reveal delay={0.1}>
        <Accordion
          type="single"
          collapsible
          defaultValue={faqs[0].question}
          className={styles.list}
          aria-labelledby="pricing-faq-title"
        >
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger className={styles.trigger}>
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className={styles.answer}>
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </div>
  );
}
