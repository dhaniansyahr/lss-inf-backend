import { Hono } from "hono";
import * as DashboardController from "$controllers/rest/DashboardController";
import * as AuthMiddleware from "$middlewares/authMiddleware";

const DashboardRoutes = new Hono();

DashboardRoutes.get(
    "/summary-card",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("DASHBOARD", "VIEW"),
    DashboardController.getSummaryCard
);

export default DashboardRoutes;
