import type { Metadata } from "next";
import { DashboardApplication } from "@/features/dashboard/dashboard-application";

export const metadata: Metadata = {
  title: "Sample Studio | Relay",
  description: "Explore a populated, read-only Relay production workspace.",
  robots: { index: false, follow: false },
};

export default function SampleStudioPage() {
  return <DashboardApplication />;
}
