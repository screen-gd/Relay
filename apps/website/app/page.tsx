import type { Metadata } from "next";
import Home from "../components/Home";
import { siteOpenGraph } from "../lib/site-metadata";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...siteOpenGraph, url: "/" },
};

export default function Page() {
  return <Home />;
}
