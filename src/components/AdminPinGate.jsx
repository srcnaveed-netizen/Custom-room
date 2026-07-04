import React, { useState, useEffect } from "react";
import { Shield, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import db from "@/api/client";

export default function AdminPinGate({ children }) {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    db.owner.status()
      .then((res) => setUnlocked(!!res.isOwner))
      .catch(() => setUnlocked(false))
      .finally(() => setChecking(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      await db.owner.login(pin);
      setUnlocked(true);
    } catch {
      setError(true);
      setTimeout(() => setError(false), 2000);
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0084FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (unlocked) return children;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white/[0.04] border border-white/[0.06] rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#0084FF]/10 flex items-center justify-center mx-auto mb-5">
          <Shield className="w-7 h-7 text-[#0084FF]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Owner Access</h2>
        <p className="text-white/40 text-sm mb-6">Enter your PIN to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            maxLength={16}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            autoFocus
            className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 text-center text-lg tracking-[0.3em]"
          />
          {error && <p className="text-red-400 text-sm">Incorrect PIN</p>}
          <Button type="submit" disabled={submitting} className="w-full bg-[#0084FF] hover:bg-[#0074e0] text-white font-semibold">
            <Lock className="w-4 h-4 mr-2" />
            {submitting ? "Checking..." : "Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}
