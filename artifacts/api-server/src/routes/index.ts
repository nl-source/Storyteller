import { Router, type IRouter } from "express";
import healthRouter from "./health";
import natureRouter from "./nature";

const router: IRouter = Router();

router.use(healthRouter);
router.use(natureRouter);

export default router;
