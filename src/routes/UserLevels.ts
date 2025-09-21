import { Hono } from "hono";
import * as UserLevelsController from "$controllers/rest/UserLevelsController";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as UserLevelsValidation from "$validations/UserLevelsValidation";

const UserLevelsRoutes = new Hono();

UserLevelsRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("ROLE_MANAGEMENT", "VIEW"),
    UserLevelsController.getAll
);

UserLevelsRoutes.get(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("ROLE_MANAGEMENT", "VIEW"),
    UserLevelsController.getById
);

UserLevelsRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("ROLE_MANAGEMENT", "CREATE"),
    UserLevelsValidation.validateUserLevels,
    UserLevelsController.create
);

UserLevelsRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("ROLE_MANAGEMENT", "UPDATE"),
    UserLevelsValidation.validateUserLevels,
    UserLevelsController.update
);

UserLevelsRoutes.delete(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("ROLE_MANAGEMENT", "DELETE"),
    UserLevelsController.deleteByIds
);

export default UserLevelsRoutes;
