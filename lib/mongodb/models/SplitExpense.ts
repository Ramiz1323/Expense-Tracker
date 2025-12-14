import mongoose, { Schema, Document } from 'mongoose';

export interface ISplitExpense extends Document {
  groupId: mongoose.Types.ObjectId;
  description: string;
  amount: number;
  paidBy: mongoose.Types.ObjectId;
  date: Date;
}

const SplitExpenseSchema = new Schema<ISplitExpense>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const SplitExpense = mongoose.models.SplitExpense || mongoose.model<ISplitExpense>('SplitExpense', SplitExpenseSchema);