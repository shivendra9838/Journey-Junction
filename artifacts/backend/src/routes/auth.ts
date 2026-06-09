import { Router, type IRouter } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { UserModel, isDBConnected } from "@workspace/db";
import { requireAuth } from "../middleware/requireAuth";
import { OAuth2Client } from "google-auth-library";
import { localUserById, localUsers, toPublicUser, type LocalUser } from "../lib/localStore";
import { notifyWelcomeUser, notifyLoginUser } from "../lib/notifications";
import multer from "multer";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const RegisterBody = z.object({
  name:     z.string().min(1).max(100),
  email:    z.string().email(),
  password: z.string().min(6).max(100),
});

const LoginBody = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

function isAdminEmail(email: string): boolean {
  return !!process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
}

function isEnvAdminLogin(email: string, password: string): boolean {
  return isAdminEmail(email) && !!process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD;
}

async function ensureLocalAdmin(email: string, password: string): Promise<LocalUser> {
  const normalizedEmail = email.toLowerCase();
  const existing = localUsers.get(normalizedEmail);
  if (existing) return existing;

  const user: LocalUser = {
    id: randomUUID(),
    name: "Wandr Admin",
    email: normalizedEmail,
    avatar: null,
    passwordHash: await bcrypt.hash(password, 12),
    createdAt: new Date().toISOString(),
  };
  localUsers.set(normalizedEmail, user);
  return user;
}

async function ensureDbAdmin(email: string, password: string) {
  const normalizedEmail = email.toLowerCase();
  const existing = await UserModel.findOne({ email: normalizedEmail });
  if (existing) return existing;

  return UserModel.create({
    name: "Wandr Admin",
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, 12),
  });
}

router.post("/auth/register", async (req, res) => {
  const parse = RegisterBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
    return;
  }
  const { name, email, password } = parse.data;

  if (!isDBConnected()) {
    const normalizedEmail = email.toLowerCase();
    if (localUsers.has(normalizedEmail)) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const user: LocalUser = {
      id: randomUUID(),
      name,
      email: normalizedEmail,
      avatar: null,
      passwordHash: await bcrypt.hash(password, 12),
      createdAt: new Date().toISOString(),
    };
    localUsers.set(normalizedEmail, user);
    void notifyWelcomeUser(user.id, user.email, user.name).catch(err => req.log.warn({ err }, "Welcome notification failed"));

    req.session.userId = user.id;
    req.session.isAdmin = isAdminEmail(email);
    req.session.save((err) => {
      if (err) {
        req.log.error({ err }, "Session save error");
        res.status(500).json({ error: "Failed to create session" });
        return;
      }
      res.status(201).json({ user: toPublicUser(user, req.session.isAdmin) });
    });
    return;
  }

  const existing = await UserModel.findOne({ email: email.toLowerCase() }).lean();
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await UserModel.create({ name, email: email.toLowerCase(), passwordHash });
  void notifyWelcomeUser(user._id.toString(), user.email, user.name).catch(err => req.log.warn({ err }, "Welcome notification failed"));

  req.session.userId  = user._id.toString();
  req.session.isAdmin = isAdminEmail(email);
  req.session.save((err) => {
    if (err) {
      req.log.error({ err }, "Session save error");
      res.status(500).json({ error: "Failed to create session" });
      return;
    }
    res.status(201).json({ user: { ...user.toJSON(), isAdmin: req.session.isAdmin } });
  });
});

router.post("/auth/login", async (req, res) => {
  const parse = LoginBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
    return;
  }
  const { email, password } = parse.data;

  if (!isDBConnected()) {
    if (isEnvAdminLogin(email, password)) {
      const user = await ensureLocalAdmin(email, password);
      req.session.userId = user.id;
      req.session.isAdmin = true;
      req.session.save((err) => {
        if (err) {
          req.log.error({ err }, "Session save error");
          res.status(500).json({ error: "Failed to create session" });
          return;
        }
        void notifyLoginUser(user.id, user.email, user.name, req.get("user-agent") ?? "").catch(err => req.log.warn({ err }, "Login notification failed"));
        res.json({ user: toPublicUser(user, true) });
      });
      return;
    }

    const user = localUsers.get(email.toLowerCase());
    if (!user) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    req.session.userId = user.id;
    req.session.isAdmin = isAdminEmail(user.email);
    req.session.save((err) => {
      if (err) {
        req.log.error({ err }, "Session save error");
        res.status(500).json({ error: "Failed to create session" });
        return;
      }
      void notifyLoginUser(user.id, user.email, user.name, req.get("user-agent") ?? "").catch(err => req.log.warn({ err }, "Login notification failed"));
      res.json({ user: toPublicUser(user, req.session.isAdmin) });
    });
    return;
  }

  if (isEnvAdminLogin(email, password)) {
    const user = await ensureDbAdmin(email, password);
    req.session.userId = user._id.toString();
    req.session.isAdmin = true;
    req.session.save((err) => {
      if (err) {
        req.log.error({ err }, "Session save error");
        res.status(500).json({ error: "Failed to create session" });
        return;
      }
      void notifyLoginUser(user._id.toString(), user.email, user.name, req.get("user-agent") ?? "").catch(err => req.log.warn({ err }, "Login notification failed"));
      res.json({ user: { ...user.toJSON(), isAdmin: true } });
    });
    return;
  }

  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  req.session.userId  = user._id.toString();
  req.session.isAdmin = isAdminEmail(user.email);
  req.session.save((err) => {
    if (err) {
      req.log.error({ err }, "Session save error");
      res.status(500).json({ error: "Failed to create session" });
      return;
    }
    void notifyLoginUser(user._id.toString(), user.email, user.name, req.get("user-agent") ?? "").catch(err => req.log.warn({ err }, "Login notification failed"));
    res.json({ user: { ...user.toJSON(), isAdmin: req.session.isAdmin } });
  });
});

const GoogleLoginBody = z.object({
  credential: z.string().min(1),
});

router.post("/auth/google", async (req, res) => {
  const parse = GoogleLoginBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
    return;
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: parse.data.credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: "Invalid Google token payload" });
      return;
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || email.split("@")[0];
    const avatar = payload.picture || null;

    if (!isDBConnected()) {
      let user = localUsers.get(email);
      if (!user) {
        // Register local user implicitly
        user = {
          id: randomUUID(),
          name,
          email,
          avatar,
          passwordHash: await bcrypt.hash(randomUUID(), 12),
          createdAt: new Date().toISOString(),
        };
        localUsers.set(email, user);
        void notifyWelcomeUser(user.id, user.email, user.name).catch(() => {});
      }

      req.session.userId = user.id;
      req.session.isAdmin = isAdminEmail(user.email);
      req.session.save((err) => {
        if (err) {
          req.log.error({ err }, "Session save error");
          res.status(500).json({ error: "Failed to create session" });
          return;
        }
        void notifyLoginUser(user!.id, user!.email, user!.name, req.get("user-agent") ?? "").catch(() => {});
        res.json({ user: toPublicUser(user!, req.session.isAdmin) });
      });
      return;
    }

    let user = await UserModel.findOne({ email });
    if (!user) {
      // Register DB user implicitly
      const passwordHash = await bcrypt.hash(randomUUID(), 12);
      user = await UserModel.create({ name, email, avatar, passwordHash });
      void notifyWelcomeUser(user._id.toString(), user.email, user.name).catch(() => {});
    }

    req.session.userId = user._id.toString();
    req.session.isAdmin = isAdminEmail(user.email);
    req.session.save((err) => {
      if (err) {
        req.log.error({ err }, "Session save error");
        res.status(500).json({ error: "Failed to create session" });
        return;
      }
      void notifyLoginUser(user!._id.toString(), user!.email, user!.name, req.get("user-agent") ?? "").catch(() => {});
      res.json({ user: { ...user!.toJSON(), isAdmin: req.session.isAdmin } });
    });

  } catch (err) {
    req.log.error({ err }, "Google verify error");
    res.status(401).json({ error: "Invalid Google credential" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "Session destroy error");
      res.status(500).json({ error: "Failed to logout" });
      return;
    }
    res.clearCookie("wandr.sid");
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res) => {
  if (!req.session?.userId) {
    res.json({ user: null });
    return;
  }

  if (!isDBConnected()) {
    const user = localUserById(req.session.userId);
    if (user) {
      req.session.isAdmin = isAdminEmail(user.email);
      req.session.save();
    }
    res.json({ user: user ? toPublicUser(user, req.session.isAdmin ?? false) : null });
    return;
  }

  const user = await UserModel.findById(req.session.userId);
  if (user) {
    req.session.isAdmin = isAdminEmail(user.email);
    req.session.save();
  }
  res.json({ user: user ? { ...user.toJSON(), isAdmin: req.session.isAdmin ?? false } : null });
});

const UpdateProfileBody = z.object({
  name:   z.string().min(1).max(100).optional(),
  avatar: z.string().max(500).nullable().optional(),
});

router.patch("/users/me", requireAuth, async (req, res) => {
  const parse = UpdateProfileBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parse.data.name   !== undefined) updates["name"]   = parse.data.name;
  if (parse.data.avatar !== undefined) updates["avatar"] = parse.data.avatar;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update." });
    return;
  }

  if (!isDBConnected()) {
    const user = localUserById(req.session.userId);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    if (parse.data.name !== undefined) user.name = parse.data.name;
    if (parse.data.avatar !== undefined) user.avatar = parse.data.avatar;
    res.json({ user: toPublicUser(user, req.session.isAdmin ?? false) });
    return;
  }

  const user = await UserModel.findByIdAndUpdate(
    req.session.userId,
    { $set: updates },
    { returnDocument: "after" },
  );

  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  res.json({ user });
});

router.post("/users/me/avatar-upload", requireAuth, upload.single("avatar"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  
  const avatarUrl = "/uploads/" + req.file.filename;
  
  if (!isDBConnected()) {
    const user = localUserById(req.session.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    user.avatar = avatarUrl;
    res.json({ user: toPublicUser(user, req.session.isAdmin ?? false), avatarUrl });
    return;
  }

  const user = await UserModel.findByIdAndUpdate(
    req.session.userId,
    { $set: { avatar: avatarUrl } },
    { returnDocument: "after" }
  );

  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  res.json({ user, avatarUrl });
});

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(6).max(100),
});

router.patch("/users/me/password", requireAuth, async (req, res) => {
  const parse = ChangePasswordBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
    return;
  }

  if (!isDBConnected()) {
    const user = localUserById(req.session.userId);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const valid = await bcrypt.compare(parse.data.currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "Current password is incorrect." });
      return;
    }

    user.passwordHash = await bcrypt.hash(parse.data.newPassword, 12);
    res.json({ ok: true });
    return;
  }

  const user = await UserModel.findById(req.session.userId);
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  const valid = await bcrypt.compare(parse.data.currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password is incorrect." });
    return;
  }

  const newHash = await bcrypt.hash(parse.data.newPassword, 12);
  await UserModel.findByIdAndUpdate(
    req.session.userId,
    { $set: { passwordHash: newHash } },
  );

  res.json({ ok: true });
});

export default router;
