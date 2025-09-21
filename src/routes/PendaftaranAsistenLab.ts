import { Hono } from "hono";
import * as PendaftaranAsistenLabController from "$controllers/rest/asisten-lab-controller";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as PendaftaranAsistenLabValidation from "$validations/asisten-lab-validation";

const PendaftaranAsistenLabRoutes = new Hono();

PendaftaranAsistenLabRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "VIEW"),
    PendaftaranAsistenLabController.getAll
);

PendaftaranAsistenLabRoutes.get(
    "/asisten",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "VIEW"),
    PendaftaranAsistenLabController.getAllAsisten
);

PendaftaranAsistenLabRoutes.post(
    "/request",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "CREATE"),
    PendaftaranAsistenLabValidation.validatePendaftaranAsistenLab,
    PendaftaranAsistenLabController.create
);

PendaftaranAsistenLabRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "UPDATE"),
    PendaftaranAsistenLabValidation.validatePendaftaranAsistenLab,
    PendaftaranAsistenLabController.update
);

PendaftaranAsistenLabRoutes.put(
    "/:id/acceptance",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENERIMAAN_ASISTEN_LAB", "ACCEPTED"),
    PendaftaranAsistenLabValidation.validatePenerimaanAsistenLab,
    PendaftaranAsistenLabController.penerimaanAsistenLab
);

PendaftaranAsistenLabRoutes.put(
    "/:id/assignment",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "ASSIGN_ASISTEN_LAB"),
    PendaftaranAsistenLabValidation.validateAssignAsistenLab,
    PendaftaranAsistenLabController.assignAsistenLab
);

export default PendaftaranAsistenLabRoutes;
