import { createFileRoute } from "@tanstack/react-router";
import { ContactPage, contactSchema } from "@/app/contact/contact-page";
import { canonical, pageMeta } from "@/lib/route-head";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: pageMeta(
      "Contact | Relay",
      "Contact Relay for product support, account help, privacy requests, or business inquiries."
    ),
    links: [canonical("/contact")],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(contactSchema).replace(/</g, "\\u003c"),
      },
    ],
  }),
  component: ContactPage,
});
