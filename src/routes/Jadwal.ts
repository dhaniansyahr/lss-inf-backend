import { Hono } from "hono";
import * as JadwalController from "$controllers/rest/jadwal-controller";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as JadwalValidation from "$validations/jadwal-validation";

const JadwalRoutes = new Hono();

JadwalRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "read"),
    JadwalController.getAll
);

JadwalRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    JadwalValidation.validateJadwal,
    JadwalController.create
);

JadwalRoutes.get("/:id", AuthMiddleware.checkJwt, JadwalController.getById);

JadwalRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    JadwalValidation.validateJadwal,
    JadwalController.update
);

JadwalRoutes.delete("/", AuthMiddleware.checkJwt, JadwalController.deleteAll);

JadwalRoutes.get(
    "/check",
    AuthMiddleware.checkJwt,
    JadwalController.checkTheoryScheduleExists
);

JadwalRoutes.put(
    "/:id/meeting",
    AuthMiddleware.checkJwt,
    JadwalValidation.validateUpdateMeeting,
    JadwalController.updateMeeting
);

JadwalRoutes.post(
    "/bulk-upload",
    AuthMiddleware.checkJwt,
    JadwalController.bulkUploadTheorySchedule
);

// Generate Jadwal
JadwalRoutes.post(
    "/generate",
    AuthMiddleware.checkJwt,
    JadwalController.generateSchedule
);

export default JadwalRoutes;
