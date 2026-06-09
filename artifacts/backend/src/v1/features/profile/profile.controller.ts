import { UserAccountModel } from "@workspace/db/src/schema/phase1";
import { requireJwtAuth } from "../../shared/auth";
import type { AuthenticatedRequest } from "../../shared/auth";
import { AppError, asyncHandler } from "../../shared/errors";
import { uploadToCloudinary } from "../../shared/upload.service";
import { validate } from "../../shared/validate";
import { avatarSchema, updateProfileSchema } from "./profile.validation";
import { Router, type Response } from "express";

const getUser = async (id: string) => {
  const user = await UserAccountModel.findById(id);
  if (!user) throw new AppError(404, "User not found");
  return user;
};

const router = Router();
router.use(requireJwtAuth);

router.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: (await getUser(req.auth!.id)).toJSON() });
  }),
);

router.patch(
  "/",
  validate("body", updateProfileSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await getUser(req.auth!.id);
    Object.assign(user, req.body);
    await user.save();
    res.json({ user: user.toJSON() });
  }),
);

router.post(
  "/avatar",
  validate("body", avatarSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await getUser(req.auth!.id);
    const uploaded = await uploadToCloudinary({
      file: req.body.file,
      folder: `wandr/avatars/${user.id}`,
      publicId: "avatar",
    });
    user.avatar = uploaded.url;
    await user.save();
    res.json({ user: user.toJSON(), upload: uploaded });
  }),
);

export default router;
