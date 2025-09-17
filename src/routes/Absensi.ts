import { Hono } from "hono";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as AbsensiController from "$controllers/rest/absensi-controller";

const AbsensiRoutes = new Hono();

AbsensiRoutes.get(
    "/today",
    AuthMiddleware.checkJwt,
    AbsensiController.getTodaySchedule
);

AbsensiRoutes.post(
    "/record",
    AuthMiddleware.checkJwt,
    AbsensiController.create
);

AbsensiRoutes.get(
    "/:id/list",
    AuthMiddleware.checkJwt,
    AbsensiController.getById
);

export default AbsensiRoutes;
