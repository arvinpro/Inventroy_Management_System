"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, User, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false); // ✅ toggle for forgot password

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      role,
    });

    if (res?.error) {
      setError("Invalid email or password");
      toast.error("Login Failed ❌", { description: "Invalid credentials" });
    } else {
      toast.success("Login Successful 🎉", {
        description: `Welcome back, ${role === "admin" ? "Admin" : "Staff"}!`,
      });
      setTimeout(() => router.push("/dashboard"), 1200);
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/auth/forget-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      toast.success("Check your email for reset link ✉️");
      setShowForgot(false);
    } else {
      toast.error("Email not found");
    }
  };

  return (
    <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[url('/inventory.jpg')] bg-cover bg-center brightness-75 blur-sm"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60"></div>

      {/* Login or Forgot Password Card */}
      <Card className="relative w-[400px] bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl text-white rounded-2xl p-6 z-10 transition-transform duration-300 hover:scale-[1.02]">
        {showForgot ? (
          <>
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-3xl font-bold">Forgot Password</CardTitle>
              <CardDescription className="text-gray-200">
                Enter your email to receive a reset link
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-200">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md"
                >
                  Send Reset Link
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-gray-300 hover:text-white flex items-center justify-center gap-2"
                  onClick={() => setShowForgot(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-3xl font-bold tracking-wide">
                {role === "admin" ? "Admin Login" : "Staff Login"}
              </CardTitle>
              <CardDescription className="text-gray-200">
                Sign in to access your dashboard
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <p className="text-sm text-red-400 text-center">{error}</p>
                )}

                {/* Role Switch */}
                <div className="flex justify-center gap-4 mb-2">
                  <Button
                    type="button"
                    variant={role === "admin" ? "default" : "outline"}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                      role === "admin"
                        ? "bg-blue-600 text-white"
                        : "bg-transparent border border-white/30 text-gray-300 hover:bg-white/10"
                    }`}
                    onClick={() => setRole("admin")}
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </Button>
                  <Button
                    type="button"
                    variant={role === "staff" ? "default" : "outline"}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                      role === "staff"
                        ? "bg-green-600 text-white"
                        : "bg-transparent border border-white/30 text-gray-300 hover:bg-white/10"
                    }`}
                    onClick={() => setRole("staff")}
                  >
                    <User className="h-4 w-4" />
                    Staff
                  </Button>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-200">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-200">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-right">
                    <button
                      type="button"
                      className="text-sm text-blue-400 hover:underline"
                      onClick={() => setShowForgot(true)} // ✅ Switch to forgot page
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing In...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
