import type { Metadata } from "next";
import { DashboardApplication } from "@/features/dashboard/dashboard-application";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default function DashboardRoute() {
  return <DashboardApplication />;
}
