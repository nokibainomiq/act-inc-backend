import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';
import { TTeam, TeamModel } from './team.interface';

const teamSchema = new Schema<TTeam, TeamModel>(
  {
    name: { type: String, required: true, trim: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    passcode: { type: String },
    qrVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Hash passcode before saving
teamSchema.pre('save', async function () {
  if (this.isModified('passcode') && this.passcode) {
    this.passcode = await bcrypt.hash(this.passcode, 10);
  }
});

teamSchema.statics.isPasscodeValid = async function (teamId: string, passcode: string) {
  const team = await this.findById(teamId).select('+passcode');
  if (!team || !team.passcode) return false;
  return bcrypt.compare(passcode, team.passcode);
};

export const Team = model<TTeam, TeamModel>('Team', teamSchema);
