import mongoose, { Schema, Document } from 'mongoose';

export interface IVaultItem extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  targetAmount: number;    // The full price of the item
  currentAmount: number;   // How much you have saved so far
  category: string;
  description?: string;
  status: 'active' | 'purchased' | 'saved' | 'invested'; 
  createdAt: Date;
  updatedAt: Date;
}

const VaultItemSchema = new Schema<IVaultItem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    
    // This is the field that was causing the error - make sure it is 'targetAmount'
    targetAmount: { type: Number, required: true, min: 1 },
    
    currentAmount: { type: Number, default: 0, min: 0 },
    category: { type: String, required: true, default: 'Shopping' },
    description: { type: String, trim: true },
    status: { 
      type: String, 
      enum: ['active', 'purchased', 'saved', 'invested'], 
      default: 'active' 
    },
  },
  { timestamps: true }
);

// This check prevents "OverwriteModelError" during Next.js hot reloads
export const VaultItem = mongoose.models.VaultItem || mongoose.model<IVaultItem>('VaultItem', VaultItemSchema);