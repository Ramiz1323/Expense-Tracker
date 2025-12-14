import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  members: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  currency: string;
  createdAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }], // References User model
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    currency: { type: String, default: 'INR' },
  },
  { timestamps: true }
);

export const Group = mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);