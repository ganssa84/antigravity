"use client";

type Props = {
  teams: string[];
  years: number[];
  selectedTeam: string;
  selectedYear: string;
  onTeamChange: (team: string) => void;
  onYearChange: (year: string) => void;
};

export default function FilterBar({
  teams,
  years,
  selectedTeam,
  selectedYear,
  onTeamChange,
  onYearChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Team filter */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        <button
          onClick={() => onTeamChange("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedTeam === "ALL" ? "bg-white/15 text-white" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          전체
        </button>
        {teams.map((team) => (
          <button
            key={team}
            onClick={() => onTeamChange(team)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedTeam === team ? "bg-blue-600/80 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {team}
          </button>
        ))}
      </div>

      {/* Year filter */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        <button
          onClick={() => onYearChange("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedYear === "ALL" ? "bg-white/15 text-white" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          전체
        </button>
        {years.map((year) => (
          <button
            key={year}
            onClick={() => onYearChange(String(year))}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedYear === String(year) ? "bg-blue-600/80 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {year}년
          </button>
        ))}
      </div>
    </div>
  );
}
