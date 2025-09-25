import { Hono } from "hono";
import * as JadwalController from "$controllers/rest/jadwal-controller";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as JadwalValidation from "$validations/jadwal-validation";

const JadwalRoutes = new Hono();

JadwalRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "VIEW"),
    JadwalController.getAll
);

JadwalRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "CREATE"),
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
    AuthMiddleware.checkAccess("JADWAL", "CREATE"),
    JadwalController.bulkUploadTheorySchedule
);

JadwalRoutes.post(
    "/generate",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "GENERATE"),
    JadwalController.generateSchedule
);

JadwalRoutes.get(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "VIEW"),
    JadwalController.getById
);

JadwalRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "UPDATE"),
    JadwalValidation.validateJadwal,
    JadwalController.update
);

JadwalRoutes.delete(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "DELETE"),
    JadwalController.deleteAll
);

JadwalRoutes.put(
    "/:id/meeting",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "UPDATE_MEETING"),
    JadwalValidation.validateUpdateMeeting,
    JadwalController.updateMeeting
);

JadwalRoutes.put(
    "/assign-mahasiswa/:id/manual",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "ASSIGN_MAHASISWA"),
    JadwalController.manualAssignMahasiswa
);

JadwalRoutes.put(
    "/assign-mahasiswa/:id/bulk-upload",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "ASSIGN_MAHASISWA"),
    JadwalController.bulkUploadMahasiswa
);

JadwalRoutes.get(
    "/:id/list-meeting",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "ASSIGN_MAHASISWA"),
    JadwalController.bulkUploadMahasiswa
);

export default JadwalRoutes;
