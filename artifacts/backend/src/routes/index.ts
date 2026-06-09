import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import destinationsRouter from "./destinations";
import wishlistRouter from "./wishlist";
import reviewsRouter from "./reviews";
import adminRouter from "./admin";
import storageRouter from "./storage";
import transportBookingsRouter from "./transportBookings";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(reviewsRouter);
router.use(destinationsRouter);
router.use(wishlistRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(transportBookingsRouter);
router.use(notificationsRouter);

export default router;
