import { Hono } from "hono";
import * as PendaftaranAsistenLabController from "$controllers/rest/asisten-lab-controller";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as PendaftaranAsistenLabValidation from "$validations/asisten-lab-validation";

const PendaftaranAsistenLabRoutes = new Hono();

PendaftaranAsistenLabRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    PendaftaranAsistenLabController.getAll
);

PendaftaranAsistenLabRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    PendaftaranAsistenLabValidation.validatePendaftaranAsistenLab,
    PendaftaranAsistenLabController.create
);

PendaftaranAsistenLabRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    PendaftaranAsistenLabValidation.validatePendaftaranAsistenLab,
    PendaftaranAsistenLabController.update
);

PendaftaranAsistenLabRoutes.put(
    "/:id/acceptance",
    AuthMiddleware.checkJwt,
    PendaftaranAsistenLabValidation.validatePenerimaanAsistenLab,
    PendaftaranAsistenLabController.penerimaanAsistenLab
);

PendaftaranAsistenLabRoutes.put(
    "/:id/assignment",
    AuthMiddleware.checkJwt,
    PendaftaranAsistenLabValidation.validateAssignAsistenLab,
    PendaftaranAsistenLabController.assignAsistenLab
);

export default PendaftaranAsistenLabRoutes;
