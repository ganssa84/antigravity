import { Suspense } from "react";
import { notFound } from "next/navigation";
import DashboardClient from "@/components/analytics/DashboardClient";

const VALID_TEAMS = ["AAD", "ASD", "CMSD", "EMD", "PSD", "IATD"];

type Props = {
  params: Promise<{ team: string }>;
};

export default async function TeamDashboardPage({ params }: Props) {
  const { team } = await params;
  const teamUpper = team.toUpperCase();

  if (!VALID_TEAMS.includes(teamUpper)) {
    notFound();
  }

  return (
    <Suspense>
      <DashboardClient initialTab={teamUpper} />
    </Suspense>
  );
}

export function generateStaticParams() {
  return VALID_TEAMS.map((team) => ({ team }));
}
