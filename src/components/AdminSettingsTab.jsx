import db from "@/api/client";

import React, { useState } from "react";
import { KeyRound, Check, LogOut, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function AdminSettingsTab({ onLogout }) {
  const { toast } = useToast();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChangePin = async (e) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      toast({ title: "Error", description: "New PINs do not match.", variant: "destructive" });
      return;
    }
    if (newPin.length < 4) {
      toast({ title: "Error", description: "New PIN must be at least 4 characters.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await db.owner.changePin(currentPin, newPin);
      toast({ title: "PIN updated", description: "Your Owner PIN has been changed." });
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to update PIN.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-[#0084FF]" />
          <h3 className="text-white font-semibold">Owner Session</h3>
        </div>
        <p className="text-white/40 text-sm mb-4">You're currently signed in as Owner on this device.</p>
        <Button variant="ghost" onClick={onLogout} className="text-white/60 hover:text-white hover:bg-white/[0.06]">
          <LogOut className="w-4 h-4 mr-2" />
          Log out of Owner panel
        </Button>
      </div>

      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-4 h-4 text-[#0084FF]" />
          <h3 className="text-white font-semibold">Change Owner PIN</h3>
        </div>
        <p className="text-white/40 text-sm mb-4">
          Update the PIN used to access this panel. This takes effect immediately — you won't need to redeploy.
        </p>
        <form onSubmit={handleChangePin} className="space-y-3">
          <div>
            <Label className="text-white/50 text-xs mb-1.5 block">Current PIN</Label>
            <Input
              type="password"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white"
              required
            />
          </div>
          <div>
            <Label className="text-white/50 text-xs mb-1.5 block">New PIN</Label>
            <Input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white"
              required
            />
          </div>
          <div>
            <Label className="text-white/50 text-xs mb-1.5 block">Confirm New PIN</Label>
            <Input
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white"
              required
            />
          </div>
          <Button type="submit" disabled={saving} className="bg-[#0084FF] hover:bg-[#0074e0] text-white font-semibold">
            <Check className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Update PIN"}
          </Button>
        </form>
      </div>
    </div>
  );
}
