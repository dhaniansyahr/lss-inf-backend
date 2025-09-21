import { Hono } from "hono";
import * as UserController from "$controllers/rest/UserController";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as UserValidation from "$validations/UserValidation";

const UserRoutes = new Hono();

UserRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("USER_MANAGEMENT", "VIEW"),
    UserController.getAll
);

UserRoutes.get(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("USER_MANAGEMENT", "VIEW"),
    UserController.getById
);

UserRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("USER_MANAGEMENT", "CREATE"),
    UserValidation.validateUser,
    UserController.create
);

UserRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("USER_MANAGEMENT", "UPDATE"),
    UserValidation.validateUserUpdate,
    UserController.update
);

UserRoutes.delete(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("USER_MANAGEMENT", "DELETE"),
    UserController.deleteByIds
);

export default UserRoutes;
