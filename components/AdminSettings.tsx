"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: session } = useSession();

  // -------------------- States --------------------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Admin-only example
  const [siteName, setSiteName] = useState("");

  // Admin-only: Staff password reset
  const [staffEmail, setStaffEmail] = useState("");
  const [staffNewPassword, setStaffNewPassword] = useState("");

  // Ensure hooks order is stable
  useEffect(() => {
    if (session) {
      setEmail(session.user.email || "");
    }
  }, [session]);

  const isAdmin = session?.user.role === "admin";

  // -------------------- Handlers --------------------

  // Update logged-in user's email (Admin or Staff)
  const handleChangeEmail = async () => {
    if (!email) return toast.error("Email cannot be empty");

    setLoading(true);
    try {
      const res = await fetch("/api/settings/change-email", {
        method: "POST",
        body: JSON.stringify({ newEmail: email }),
      });
      if (res.ok) toast.success("Email updated ✅");
      else toast.error("Failed to update email ❌");
    } catch {
      toast.error("Something went wrong ❌");
    }
    setLoading(false);
  };

  // Update logged-in user's password
  const handleChangePassword = async () => {
    if (!password || !confirmPassword) return toast.error("All fields are required");
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");

    setLoading(true);
    try {
      const res = await fetch("/api/settings/change-password", {
        method: "POST",
        body: JSON.stringify({ newPassword: password }),
      });
      if (res.ok) {
        toast.success("Password updated ✅");
        setPassword("");
        setConfirmPassword("");
      } else toast.error("Failed to update password ❌");
    } catch {
      toast.error("Something went wrong ❌");
    }
    setLoading(false);
  };

  // Admin-only: Reset staff password
  const handleStaffPasswordUpdate = async () => {
    if (!staffEmail || !staffNewPassword) return toast.error("All fields are required");
    if (staffNewPassword.length < 6) return toast.error("Password must be at least 6 characters");

    setLoading(true);
    try {
      const res = await fetch("/api/settings/change-password", {
        method: "POST",
        body: JSON.stringify({ staffEmail, newPassword: staffNewPassword }),
      });
      if (res.ok) {
        toast.success("Staff password updated ✅");
        setStaffEmail("");
        setStaffNewPassword("");
      } else toast.error("Failed to update staff password ❌");
    } catch {
      toast.error("Something went wrong ❌");
    }
    setLoading(false);
  };

  // -------------------- Render --------------------
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white/95 rounded-xl shadow-md space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* -------- Logged-in User Email -------- */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Profile</h2>
        <div>
          <label className="block mb-1 font-medium">Your Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
          />
        </div>

        {isAdmin && (
          <div>
            <label className="block mb-1 font-medium">Site Name (example)</label>
            <Input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Enter site name"
            />
          </div>
        )}

        <Button onClick={handleChangeEmail} disabled={loading} className="w-full">
          {loading ? "Updating..." : "Change Email"}
        </Button>
      </div>

      {/* -------- Password -------- */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Password</h2>
        <div>
          <label className="block mb-1 font-medium">New Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Confirm Password</label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />
        </div>
        <Button onClick={handleChangePassword} disabled={loading} className="w-full">
          {loading ? "Updating..." : "Change Password"}
        </Button>
      </div>

      {/* -------- Admin-only: Staff Password Reset -------- */}
      {isAdmin && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Manage Staff Passwords</h2>
          <div>
            <label className="block mb-1 font-medium">Staff Email</label>
            <Input
              type="email"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              placeholder="Enter staff email"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">New Password</label>
            <Input
              type="password"
              value={staffNewPassword}
              onChange={(e) => setStaffNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <Button onClick={handleStaffPasswordUpdate} disabled={loading} className="w-full">
            {loading ? "Updating..." : "Update Staff Password"}
          </Button>
        </div>
      )}
    </div>
  );
}
