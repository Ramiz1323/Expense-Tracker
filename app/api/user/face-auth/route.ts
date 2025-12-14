import { getCurrentUser } from "@/lib/auth/session";
import { connectDB } from "@/lib/mongodb/db";
import User from "@/lib/mongodb/models/User";
import { NextRequest, NextResponse } from "next/server";

function euclideanDistance(a: number[], b: number[]) {
  return Math.sqrt(
    a.reduce((sum, v, i) => sum + Math.pow(v - b[i], 2), 0)
  );
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { descriptor } = await req.json();
  if (!descriptor || !Array.isArray(descriptor)) {
    return NextResponse.json(
      { error: "Invalid face data" },
      { status: 400 }
    );
  }

  await connectDB();

  // 🔐 Check if face already exists on another account
  const usersWithFace = await User.find({
    "faceAuth.enabled": true,
    _id: { $ne: user.userId }, // exclude current user
  }).select("faceAuth.descriptor");

  for (const u of usersWithFace) {
    const distance = euclideanDistance(
      u.faceAuth.descriptor,
      descriptor
    );

    // 🔒 Stricter threshold for registration
    if (distance < 0.45) {
      return NextResponse.json(
        {
          error:
            "This face is already registered with another account.",
        },
        { status: 409 } // Conflict
      );
    }
  }

  // ✅ Safe to register face
  await User.findByIdAndUpdate(user.userId, {
    faceAuth: {
      enabled: true,
      descriptor,
      createdAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
