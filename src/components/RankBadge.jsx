import React from "react";

const rankStyles = {
  "1st": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "2nd": "bg-slate-300/20 text-slate-300 border-slate-300/30",
  "3rd": "bg-orange-700/20 text-orange-600 border-orange-700/30",
  "none": "bg-white/[0.06] text-white/40 border-white/10",
};

const rankLabels = {
  "1st": "1st Place",
  "2nd": "2nd Place",
  "3rd": "3rd Place",
  "none": "Pending",
};

export default function RankBadge({ rank }) {
  const r = rank || "none";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${rankStyles[r]}`}>
      {r === "1st" && "🥇"}
      {r === "2nd" && "🥈"}
      {r === "3rd" && "🥉"}
      {rankLabels[r]}
    </span>
  );
}