import { Model, Types } from 'mongoose';

export interface TTeam {
  name: string;
  companyId: Types.ObjectId;
  passcode?: string;
  qrVersion: number;
}

export interface TeamModel extends Model<TTeam> {
  isPasscodeValid(teamId: string, passcode: string): Promise<boolean>;
}
