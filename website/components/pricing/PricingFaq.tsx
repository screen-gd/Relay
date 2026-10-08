import Link from "next/link";
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
    answer: "Yes. The Free plan has no time limit and no invite is required.",
  },
  {
    question: "Can I upload files?",
    answer:
      "Not yet. File uploads are still in development. Link videos from YouTube, Vimeo, Drive, or Dropbox instead.",
  },
  {
    question: "When can I get Creator or Team?",
    answer: (
      <>
        Creator and Team are not available yet, and prices are not set. Follow
        the <Link href="/roadmap">roadmap</Link> for updates.
      </>
    ),
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
