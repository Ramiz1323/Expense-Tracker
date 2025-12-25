import mongoose, { Schema, Document } from 'mongoose';

export interface IOtp extends Document {
  email: string; // Changed from phone to email
  code: string;
  createdAt: Date;
}

const OtpSchema = new Schema<IOtp>(
  {
    email: { type: String, required: true }, // Verification target
    code: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 }, // Auto-delete after 5 minutes
  }
);

export const Otp = mongoose.models.Otp || mongoose.model<IOtp>('Otp', OtpSchema);
export default Otp;