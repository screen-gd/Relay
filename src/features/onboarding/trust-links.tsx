const aboutUrl = "https://web.relay-app.cc.cd/about";
const privacyDataUrl = "https://web.relay-app.cc.cd/privacy-and-data";

/**
 * Links to the marketing pages about Relay and how it handles data. Rendered
 * inside a paragraph that sets the surrounding type style.
 */
export function TrustLinks() {
  return (
    <>
      <a
        className="underline underline-offset-2"
        href={aboutUrl}
        target="_blank"
        rel="noreferrer"
      >
        About
      </a>{" "}
      and{" "}
      <a
        className="underline underline-offset-2"
        href={privacyDataUrl}
        target="_blank"
        rel="noreferrer"
      >
        Privacy &amp; Data
      </a>
    </>
  );
}
