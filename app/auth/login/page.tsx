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


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);

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

  const loginWithFace = async () => {
    if (!videoRef.current) {
      alert("Camera not initialized");
      return;
    }

    if (videoRef.current.readyState !== 4) {
      alert("Camera not ready yet. Please wait.");
      return;
    }

    setFaceLoading(true);

    try {
      await new Promise(res => setTimeout(res, 500));

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
      } else {
        alert("Face login failed");
      }
    } catch (err) {
      console.error(err);
      alert("Face login error");
    } finally {
      setFaceLoading(false);
    }
  };


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

          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            width={320}
            height={240}
            className={`rounded-md border bg-black mx-auto ${cameraReady ? "block" : "hidden"}`}
          />

          {!cameraReady && (
            <Button
              variant="outline"
              type="button"
              onClick={startCamera}
              disabled={!modelsLoaded}
              className="w-full mt-3 flex items-center justify-center gap-2"
            >
              {!modelsLoaded && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              )}
              {!modelsLoaded ? "Loading Face Login..." : "Start Face Login"}
            </Button>


          )}

          {cameraReady && (
            <Button
              variant="outline"
              type="button"
              onClick={loginWithFace}
              disabled={faceLoading}
              className="w-full mt-3"
            >
              {faceLoading ? "Scanning..." : "Scan Face to Login"}
            </Button>
          )}


          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?
            <Link href="/auth/sign-up" className="text-blue-600 hover:underline dark:text-blue-400">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
