import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;           // e.g., "Netflix"
  amount: number;         // e.g., 649
  currency: string;       // e.g., "INR"
  billingCycle: 'monthly' | 'yearly';
  startDate: Date;
  nextPaymentDate: Date;
  category: string;       // e.g., "Entertainment"
  status: 'active' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    billingCycle: { 
      type: String, 
      enum: ['monthly', 'yearly'], 
      required: true 
    },
    startDate: { type: Date, required: true },
    nextPaymentDate: { type: Date, required: true },
    category: { type: String, default: 'General' },
    status: { 
      type: String, 
      enum: ['active', 'cancelled'], 
      default: 'active' 
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', SubscriptionSchema);