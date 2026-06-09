import {
  EmailVerificationTokenModel,
  PasswordResetTokenModel,
  RefreshTokenModel,
  UserAccountModel,
} from "@workspace/db/src/schema/phase1";

export const authRepository = {
  findUserByEmail(email: string): Promise<any> {
    return UserAccountModel.findOne({ email }).select("+password");
  },
  findUserById(id: string): Promise<any> {
    return UserAccountModel.findById(id);
  },
  createUser(input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role?: "user" | "admin";
  }): Promise<any> {
    return UserAccountModel.create(input);
  },
  createRefreshToken(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    return RefreshTokenModel.create(input);
  },
  findRefreshToken(tokenHash: string) {
    return RefreshTokenModel.findOne({ tokenHash });
  },
  revokeRefreshToken(tokenHash: string) {
    return RefreshTokenModel.updateOne({ tokenHash }, { revokedAt: new Date() });
  },
  createPasswordResetToken(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    return PasswordResetTokenModel.create(input);
  },
  findPasswordResetToken(tokenHash: string) {
    return PasswordResetTokenModel.findOne({ tokenHash });
  },
  createEmailVerificationToken(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    return EmailVerificationTokenModel.create(input);
  },
  findEmailVerificationToken(tokenHash: string) {
    return EmailVerificationTokenModel.findOne({ tokenHash });
  },
};
