import { AclDTO } from "$entities/Acl";
import { Context, Next } from "hono";
import { generateErrorStructure } from "./helper";
import { ErrorStructure } from "./helper";
import { response_bad_request } from "$utils/response.utils";
import { prisma } from "$utils/prisma.utils";

export async function validateAclCreate(c: Context, next: Next) {
    try {
        const data: AclDTO = await c.req.json();
        const invalidFields: ErrorStructure[] = [];

        if (!data.name)
            invalidFields.push(
                generateErrorStructure("name", "name is required")
            );
        if (!data.enabledFeatures)
            invalidFields.push(
                generateErrorStructure(
                    "enabledFeatures",
                    "enabledFeatures is required"
                )
            );

        if (invalidFields.length > 0)
            return response_bad_request(c, "Bad Request", invalidFields);

        const nameAlreadyExists = await prisma.userLevels.findFirst({
            where: {
                name: data.name,
            },
        });
        if (nameAlreadyExists)
            invalidFields.push(
                generateErrorStructure(
                    "name",
                    `Principal Role Name '${data.name}' is Already Exists`
                )
            );

        if (invalidFields.length > 0)
            return response_bad_request(c, "Bad Request", invalidFields);

        const featurePairs = Object.keys(data.enabledFeatures);
        for (const featurePair of featurePairs) {
            const [featureName, actionName] = featurePair.split(".");

            const actionExists = await prisma.actions.findUnique({
                where: {
                    featureName_name: {
                        name: actionName,
                        featureName,
                    },
                },
            });
            if (!actionExists)
                invalidFields.push(
                    generateErrorStructure(
                        `enabledFeatures`,
                        `Principal Feature '${featurePair}' does not exist`
                    )
                );
        }

        if (invalidFields.length !== 0) {
            return response_bad_request(c, "Validation Error", invalidFields);
        }

        await next();
    } catch (error) {
        console.error("ACL Create Validation Error:", error);
        return response_bad_request(c, "Invalid JSON or server error", [
            generateErrorStructure(
                "request",
                "Invalid request format or server error"
            ),
        ]);
    }
}
