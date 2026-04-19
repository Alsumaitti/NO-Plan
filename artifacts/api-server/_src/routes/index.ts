import { Router, type IRouter } from "express";
import healthRouter from "./health";
import logEntriesRouter from "./logEntries";
import dailyItemsRouter from "./dailyItems";
import masterRulesRouter from "./masterRules";
import prioritiesRouter from "./priorities";
import ifThenRouter from "./ifThenPlans";
import dashboardRouter from "./dashboard";
import exportRouter from "./export";
import userSettingsRouter from "./userSettings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(logEntriesRouter);
router.use(dailyItemsRouter);
router.use(masterRulesRouter);
router.use(prioritiesRouter);
router.use(ifThenRouter);
router.use(dashboardRouter);
router.use(exportRouter);
router.use(userSettingsRouter);

export default router;
