import db from "@/api/client";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";

import { ArrowLeft, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import AdminPinGate from "@/components/AdminPinGate";

export default function CreateRoom() {
  return (
    <AdminPinGate>
      <CreateRoomForm />
    </AdminPinGate>
  );
}

function CreateRoomForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({
    title: "",
    photo: "",
    date_time: "",
    mode: "Squad",
    uc_per_kill: 5,
    max_players: 100,
    status: "Open",
  });

  useEffect(() => {
    if (id) {
      db.entities.Room.get(id).then((r) => {
        setForm({
          title: r.title,
          photo: r.photo || "",
          date_time: r.date_time ? r.date_time.slice(0, 16) : "",
          mode: r.mode,
          uc_per_kill: r.uc_per_kill ?? 5,
          max_players: r.max_players,
          status: r.status,
        });
        setLoading(false);
      });
    }
  }, [id]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, photo: file_url }));
    } catch {
      toast({ title: "Error", description: "Failed to upload photo.", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...form,
        uc_per_kill: Number(form.uc_per_kill || 0),
        max_players: Number(form.max_players || 0),
        date_time: new Date(form.date_time).toISOString(),
      };
      if (id) {
        await db.entities.Room.update(id, data);
        toast({ title: "Room updated" });
      } else {
        await db.entities.Room.create(data);
        toast({ title: "Room created" });
      }
      navigate("/admin");
    } catch {
      toast({ title: "Error", description: "Failed to save room.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link to="/admin" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6">
          <h1 className="text-2xl font-extrabold text-white mb-6">
            {id ? "Edit Room" : "Create Room"}
          </h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="text-white/60 text-sm mb-1.5 block">Room Title *</Label>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Friday Night Squad Rush"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30"
              />
            </div>

            <div>
              <Label className="text-white/60 text-sm mb-1.5 block">Cover Photo</Label>
              {form.photo ? (
                <div className="relative group">
                  <img src={form.photo} alt="Cover" className="w-full h-36 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Change Photo
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="w-full h-36 border border-dashed border-white/15 rounded-lg flex items-center justify-center text-white/40 hover:text-white/60 hover:border-white/25 transition-all"
                >
                  {uploadingPhoto ? (
                    <div className="w-6 h-6 border-2 border-[#0084FF] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2 text-sm">
                      <Camera className="w-5 h-5" />
                      Upload Cover Photo
                    </span>
                  )}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-white/60 text-sm mb-1.5 block">Date & Time *</Label>
                <Input
                  required
                  type="datetime-local"
                  value={form.date_time}
                  onChange={(e) => setForm((f) => ({ ...f, date_time: e.target.value }))}
                  className="bg-white/[0.04] border-white/[0.08] text-white [color-scheme:dark]"
                />
              </div>
              <div>
                <Label className="text-white/60 text-sm mb-1.5 block">Mode *</Label>
                <Select value={form.mode} onValueChange={(v) => setForm((f) => ({ ...f, mode: v }))}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d24] border-white/10">
                    {["TDM", "Duo", "Squad", "Solo"].map((m) => (
                      <SelectItem key={m} value={m} className="text-white hover:bg-white/10">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-white/60 text-sm mb-1.5 block">UC per Kill *</Label>
                <Input
                  required
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.uc_per_kill}
                  onChange={(e) => setForm((f) => ({ ...f, uc_per_kill: e.target.value }))}
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                />
              </div>
              <div>
                <Label className="text-white/60 text-sm mb-1.5 block">Max Players *</Label>
                <Input
                  required
                  type="number"
                  min={1}
                  placeholder="0"
                  value={form.max_players}
                  onChange={(e) => setForm((f) => ({ ...f, max_players: e.target.value }))}
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                />
              </div>
              <div>
                <Label className="text-white/60 text-sm mb-1.5 block">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d24] border-white/10">
                    {["Open", "Full", "Live", "Completed"].map((s) => (
                      <SelectItem key={s} value={s} className="text-white hover:bg-white/10">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={saving} className="w-full bg-[#0084FF] hover:bg-[#0074e0] text-white h-11 font-semibold">
              {saving ? "Saving..." : id ? "Update Room" : "Create Room"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}