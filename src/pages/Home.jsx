import db from "@/api/client";

import React, { useState, useEffect } from "react";

import { Gamepad2, Shield, LayoutDashboard, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import RoomCard from "@/components/RoomCard";

export default function Home() {
  const { isAuthenticated, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [r, s] = await Promise.all([
          db.entities.Room.list("-date_time", 50),
          db.entities.Signup.list("-created_date", 500),
        ]);
        setRooms(r);
        setSignups(s);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const countForRoom = (roomId) =>
    signups.filter((s) => s.room_id === roomId).length;

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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0084FF] flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">PUBG Rooms</span>
          </div>
          <div className="flex items-center gap-2">
            {!isAuthenticated && (
              <Link to="/admin" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.04] transition-all text-sm">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Owner</span>
              </Link>
            )}
            {isAuthenticated && (
              <>
                <Link to="/dashboard" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.04] transition-all text-sm">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <button onClick={() => logout()} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.04] transition-all text-sm">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Custom Rooms</h1>
          <p className="text-white/40 mt-1">Join upcoming matches and compete for glory</p>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <Gamepad2 className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No rooms yet</p>
            <p className="text-sm mt-1">Check back soon for upcoming matches</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} signupCount={countForRoom(room.id)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}