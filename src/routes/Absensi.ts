import { Hono } from "hono";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as AbsensiController from "$controllers/rest/absensi-controller";

const AbsensiRoutes = new Hono();

AbsensiRoutes.get(
    "/today",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("ABSENSI", "VIEW"),
    AbsensiController.getTodaySchedule
);

AbsensiRoutes.post(
    "/record",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("ABSENSI", "CREATE"),
    AbsensiController.create
);

AbsensiRoutes.get(
    "/:id/list",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("ABSENSI", "VIEW"),
    AbsensiController.getById
);

export default AbsensiRoutes;
