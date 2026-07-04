import db from "@/api/client";

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { Plus, ArrowLeft, Gamepad2, Users, Settings, LogOut, Trophy, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import AdminPinGate from "@/components/AdminPinGate";
import AdminRoomSignups from "@/components/AdminRoomSignups";
import AdminPlayersTab from "@/components/AdminPlayersTab";
import AdminSettingsTab from "@/components/AdminSettingsTab";

export default function Admin() {
  return (
    <AdminPinGate>
      <AdminDashboard />
    </AdminPinGate>
  );
}

function AdminDashboard() {
  const [tab, setTab] = useState("rooms");
  const [rooms, setRooms] = useState([]);
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [r, s] = await Promise.all([
          db.entities.Room.list("-created_date", 50),
          db.entities.Signup.list("-created_date", 500),
        ]);
        r.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
        setRooms(r);
        setSignups(s);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [version]);

  const signupsForRoom = (roomId) => signups.filter((s) => s.room_id === roomId);

  const onDragEnd = async (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const reordered = Array.from(rooms);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setRooms(reordered);
    try {
      await db.entities.Room.bulkUpdate(
        reordered.map((room, index) => ({ id: room.id, sort_order: index }))
      );
    } catch {
      setVersion((v) => v + 1);
    }
  };

  const handleOwnerLogout = async () => {
    await db.owner.logout();
    window.location.href = "/";
  };

  const openRoomsCount = rooms.filter((r) => r.status === "Open").length;
  const pendingPayouts = signups
    .filter((s) => s.payout_status !== "Sent")
    .reduce((sum, s) => sum + (s.uc_amount || 0), 0);

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
          <div className="flex items-center gap-4">
            <Link to="/" className="text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold text-white">Owner Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            {tab === "rooms" && (
              <Link to="/admin/create">
                <Button className="bg-[#0084FF] hover:bg-[#0074e0] text-white font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  New Room
                </Button>
              </Link>
            )}
            <button
              onClick={handleOwnerLogout}
              title="Log out of Owner panel"
              className="p-2 text-white/40 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Stats row */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Gamepad2} label="Total Rooms" value={rooms.length} />
          <StatCard icon={DoorOpen} label="Open Rooms" value={openRoomsCount} />
          <StatCard icon={Users} label="Total Signups" value={signups.length} />
          <StatCard icon={Trophy} label="UC Pending" value={pendingPayouts} />
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="flex gap-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab("rooms")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "rooms" ? "bg-[#0084FF] text-white" : "text-white/50 hover:text-white"
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            Rooms
          </button>
          <button
            onClick={() => setTab("players")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "players" ? "bg-[#0084FF] text-white" : "text-white/50 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            Players
          </button>
          <button
            onClick={() => setTab("settings")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "settings" ? "bg-[#0084FF] text-white" : "text-white/50 hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === "rooms" && (
          rooms.length === 0 ? (
            <div className="text-center py-20 text-white/30">
              <p className="text-lg font-medium">No rooms created</p>
              <p className="text-sm mt-1">Create your first room to get started</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="rooms">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
                    {rooms.map((room, index) => (
                      <Draggable key={room.id} draggableId={room.id} index={index}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps}>
                            <AdminRoomSignups
                              room={room}
                              signups={signupsForRoom(room.id)}
                              onUpdate={() => setVersion((v) => v + 1)}
                              dragHandleProps={provided.dragHandleProps}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )
        )}
        {tab === "players" && (
          <AdminPlayersTab rooms={rooms} signups={signups} onUpdate={() => setVersion((v) => v + 1)} />
        )}
        {tab === "settings" && <AdminSettingsTab onLogout={handleOwnerLogout} />}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center gap-2 text-white/40 text-xs mb-1.5">
        <Icon className="w-3.5 h-3.5 text-[#0084FF]/70" />
        {label}
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}
