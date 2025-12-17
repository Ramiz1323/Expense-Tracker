import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { verifyAuth } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/mongodb/db";
import User from "@/lib/mongodb/models/User";
import { Transaction } from "@/lib/mongodb/models/Transaction";

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyAuth(token);

    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Validate ID format first to avoid crash
    if (!mongoose.isValidObjectId(payload.userId)) {
      console.error("Invalid UserId in token:", payload.userId);
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    await connectDB();

    // Convert string ID to Mongoose ObjectId
    const userId = new mongoose.Types.ObjectId(payload.userId);

    // 1. Delete all user's transactions first
    await Transaction.deleteMany({ userId: userId });

    // 2. Delete the user account
    const result = await User.findByIdAndDelete(userId);

    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Clear the token cookie
    cookieStore.delete("token");

    return NextResponse.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    // Ensure we return JSON even on 500
    return NextResponse.json(
      { error: "Internal server error: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    );
  }
}