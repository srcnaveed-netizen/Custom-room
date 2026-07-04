import db from "@/api/client";

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { ArrowLeft, Gamepad2, Trophy, Crosshair, Coins, Clock } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import moment from "moment";
import StatusBadge from "@/components/StatusBadge";
import RankBadge from "@/components/RankBadge";

export default function PlayerDashboard() {
  const { user } = useAuth();
  const [signups, setSignups] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [mySignups, allRooms] = await Promise.all([
          db.entities.Signup.filter({ created_by_id: user.id }),
          db.entities.Room.list("-date_time", 50),
        ]);
        setSignups(mySignups);
        setRooms(allRooms);
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [user]);

  const roomForId = (roomId) => rooms.find((r) => r.id === roomId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0084FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to rooms
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-extrabold text-white mb-1">My Dashboard</h1>
        <p className="text-white/40 text-sm mb-6">Your rooms, ranks, and payouts</p>

        {signups.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <Gamepad2 className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No rooms joined yet</p>
            <Link to="/" className="inline-block mt-2 text-[#0084FF] text-sm hover:underline">Browse rooms →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {signups.map((signup) => {
              const room = roomForId(signup.room_id);
              if (!room) return null;
              return (
                <div key={signup.id} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
                  {room.photo && (
                    <div className="h-24 w-full overflow-hidden">
                      <img src={room.photo} alt={room.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Link to={`/room/${room.id}`} className="text-lg font-bold text-white hover:text-[#0084FF] transition-colors">
                          {room.title}
                        </Link>
                        <p className="text-white/40 text-sm">{moment(room.date_time).format("MMM D, h:mm A")} · {room.mode}</p>
                      </div>
                      <StatusBadge status={room.status} />
                    </div>

                    {room.status === "Completed" ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                        <StatBlock icon={Trophy} label="Rank" value={<RankBadge rank={signup.rank} />} />
                        <StatBlock icon={Crosshair} label="Kills" value={<span className="text-white font-bold">{signup.kills ?? 0}</span>} />
                        <StatBlock icon={Coins} label="UC Amount" value={<span className="text-white font-bold">{signup.uc_amount ?? 0} UC</span>} />
                        <StatBlock
                          icon={Clock}
                          label="Payout"
                          value={
                            <span className={`text-xs font-semibold ${signup.payout_status === "Sent" ? "text-[#0084FF]" : "text-amber-400"}`}>
                              {signup.payout_status || "Pending"}
                            </span>
                          }
                        />
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center gap-2 text-white/40 text-sm p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                        <Clock className="w-4 h-4" />
                        Results will be available once this room is completed
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function StatBlock({ icon: Icon, label, value }) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
      <div className="flex items-center gap-1.5 text-white/40 text-xs mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div>{value}</div>
    </div>
  );
}