import { Suspense } from "react";
import DashboardClient from "@/components/analytics/DashboardClient";

export default function AnalyticsPage() {
  return (
    <Suspense>
      <DashboardClient initialTab="overview" />
    </Suspense>
  );
}
