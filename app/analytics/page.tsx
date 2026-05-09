import { Suspense } from "react";
import DashboardClient from "@/components/analytics/DashboardClient";

type Props = {
  searchParams: Promise<{ team?: string; year?: string }>;
};

export default async function AnalyticsPage({ searchParams }: Props) {
  const params = await searchParams;
  const team = params.team || "ALL";
  const year = params.year || "ALL";

  return (
    <Suspense>
      <DashboardClient initialTeam={team} initialYear={year} />
    </Suspense>
  );
}
