import { Suspense } from "react";
import { notFound } from "next/navigation";
import DashboardClient from "@/components/analytics/DashboardClient";

const VALID_TEAMS = ["AAD", "ASD", "CMSD", "EMD", "PSD", "IATD"];

type Props = {
  params: Promise<{ team: string }>;
  searchParams: Promise<{ year?: string }>;
};

export default async function TeamDashboardPage({ params, searchParams }: Props) {
  const { team } = await params;
  const sp = await searchParams;

  if (!VALID_TEAMS.includes(team.toUpperCase())) {
    notFound();
  }

  const year = sp.year || "ALL";

  return (
    <Suspense>
      <DashboardClient initialTeam={team.toUpperCase()} initialYear={year} />
    </Suspense>
  );
}

export function generateStaticParams() {
  return VALID_TEAMS.map((team) => ({ team }));
}
