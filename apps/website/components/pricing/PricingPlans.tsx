import { CheckCircleIcon, ClockIcon } from "@phosphor-icons/react/ssr";
import { plans, type Plan } from "@relay/shared/plans";
import { Button } from "@/components/ui/button";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import Reveal from "../site/Reveal";
import styles from "@relay/shared/pricing-plans.module.css";

/**
 * Plan showcase used on the home page and /pricing: three plan cards with a
 * price panel, feature list, "who it's for" block, and a full-width button. Cards share a subgrid so every row lines up. The
 * panel reveals as one block so the subgrid stays intact.
 */
export default function PricingPlans() {
  return (
    <Reveal>
      <div className={styles.plans}>
        {plans.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </div>
    </Reveal>
  );
}

/** One plan card. A plan with a `tab` gets a label tab above the card. */
function PlanCard({ plan }: { plan: Plan }) {
  const titleId = `plan-${plan.name.toLowerCase()}`;

  return (
    <article className={styles.plan} aria-labelledby={titleId}>
      {plan.tab ? <p className={styles.tab}>{plan.tab}</p> : null}
      <div className={styles.top}>
        <h3 id={titleId}>{plan.name}</h3>
        <p className={styles.description}>{plan.description}</p>
        <p className={styles.price}>
          <strong>{plan.price}</strong>
          <span>{plan.period}</span>
        </p>
        <p className={styles.status}>{plan.status}</p>
      </div>
      <ul className={styles.features}>
        {plan.features.map((feature) => (
          <li key={feature}>
            <CheckCircleIcon size={18} aria-hidden="true" />
            {feature}
          </li>
        ))}
        {plan.comingSoon.map((feature) => (
          <li key={feature} className={styles.soon}>
            <ClockIcon size={18} aria-hidden="true" />
            {feature} (coming soon)
          </li>
        ))}
      </ul>
      <div className={styles.audience}>
        <h4>Who&apos;s the {plan.name} plan for?</h4>
        <p>{plan.audience}</p>
      </div>
      <p className={styles.note}>{plan.note}</p>
      <div className={styles.cta}>
        {plan.cta ? (
          <InteractiveHoverButton href={plan.cta.href} className="w-full">
            {plan.cta.label}
          </InteractiveHoverButton>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            Not available yet
          </Button>
        )}
      </div>
    </article>
  );
}
