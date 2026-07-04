import React from "react";

const statusStyles = {
  Open: "bg-[#0084FF]/20 text-[#0084FF] border-[#0084FF]/30",
  Full: "bg-white/10 text-white/60 border-white/20",
  Live: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Completed: "bg-white/5 text-white/40 border-white/10",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${statusStyles[status] || statusStyles.Open}`}>
      {status === "Live" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {status}
    </span>
  );
}