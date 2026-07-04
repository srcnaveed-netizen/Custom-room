import db from "@/api/client";

import React, { useState, useEffect } from "react";

import { Trash2, Pencil, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import RankBadge from "@/components/RankBadge";

export default function AdminPlayersTab({ rooms, signups, onUpdate }) {
  const { toast } = useToast();
  const [filterRoom, setFilterRoom] = useState("all");
  const [editingSignup, setEditingSignup] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const roomForId = (roomId) => rooms.find((r) => r.id === roomId);

  const filtered = filterRoom === "all" ? signups : signups.filter((s) => s.room_id === filterRoom);

  const removeSignup = async (signupId) => {
    try {
      await db.entities.Signup.delete(signupId);
      setConfirmDelete(null);
      onUpdate();
      toast({ title: "Player removed" });
    } catch {
      toast({ title: "Error", description: "Failed to remove player.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-white/40" />
        <Select value={filterRoom} onValueChange={setFilterRoom}>
          <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1d24] border-white/10">
            <SelectItem value="all" className="text-white hover:bg-white/10">All Rooms</SelectItem>
            {rooms.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-white hover:bg-white/10">{r.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-white/40">{filtered.length} players</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <p className="text-sm">No signups yet</p>
        </div>
      ) : (
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/[0.06]">
                  <th className="text-left py-3 px-4">IGN</th>
                  <th className="text-left py-3 px-4 hidden sm:table-cell">UID</th>
                  <th className="text-left py-3 px-4 hidden md:table-cell">Room</th>
                  <th className="text-left py-3 px-4">Rank</th>
                  <th className="text-left py-3 px-4 hidden sm:table-cell">Kills</th>
                  <th className="text-left py-3 px-4 hidden sm:table-cell">UC</th>
                  <th className="text-left py-3 px-4">Payout</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const room = roomForId(s.room_id);
                  return (
                    <tr key={s.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <p className="text-white font-medium">{s.pubg_ign}</p>
                        <p className="text-white/30 text-xs sm:hidden">{s.pubg_uid}</p>
                      </td>
                      <td className="py-3 px-4 text-white/60 font-mono text-xs hidden sm:table-cell">{s.pubg_uid}</td>
                      <td className="py-3 px-4 text-white/50 hidden md:table-cell">{room?.title || "—"}</td>
                      <td className="py-3 px-4"><RankBadge rank={s.rank} /></td>
                      <td className="py-3 px-4 text-white/60 hidden sm:table-cell">{s.kills ?? 0}</td>
                      <td className="py-3 px-4 text-white/60 hidden sm:table-cell">{s.uc_amount ?? 0}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-semibold ${s.payout_status === "Sent" ? "text-[#0084FF]" : "text-amber-400"}`}>
                          {s.payout_status || "Pending"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingSignup(s)}
                            className="p-1.5 text-white/30 hover:text-[#0084FF] hover:bg-[#0084FF]/10 rounded-lg transition-all"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {confirmDelete === s.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => removeSignup(s.id)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded">Delete</button>
                              <button onClick={() => setConfirmDelete(null)} className="px-1 py-1 text-xs text-white/40 hover:bg-white/10 rounded">✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(s.id)}
                              className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Popup */}
      <EditSignupDialog
        signup={editingSignup}
        room={editingSignup ? roomForId(editingSignup.room_id) : null}
        onClose={() => setEditingSignup(null)}
        onUpdate={onUpdate}
      />
    </div>
  );
}

function EditSignupDialog({ signup, room, onClose, onUpdate }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    rank: "none",
    kills: 0,
    uc_amount: 0,
    payout_status: "Pending",
  });

  useEffect(() => {
    if (signup) {
      setForm({
        rank: signup.rank || "none",
        kills: signup.kills ?? 0,
        uc_amount: signup.uc_amount ?? 0,
        payout_status: signup.payout_status || "Pending",
      });
    }
  }, [signup]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await db.entities.Signup.update(signup.id, {
        rank: form.rank,
        kills: Number(form.kills),
        uc_amount: Number(form.uc_amount),
        payout_status: form.payout_status,
      });
      toast({ title: "Player updated" });
      onClose();
      onUpdate();
    } catch {
      toast({ title: "Error", description: "Failed to update player.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!signup} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#1a1d24] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Player</DialogTitle>
        </DialogHeader>
        {signup && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-white/[0.04]">
              <p className="text-white font-medium">{signup.pubg_ign}</p>
              <p className="text-white/40 text-sm">UID: {signup.pubg_uid} · {room?.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/60 text-sm mb-1.5 block">Rank</Label>
                <Select value={form.rank} onValueChange={(v) => setForm((f) => ({ ...f, rank: v }))}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d24] border-white/10">
                    <SelectItem value="none" className="text-white hover:bg-white/10">None</SelectItem>
                    <SelectItem value="1st" className="text-white hover:bg-white/10">1st Place 🥇</SelectItem>
                    <SelectItem value="2nd" className="text-white hover:bg-white/10">2nd Place 🥈</SelectItem>
                    <SelectItem value="3rd" className="text-white hover:bg-white/10">3rd Place 🥉</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/60 text-sm mb-1.5 block">Kills</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.kills}
                  onChange={(e) => setForm((f) => ({ ...f, kills: e.target.value }))}
                  className="bg-white/[0.04] border-white/[0.08] text-white"
                />
              </div>
              <div>
                <Label className="text-white/60 text-sm mb-1.5 block">UC Amount</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={form.uc_amount}
                    onChange={(e) => setForm((f) => ({ ...f, uc_amount: e.target.value }))}
                    className="bg-white/[0.04] border-white/[0.08] text-white"
                  />
                  {room?.uc_per_kill != null && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      title={`Auto-calc: ${form.kills || 0} kills × ${room.uc_per_kill} UC/Kill`}
                      onClick={() => setForm((f) => ({ ...f, uc_amount: Number(f.kills || 0) * room.uc_per_kill }))}
                      className="text-[#0084FF] hover:bg-[#0084FF]/10 shrink-0 px-2"
                    >
                      Auto
                    </Button>
                  )}
                </div>
                {room?.uc_per_kill != null && (
                  <p className="text-white/30 text-xs mt-1">{room.uc_per_kill} UC/Kill for this room</p>
                )}
              </div>
              <div>
                <Label className="text-white/60 text-sm mb-1.5 block">Payout Status</Label>
                <Select value={form.payout_status} onValueChange={(v) => setForm((f) => ({ ...f, payout_status: v }))}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d24] border-white/10">
                    <SelectItem value="Pending" className="text-white hover:bg-white/10">Pending</SelectItem>
                    <SelectItem value="Sent" className="text-white hover:bg-white/10">Sent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#0084FF] hover:bg-[#0074e0] text-white">
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button variant="ghost" onClick={onClose} className="text-white/60">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}