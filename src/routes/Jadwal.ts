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

JadwalRoutes.get(
    "/check",
    AuthMiddleware.checkJwt,
    JadwalController.checkTheoryScheduleExists
);

JadwalRoutes.post(
    "/bulk-upload",
    AuthMiddleware.checkJwt,
    JadwalController.bulkUploadTheorySchedule
);

JadwalRoutes.post(
    "/generate",
    AuthMiddleware.checkJwt,
    JadwalController.generateSchedule
);

JadwalRoutes.get("/:id", AuthMiddleware.checkJwt, JadwalController.getById);

JadwalRoutes.get(
    "/:id/list-meeting",
    AuthMiddleware.checkJwt,
    JadwalController.getListMeetings
);

JadwalRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    JadwalValidation.validateJadwal,
    JadwalController.update
);

JadwalRoutes.delete("/", AuthMiddleware.checkJwt, JadwalController.deleteAll);

JadwalRoutes.put(
    "/:id/meeting",
    AuthMiddleware.checkJwt,
    JadwalValidation.validateUpdateMeeting,
    JadwalController.updateMeeting
);

JadwalRoutes.put(
    "/assign-mahasiswa/:id/manual",
    AuthMiddleware.checkJwt,
    JadwalController.manualAssignMahasiswa
);

JadwalRoutes.put(
    "/assign-mahasiswa/:id/bulk-upload",
    AuthMiddleware.checkJwt,
    JadwalController.bulkUploadMahasiswa
);

export default JadwalRoutes;
