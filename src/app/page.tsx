import type { Metadata } from "next";
import { TrackerApp } from "./tracker-app";

export const metadata: Metadata = {
  alternates: {
    canonical: "/"
  }
};

export default function DashboardRoute() {
  return <TrackerApp page="dashboard" />;
}
