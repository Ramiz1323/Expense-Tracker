"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from "react";
import * as faceapi from 'face-api.js';
import { ScanFace, Camera, Loader2 } from "lucide-react";

type BiometricStatus = "idle" | "scanning" | "processing" | "failed";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const autoScanRef = useRef<NodeJS.Timeout[]>([]);
  const autoScanRunningRef = useRef(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>("idle");
  const [scanSession, setScanSession] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);


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

  const startCamera = async () => {
    if (!videoRef.current) {
      alert("Video element not mounted");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setCameraReady(true);
    } catch (err) {
      console.error(err);
      alert("Camera permission denied or failed");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach(track => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  };

  useEffect(() => {
    if (!showBiometric) return;

    requestAnimationFrame(() => {
      startCamera();
    });
  }, [showBiometric, scanSession]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push("/dashboard");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const scanOnce = async (): Promise<boolean> => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return false;
    setBiometricStatus("scanning");

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
        setBiometricStatus("scanning");
        return false;
      }
      setBiometricStatus("processing");
      const res = await fetch("/api/auth/face-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptor: Array.from(detection.descriptor),
        }),
      });

      if (res.ok) {
        stopCamera();
        router.push("/dashboard");
        return true;
      }

      return false;
    } catch (err) {
      console.error("Scan error:", err);
      return false;
    }
  };

  useEffect(() => {
    if (!showBiometric || !cameraReady) return;
    if (autoScanRunningRef.current) return;

    autoScanRunningRef.current = true;

    const delays = [1500, 5000, 5000]; // ms
    let attempt = 0;

    const runScan = async () => {
      if (!showBiometric) return;

      const success = await scanOnce();
      if (success) return;

      attempt++;
      if (attempt >= delays.length) {
        autoScanRunningRef.current = false;
        stopCamera();
        setBiometricStatus("failed");
        return;
      }


      const timeout = setTimeout(runScan, delays[attempt]);
      autoScanRef.current.push(timeout);
    };

    const firstTimeout = setTimeout(runScan, delays[0]);
    autoScanRef.current.push(firstTimeout);

    return () => {
      autoScanRef.current.forEach(clearTimeout);
      autoScanRef.current = [];
      autoScanRunningRef.current = false;
    };
  }, [showBiometric, cameraReady, scanSession]);


  useEffect(() => {
    if (!showBiometric) {
      stopCamera();
      setBiometricStatus("idle");
    }
  }, [showBiometric]);



  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Login to your Personal Finance Tracker
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* OR DIVIDER */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            <span className="text-xs font-medium text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>


          {/* BIOMETRIC LOGIN (HIDDEN BY DEFAULT) */}
          <div className="mt-4 space-y-4">
            {!showBiometric && (
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setShowBiometric(true);
                  setBiometricStatus("scanning");
                  setScanSession(s => s + 1);
                }}
                disabled={!modelsLoaded}
                className="w-full flex items-center justify-center gap-2"
              >
                <ScanFace className="h-4 w-4" />
                {!modelsLoaded ? "Preparing Face Login…" : "Use Face ID"}
              </Button>
            )}

            {showBiometric && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                {/* Camera View */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-black border">
                  {!cameraReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                      <Camera className="h-8 w-8 mb-2 opacity-50" />

                    </div>
                  )}

                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    muted
                    playsInline
                  />

                  {/* STATUS OVERLAY (only when active) */}
                  {cameraReady && (biometricStatus === "scanning" ||
                    biometricStatus === "processing") && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white text-sm">
                        <Loader2 className="h-5 w-5 animate-spin mb-2" />
                        {biometricStatus === "scanning"
                          ? "Scanning your face…"
                          : "Verifying identity…"}
                      </div>
                    )}
                </div>
                {biometricStatus === "failed" && (
                  <div className="space-y-3 text-center">
                    <p className="text-sm text-muted-foreground">
                      Face verification failed. Please try again.
                    </p>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          autoScanRef.current.forEach(clearTimeout);
                          autoScanRef.current = [];
                          autoScanRunningRef.current = false;

                          stopCamera();
                          setShowBiometric(false);
                          setBiometricStatus("idle");
                        }}
                      >
                        Cancel
                      </Button>

                      <Button
                        className="flex-1"
                        onClick={() => {
                          stopCamera();

                          autoScanRef.current.forEach(clearTimeout);
                          autoScanRef.current = [];
                          autoScanRunningRef.current = false;

                          setBiometricStatus("scanning");
                          setScanSession(s => s + 1); // 🔥 triggers camera + autoscan
                        }}
                      >
                        Retry Face ID
                      </Button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/auth/sign-up" className="text-blue-600 hover:underline dark:text-blue-400">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
