import db from "@/api/client";

import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

import { ArrowLeft, Calendar, Users, Swords, Trophy, Lock, CheckCircle2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import moment from "moment";
import StatusBadge from "@/components/StatusBadge";

export default function RoomDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [room, setRoom] = useState(null);
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    pubg_ign: "",
    pubg_uid: "",
    discord_tag: "",
    squad_name: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const [r, s] = await Promise.all([
          db.entities.Room.get(id),
          db.entities.Signup.filter({ room_id: id }),
        ]);
        setRoom(r);
        setSignups(s);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const isFull = room && signups.length >= room.max_players;
  const mySignup = isAuthenticated ? signups.find((s) => s.created_by_id === user?.id) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.pubg_ign.trim() || !form.pubg_uid.trim()) return;
    if (!/^\d+$/.test(form.pubg_uid.trim())) {
      toast({ title: "Invalid UID", description: "PUBG UID must be numeric.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const newSignup = await db.entities.Signup.create({
        ...form,
        room_id: id,
      });
      setSignups((prev) => [...prev, newSignup]);
      toast({ title: "Signed up!", description: "You're registered for this room." });
    } catch {
      toast({ title: "Error", description: "Could not sign up. Try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0084FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white/40">
        <p className="text-lg">Room not found</p>
        <Link to="/" className="text-[#0084FF] mt-2 text-sm hover:underline">Go back</Link>
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

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Room Info */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
          {room.photo && (
            <div className="h-40 sm:h-52 w-full overflow-hidden">
              <img src={room.photo} alt={room.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-6">
            <div className="flex items-start justify-between mb-5">
              <h1 className="text-2xl font-extrabold text-white">{room.title}</h1>
              <StatusBadge status={room.status} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <InfoBlock icon={Calendar} label="Date & Time" value={moment(room.date_time).format("MMM D, h:mm A")} />
              <InfoBlock icon={Swords} label="Mode" value={room.mode} />
              <InfoBlock icon={Trophy} label="UC per Kill" value={`${room.uc_per_kill ?? 0} UC/Kill`} />
              <InfoBlock icon={Users} label="Slots" value={`${signups.length} / ${room.max_players}`} />
            </div>
          </div>
        </div>

        {/* Signup / Registration Section */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6">
          {mySignup ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-[#0084FF] mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">You're registered!</h3>
              <p className="text-white/40 text-sm mt-1">
                Check your <Link to="/dashboard" className="text-[#0084FF] hover:underline">dashboard</Link> for rank and payout info.
              </p>

              {room.status === "Live" && room.reveal_details && room.room_id ? (
                <div className="mt-6 text-left p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-xs text-[#0084FF] font-semibold uppercase tracking-wider mb-3">Room Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-white/[0.04]">
                      <p className="text-[10px] text-white/40 uppercase mb-1">Room ID</p>
                      <p className="text-white font-mono font-bold">{room.room_id}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.04]">
                      <p className="text-[10px] text-white/40 uppercase mb-1">Password</p>
                      <p className="text-white font-mono font-bold">{room.room_password}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex items-center justify-center gap-2 text-white/40 text-sm">
                  <Lock className="w-4 h-4" />
                  {room.status === "Open" && "Room details will be shared before the match"}
                  {room.status === "Live" && "Room is live — details will be shared shortly"}
                  {room.status === "Full" && "Room is full — no details available"}
                  {room.status === "Completed" && "This room has ended"}
                </div>
              )}
            </div>
          ) : !isAuthenticated ? (
            <div className="text-center py-6">
              <LogIn className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">Login to Sign Up</h3>
              <p className="text-white/40 text-sm mt-1 mb-4">Create an account to join this room</p>
              <Link to="/login">
                <Button className="bg-[#0084FF] hover:bg-[#0074e0] text-white font-semibold">
                  <LogIn className="w-4 h-4 mr-2" />
                  Login / Register
                </Button>
              </Link>
            </div>
          ) : isFull ? (
            <div className="text-center py-6">
              <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">Room Full</h3>
              <p className="text-white/40 text-sm mt-1">All slots are taken. Check back for new rooms!</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-white mb-5">Sign Up</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/60 text-sm mb-1.5 block">PUBG IGN *</Label>
                    <Input
                      required
                      value={form.pubg_ign}
                      onChange={(e) => setForm((f) => ({ ...f, pubg_ign: e.target.value }))}
                      placeholder="Your in-game name"
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <Label className="text-white/60 text-sm mb-1.5 block">PUBG UID *</Label>
                    <Input
                      required
                      value={form.pubg_uid}
                      onChange={(e) => setForm((f) => ({ ...f, pubg_uid: e.target.value }))}
                      placeholder="Numeric UID"
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/60 text-sm mb-1.5 block">Discord / Contact</Label>
                    <Input
                      value={form.discord_tag}
                      onChange={(e) => setForm((f) => ({ ...f, discord_tag: e.target.value }))}
                      placeholder="Optional"
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <Label className="text-white/60 text-sm mb-1.5 block">Squad / Team Name</Label>
                    <Input
                      value={form.squad_name}
                      onChange={(e) => setForm((f) => ({ ...f, squad_name: e.target.value }))}
                      placeholder="Optional"
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-[#0084FF] hover:bg-[#0074e0] text-white h-11 font-semibold">
                  {submitting ? "Signing up..." : "Sign Up"}
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-white/40 text-xs">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <span className="text-white font-semibold text-sm">{value}</span>
    </div>
  );
}