import { Hono } from "hono";
import * as AclController from "$controllers/rest/AclController";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as AclValidation from "$validations/AclValidation";

const AclRoutes = new Hono();

AclRoutes.get("/", AuthMiddleware.checkJwt, AclController.getAccess);

AclRoutes.get(
    "/features",
    AuthMiddleware.checkJwt,
    AclController.getAllFeatures
);

AclRoutes.get(
    "/available-features",
    AuthMiddleware.checkJwt,
    AclController.getAvailableFeatures
);

AclRoutes.get(
    "/:userLevelId",
    AuthMiddleware.checkJwt,
    AclController.getByUserLevelId
);

AclRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("ROLE_MANAGEMENT", "CREATE"),
    AclValidation.validateAclCreate,
    AclController.create
);

AclRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("ROLE_MANAGEMENT", "UPDATE"),
    AclController.update
);

export default AclRoutes;
