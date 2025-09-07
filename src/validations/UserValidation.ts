import { UserDTO, UserRegisterDTO } from "$entities/User";
import { Context, Next } from "hono";
import { response_bad_request } from "$utils/response.utils";
import { prisma } from "$utils/prisma.utils";
import { generateErrorStructure } from "./helper";
import { checkUskEmail, isValidEmail } from "$utils/strings.utils";

export async function validateUser(c: Context, next: Next) {
    const data: UserRegisterDTO = await c.req.json();

    const invalidFields = [];
    if (!data.fullName)
        invalidFields.push(
            generateErrorStructure("fullName", "fullName is required")
        );
    if (!data.email)
        invalidFields.push(
            generateErrorStructure("email", "email is required")
        );

    if (!data.password)
        invalidFields.push(
            generateErrorStructure("password", "password is required")
        );

    if (!isValidEmail(data.email)) {
        invalidFields.push(
            generateErrorStructure("email", "Pastikan email anda benar.")
        );
    }

    if (!checkUskEmail(data.email)) {
        invalidFields.push(
            generateErrorStructure(
                "email",
                "Mohon gunakan email USK untuk login."
            )
        );
    }
    if (!data.userLevelId)
        invalidFields.push(
            generateErrorStructure("userLevelId", "userLevelId is required")
        );

    const userExist = await prisma.user.findUnique({
        where: {
            email: data.email,
        },
    });

    if (userExist) {
        invalidFields.push(
            generateErrorStructure("email", "email already used")
        );
    }

    if (invalidFields.length > 0) {
        return response_bad_request(c, "Bad Request", invalidFields);
    }

    await next();
}

export async function validateUserUpdate(c: Context, next: Next) {
    const data: UserDTO = await c.req.json();

    const invalidFields = [];
    if (!data.fullName)
        invalidFields.push(
            generateErrorStructure("fullName", "fullName is required")
        );
    if (!data.email)
        invalidFields.push(
            generateErrorStructure("email", "email is required")
        );

    if (!isValidEmail(data.email)) {
        invalidFields.push(
            generateErrorStructure("email", "Pastikan email anda benar.")
        );
    }

    if (!checkUskEmail(data.email)) {
        invalidFields.push(
            generateErrorStructure(
                "email",
                "Mohon gunakan email USK untuk login."
            )
        );
    }
    if (!data.userLevelId)
        invalidFields.push(
            generateErrorStructure("userLevelId", "userLevelId is required")
        );

    const userExist = await prisma.user.findUnique({
        where: {
            email: data.email,
        },
    });

    if (!userExist) {
        invalidFields.push(
            generateErrorStructure("email", "email already used")
        );
    }

    if (invalidFields.length > 0) {
        return response_bad_request(c, "Bad Request", invalidFields);
    }

    await next();
}
