import { ActivityModel, HotelModel, PhaseDestinationModel } from "@workspace/db/src/schema/phase1";
import { Router } from "express";
import { asyncHandler } from "../../shared/errors";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    if (!q) return res.json({ destinations: [], hotels: [], activities: [] });
    const search = { $text: { $search: q } };
    const [destinations, hotels, activities] = await Promise.all([
      PhaseDestinationModel.find(search).limit(8),
      HotelModel.find(search).limit(8),
      ActivityModel.find(search).limit(8),
    ]);
    return res.json({ destinations, hotels, activities });
  }),
);

export default router;
