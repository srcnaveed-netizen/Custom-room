import React from "react";
import { Link } from "react-router-dom";
import { Calendar, Users, Swords, Trophy } from "lucide-react";
import moment from "moment";
import StatusBadge from "@/components/StatusBadge";

export default function RoomCard({ room, signupCount }) {
  return (
    <Link to={`/room/${room.id}`} className="block group">
      <div className="relative bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] rounded-2xl overflow-hidden hover:bg-white/[0.07] hover:border-[#0084FF]/20 transition-all duration-300">
        {room.photo && (
          <div className="h-28 w-full overflow-hidden">
            <img src={room.photo} alt={room.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold text-white group-hover:text-[#0084FF] transition-colors truncate pr-3">
              {room.title}
            </h3>
            <StatusBadge status={room.status} />
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Calendar className="w-4 h-4 text-[#0084FF]/60" />
              <span>{moment(room.date_time).format("MMM D, YYYY • h:mm A")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Swords className="w-4 h-4 text-[#0084FF]/60" />
              <span>{room.mode}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Trophy className="w-4 h-4 text-[#0084FF]/60" />
                <span>{room.uc_per_kill ?? 0} UC/Kill</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-[#0084FF]/60" />
                <span className="text-white/70 font-medium">
                  {signupCount}/{room.max_players}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0084FF] rounded-full transition-all duration-500"
              style={{ width: `${Math.min((signupCount / room.max_players) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}