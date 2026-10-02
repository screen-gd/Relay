import { supportEmail } from "@/lib/support-contact";
import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = {
  title: "Contact | Relay",
  description:
    "Contact Relay for product support, account help, privacy requests, or business inquiries.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactRoute() {
  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Relay",
    url: `${siteUrl}/contact`,
    mainEntity: {
      "@type": "Organization",
      name: "Relay",
      email: supportEmail,
      url: siteUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(contactSchema).replace(/</g, "\\u003c"),
        }}
      />
      <LegalPage
        title="Contact Relay"
        updatedAt="October 2, 2026"
        intro="Get help with the product, your account, privacy requests, or a business inquiry. We review the messages & try to reply under 24 hours."
        sections={[
          {
            title: "Email",
            body: (
              <p>
                Email us directly at{" "}
                <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Clicking
                the address opens your email app to compose a message.
              </p>
            ),
          },
          {
            title: "Response Expectations",
            body: (
              <p>
                Include the page or feature involved, what you expected, and
                what happened. Please do not send passwords, API keys, private
                client files, or payment details.
              </p>
            ),
          },
        ]}
      />
    </>
  );
}
