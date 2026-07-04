import db from "@/api/client";

import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ChevronDown, ChevronUp, Eye,
  GripVertical, Trash2, Pencil, Camera, X, Check, Settings, Trophy
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import StatusBadge from "@/components/StatusBadge";

export default function AdminRoomSignups({ room, signups, onUpdate, dragHandleProps }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [roomId, setRoomId] = useState(room.room_id || "");
  const [roomPassword, setRoomPassword] = useState(room.room_password || "");
  const [reveal, setReveal] = useState(room.reveal_details || false);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(room.title);
  const [editingPrize, setEditingPrize] = useState(false);
  const [prizeValue, setPrizeValue] = useState(room.uc_per_kill ?? 0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const ucPerKill = room.uc_per_kill ?? 0;

  const saveRoomDetails = async () => {
    setSaving(true);
    try {
      await db.entities.Room.update(room.id, {
        room_id: roomId,
        room_password: roomPassword,
        reveal_details: reveal,
      });
      onUpdate();
      toast({ title: "Saved", description: "Room details updated." });
    } finally {
      setSaving(false);
    }
  };

  const saveName = async () => {
    if (!nameValue.trim()) return;
    try {
      await db.entities.Room.update(room.id, { title: nameValue.trim() });
      setEditingName(false);
      onUpdate();
    } catch {
      toast({ title: "Error", description: "Failed to update name.", variant: "destructive" });
    }
  };

  const savePrize = async () => {
    try {
      await db.entities.Room.update(room.id, { uc_per_kill: Number(prizeValue) });
      setEditingPrize(false);
      onUpdate();
    } catch {
      toast({ title: "Error", description: "Failed to update UC per kill.", variant: "destructive" });
    }
  };

  const deleteRoom = async () => {
    try {
      await db.entities.Signup.deleteMany({ room_id: room.id });
      await db.entities.Room.delete(room.id);
      onUpdate();
      toast({ title: "Room deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete room.", variant: "destructive" });
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      await db.entities.Room.update(room.id, { photo: file_url });
      onUpdate();
      toast({ title: "Photo updated" });
    } catch {
      toast({ title: "Error", description: "Failed to upload photo.", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="w-full flex items-center gap-3 p-5 hover:bg-white/[0.02] transition-colors">
        <div {...(dragHandleProps || {})} className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/40 shrink-0">
          <GripVertical className="w-5 h-5" />
        </div>

        <button onClick={() => setExpanded(!expanded)} className="flex-1 flex items-center gap-3 text-left min-w-0">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.06] shrink-0">
            {room.photo && <img src={room.photo} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-bold truncate">{room.title}</h3>
            <p className="text-white/40 text-sm truncate">
              {moment(room.date_time).format("MMM D, h:mm A")} · {room.mode} · {ucPerKill} UC/Kill · {signups.length} players
            </p>
          </div>
          <StatusBadge status={room.status} />
          {expanded ? <ChevronUp className="w-5 h-5 text-white/30 shrink-0" /> : <ChevronDown className="w-5 h-5 text-white/30 shrink-0" />}
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={deleteRoom} className="px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded transition-colors">Delete</button>
            <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-xs text-white/40 hover:bg-white/10 rounded transition-colors">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all shrink-0">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06]">
          {/* Room Settings */}
          <div className="p-5 border-b border-white/[0.06] bg-white/[0.02]">
            <h4 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#0084FF]" />
              Room Settings
            </h4>
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <Label className="text-white/50 text-xs mb-1.5 block">Cover Photo</Label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="relative w-24 h-24 rounded-lg overflow-hidden bg-white/[0.06] border border-white/10 flex items-center justify-center group shrink-0"
                >
                  {room.photo ? (
                    <>
                      <img src={room.photo} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <Camera className="w-6 h-6 text-white/30" />
                  )}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-[#0084FF] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-white/50 text-xs mb-1.5 block">Room Name</Label>
                  {editingName ? (
                    <div className="flex gap-2">
                      <Input
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveName()}
                        className="bg-white/[0.04] border-white/[0.08] text-white"
                      />
                      <Button size="sm" onClick={saveName} className="bg-[#0084FF] hover:bg-[#0074e0] text-white shrink-0">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingName(false); setNameValue(room.title); }} className="text-white/40 shrink-0">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{room.title}</span>
                      <button onClick={() => setEditingName(true)} className="p-1 text-white/30 hover:text-[#0084FF] transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-white/50 text-xs mb-1.5 block">UC per Kill</Label>
                  {editingPrize ? (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={prizeValue}
                        onChange={(e) => setPrizeValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && savePrize()}
                        className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                      />
                      <Button size="sm" onClick={savePrize} className="bg-[#0084FF] hover:bg-[#0074e0] text-white shrink-0">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingPrize(false); setPrizeValue(room.uc_per_kill ?? 0); }} className="text-white/40 shrink-0">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-[#0084FF]/60" />
                      <span className="text-white font-medium">{ucPerKill} UC/Kill</span>
                      <button onClick={() => setEditingPrize(true)} className="p-1 text-white/30 hover:text-[#0084FF] transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <Link to={`/admin/edit/${room.id}`} className="inline-block text-xs text-[#0084FF] hover:underline">
                  Edit full room details →
                </Link>
              </div>
            </div>
          </div>

          {/* Room Credentials */}
          <div className="p-5 bg-white/[0.02]">
            <h4 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#0084FF]" />
              Room Credentials
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <Label className="text-white/50 text-xs mb-1 block">Room ID</Label>
                <Input
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter Room ID"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <Label className="text-white/50 text-xs mb-1 block">Password</Label>
                <Input
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  placeholder="Enter password"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={reveal} onCheckedChange={setReveal} />
                  <span className="text-sm text-white/60">{reveal ? "Visible" : "Hidden"}</span>
                </div>
                <Button onClick={saveRoomDetails} disabled={saving} size="sm" className="bg-[#0084FF] hover:bg-[#0074e0] text-white">
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}