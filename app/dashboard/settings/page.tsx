"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import * as faceapi from "face-api.js";

import {
  User,
  Shield,
  Lock,
  Trash2,
  ScanFace,
  Settings as SettingsIcon,
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
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Password
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

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
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
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
        setError(err instanceof Error ? err.message : "Error");
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
      alert("Camera permission denied");
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
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: profile.fullName }),
      });

      if (!res.ok) throw new Error("Failed to update profile");
      setMessage("Profile updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordSaving(true);
    setPasswordError("");
    setPasswordMessage("");

    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwords),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPasswordMessage("Password changed successfully");
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Error");
    } finally {
      setPasswordSaving(false);
    }
  };

  const registerFace = async () => {
    if (faceAuthEnabled) {
      alert("Face authentication is already enabled");
      return;
    }

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
        alert("No face detected");
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
        alert("This face is already linked to another account.");
        setFaceAuthEnabled(false);
        stopCamera();
        return;
      }


      alert("Face authentication enabled");
      setFaceAuthEnabled(true);
      stopCamera();

    } finally {
      setCamLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    await fetch("/api/user/delete", { method: "DELETE" });
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) return <div className="p-6">Loading settings…</div>;

  /* ------------------------ UI ------------------------ */

  return (
    <div className="flex-1 space-y-6 p-6 pb-24">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 rounded-2xl text-white shadow-lg">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-7 w-7" />
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm opacity-90">
              Manage your account, security and preferences
            </p>
          </div>
        </div>
      </div>

      {/* PROFILE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-600" />
            Profile Information
          </CardTitle>
          <CardDescription>Personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="bg-emerald-50 border-emerald-200">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label>Email</Label>
            <Input value={profile.email} disabled />
          </div>

          <div>
            <Label>Full Name</Label>
            <Input
              value={profile.fullName}
              onChange={(e) =>
                setProfile({ ...profile, fullName: e.target.value })
              }
            />
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* SECURITY */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-emerald-600" />
            Security
          </CardTitle>
          <CardDescription>Password management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Current password"
            type="password"
            value={passwords.currentPassword}
            onChange={(e) =>
              setPasswords({ ...passwords, currentPassword: e.target.value })
            }
          />
          <Input
            placeholder="New password"
            type="password"
            value={passwords.newPassword}
            onChange={(e) =>
              setPasswords({ ...passwords, newPassword: e.target.value })
            }
          />
          <Input
            placeholder="Confirm password"
            type="password"
            value={passwords.confirmPassword}
            onChange={(e) =>
              setPasswords({ ...passwords, confirmPassword: e.target.value })
            }
          />

          <Button onClick={handleChangePassword} disabled={passwordSaving}>
            {passwordSaving ? "Updating…" : "Change Password"}
          </Button>

          {passwordMessage && <p className="text-sm">{passwordMessage}</p>}
          {passwordError && (
            <p className="text-sm text-red-600">{passwordError}</p>
          )}
        </CardContent>
      </Card>

      {/* FACE AUTH */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanFace className="h-5 w-5 text-emerald-600" />
            Face Authentication
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ✅ ENABLED STATE */}
          {faceAuthEnabled && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                ✓
              </div>
              <div>
                <p className="font-medium text-emerald-800 dark:text-emerald-300">
                  Face Authentication Enabled
                </p>
                <p className="text-sm text-emerald-700/80 dark:text-emerald-400">
                  You can now log in using face authentication.
                </p>
              </div>
            </div>
          )}

          {/* ❌ NOT ENABLED STATE */}
          {!faceAuthEnabled && (
            <>
              <video
                ref={videoRef}
                className={`rounded-lg border mx-auto ${cameraReady ? "block" : "hidden"
                  }`}
                width={320}
                height={240}
                autoPlay
                muted
                playsInline
              />

              {!cameraReady && (
                <Button
                  variant="outline"
                  onClick={startCamera}
                  disabled={!modelsLoaded}
                  className="w-full"
                >
                  {!modelsLoaded
                    ? "Loading Face Models…"
                    : "Start Face Registration"}
                </Button>
              )}

              {cameraReady && (
                <Button
                  onClick={registerFace}
                  disabled={camLoading}
                  className="w-full"
                >
                  {camLoading ? "Registering…" : "Enable Face Authentication"}
                </Button>
              )}

              <p className="text-xs text-muted-foreground text-center">
                You can enable face authentication once.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* DANGER */}
      <Card className="border-red-500 border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showDeleteConfirm ? (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Account
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleDeleteAccount}>
              {deleting ? "Deleting…" : "Confirm Delete"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}