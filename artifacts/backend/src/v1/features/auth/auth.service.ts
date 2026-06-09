import bcrypt from "bcryptjs";
import { AppError } from "../../shared/errors";
import { hashToken, randomToken, refreshTtlDays, signAccessToken, signRefreshJwt, verifyRefreshJwt } from "../../shared/jwt";
import { authRepository } from "./auth.repository";

const publicUser = (user: { toJSON(): unknown }) => user.toJSON();

async function createTokenPair(user: { id: string; email: string; role: string }) {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshJwt({ sub: user.id, email: user.email, role: user.role });
  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + refreshTtlDays() * 24 * 60 * 60 * 1000),
  });
  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: { name: string; email: string; phone?: string; password: string }) {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) throw new AppError(409, "Email is already registered");

    const password = await bcrypt.hash(input.password, 12);
    const user = await authRepository.createUser({ ...input, password });
    const tokens = await createTokenPair({ id: user.id, email: user.email, role: user.role });
    const verificationToken = randomToken();
    await authRepository.createEmailVerificationToken({
      userId: user.id,
      tokenHash: hashToken(verificationToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return { user: publicUser(user), ...tokens, verificationToken };
  },

  async login(input: { email: string; password: string }) {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user) throw new AppError(401, "Invalid email or password");
    const ok = await bcrypt.compare(input.password, user.password);
    if (!ok) throw new AppError(401, "Invalid email or password");
    const tokens = await createTokenPair({ id: user.id, email: user.email, role: user.role });
    return { user: publicUser(user), ...tokens };
  },

  async logout(refreshToken: string) {
    await authRepository.revokeRefreshToken(hashToken(refreshToken));
    return { success: true };
  },

  async refresh(refreshToken: string) {
    const payload = verifyRefreshJwt(refreshToken);
    const stored = await authRepository.findRefreshToken(hashToken(refreshToken));
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError(401, "Refresh token is invalid");
    }
    await authRepository.revokeRefreshToken(hashToken(refreshToken));
    const user = await authRepository.findUserById(payload.sub);
    if (!user) throw new AppError(401, "User no longer exists");
    const tokens = await createTokenPair({ id: user.id, email: user.email, role: user.role });
    return { user: publicUser(user), ...tokens };
  },

  async forgotPassword(email: string) {
    const user = await authRepository.findUserByEmail(email);
    if (!user) return { success: true };
    const resetToken = randomToken();
    await authRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash: hashToken(resetToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    return { success: true, resetToken };
  },

  async resetPassword(token: string, password: string) {
    const stored = await authRepository.findPasswordResetToken(hashToken(token));
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError(400, "Reset token is invalid or expired");
    }
    const user = await authRepository.findUserById(stored.userId);
    if (!user) throw new AppError(404, "User not found");
    user.password = await bcrypt.hash(password, 12);
    stored.revokedAt = new Date();
    await Promise.all([user.save(), stored.save()]);
    return { success: true };
  },

  async sendVerification(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new AppError(404, "User not found");
    const verificationToken = randomToken();
    await authRepository.createEmailVerificationToken({
      userId: user.id,
      tokenHash: hashToken(verificationToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return { success: true, verificationToken };
  },

  async verifyEmail(token: string) {
    const stored = await authRepository.findEmailVerificationToken(hashToken(token));
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError(400, "Verification token is invalid or expired");
    }
    const user = await authRepository.findUserById(stored.userId);
    if (!user) throw new AppError(404, "User not found");
    user.isVerified = true;
    stored.revokedAt = new Date();
    await Promise.all([user.save(), stored.save()]);
    return { success: true };
  },
};
