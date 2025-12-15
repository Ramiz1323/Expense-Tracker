"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import * as faceapi from "face-api.js";
import { toast } from "sonner";

import {
  User,
  Shield,
  Lock,
  Trash2,
  ScanFace,
  Settings as SettingsIcon,
  Camera,
  Mail,
  Loader2,
  CheckCircle2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface UserProfile {
  fullName: string;
  email: string;
  avatarUrl?: string;
}

export default function SettingsPage() {
  /* ------------------------ state ------------------------ */
  const [profile, setProfile] = useState<UserProfile>({
    fullName: "",
    email: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Face auth
  const videoRef = useRef<HTMLVideoElement>(null);
  const [faceAuthEnabled, setFaceAuthEnabled] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [camLoading, setCamLoading] = useState(false);

  // Danger zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  /* ------------------------ effects ------------------------ */

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
      } catch (e) {
        console.error("Failed to load face models", e);
      }
    };
    loadModels();
  }, []);

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/auth/login");
            return;
          }
          throw new Error("Failed to fetch profile");
        }

        const data = await res.json();
        setProfile({
          fullName: data.user.fullName || "",
          email: data.user.email || "",
          avatarUrl: data.user.avatarUrl,
        });

        setFaceAuthEnabled(Boolean(data.user.faceAuth?.enabled));

      } catch (err) {
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  // Stop camera on route change
  useEffect(() => {
    return () => stopCamera();
  }, [pathname]);

  /* ------------------------ helpers ------------------------ */

  const startCamera = async () => {
    if (!videoRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraReady(true);
    } catch {
      toast.error("Camera permission denied");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  };

  /* ------------------------ actions ------------------------ */

  const handleSaveProfile = async () => {
    setSaving(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: profile.fullName }),
      });

      if (!res.ok) throw new Error("Failed to update profile");
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (!passwords.currentPassword) {
      toast.error("Current password is required");
      return;
    }

    setPasswordSaving(true);

    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwords),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Password changed successfully");
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const registerFace = async () => {
    if (faceAuthEnabled) return;
    if (!videoRef.current) return;

    setCamLoading(true);

    try {
      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.4,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error("No face detected. Please look at the camera.");
        return;
      }

      const res = await fetch("/api/user/face-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptor: Array.from(detection.descriptor),
        }),
      });

      if (res.status === 409) {
        toast.error("This face is already linked to another account.");
        setFaceAuthEnabled(false);
        stopCamera();
        return;
      }

      toast.success("Face authentication enabled!");
      setFaceAuthEnabled(true);
      stopCamera();

    } catch (e) {
      toast.error("Failed to register face data");
    } finally {
      setCamLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await fetch("/api/user/delete", { method: "DELETE" });
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (e) {
      toast.error("Failed to delete account");
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-6">Loading settings…</div>;

  /* ------------------------ UI ------------------------ */

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 pb-24">
      {/* HEADER - Restored Emerald Gradient */}
      <div className="bg-linear-to-r from-emerald-600 to-teal-600 p-6 rounded-2xl text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <SettingsIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-emerald-50 opacity-90">
              Manage your account, security and preferences
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          
          {/* PROFILE CARD */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-emerald-600" />
                Profile Details
              </CardTitle>
              <CardDescription>Update your public information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input value={profile.email} disabled className="pl-9 bg-slate-50 dark:bg-slate-900" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    className="pl-9"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? "Saving Changes..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          {/* SECURITY CARD */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-emerald-600" />
                Password
              </CardTitle>
              <CardDescription>Ensure your account is secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                />
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  />
                </div>
              </div>

              <Button 
                onClick={handleChangePassword} 
                disabled={passwordSaving} 
                variant="outline"
                className="w-full border-slate-200 hover:bg-slate-50"
              >
                {passwordSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          
          {/* FACE AUTH CARD - Restored Emerald Styling */}
          <Card className={`border-l-4 shadow-sm ${faceAuthEnabled ? 'border-l-emerald-500' : 'border-l-emerald-500'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScanFace className="h-5 w-5 text-emerald-600" />
                Biometric Login
              </CardTitle>
              <CardDescription>Manage Face ID settings</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {faceAuthEnabled ? (
                <div className="flex flex-col items-center justify-center p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20 text-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">Face ID Active</h3>
                  <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                    You can now use facial recognition to log in securely.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Camera Viewport */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800">
                    {!cameraReady && (
                      <div className="text-center text-slate-500">
                        <Camera className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Camera is offline</p>
                      </div>
                    )}
                    
                    <video
                      ref={videoRef}
                      className={`absolute inset-0 w-full h-full object-cover ${cameraReady ? "opacity-100" : "opacity-0"}`}
                      autoPlay
                      muted
                      playsInline
                    />
                    
                    {/* Scanning Overlay Effect - Switched to Emerald Color */}
                    {cameraReady && !camLoading && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="w-48 h-48 border-2 border-emerald-500/50 rounded-lg absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                           <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-[scan_2s_ease-in-out_infinite]" />
                        </div>
                        <p className="absolute bottom-4 w-full text-center text-xs text-white/70 bg-black/40 py-1">
                          Position your face within the frame
                        </p>
                      </div>
                    )}
                  </div>

                  {!cameraReady ? (
                    <Button
                      onClick={startCamera}
                      disabled={!modelsLoaded}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {!modelsLoaded ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Models...
                        </>
                      ) : (
                        <>
                          <Camera className="mr-2 h-4 w-4" /> Start Camera
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={stopCamera} className="flex-1">
                        Cancel
                      </Button>
                      <Button
                        onClick={registerFace}
                        disabled={camLoading}
                        className="flex-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {camLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Scan & Register
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* DANGER ZONE */}
          <Card className="border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-red-600 dark:text-red-400">
                <Shield className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible account actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <p className="font-medium text-slate-900 dark:text-slate-200">Delete Account</p>
                  <p>Permanently remove your data</p>
                </div>
                {!showDeleteConfirm ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                ) : (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
      
      {/* Inline styles for scanning animation */}
      <style jsx>{`
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}