import { AclDTO } from "$entities/Acl";
import { Context, Next } from "hono";
import { generateErrorStructure } from "./helper";
import { ErrorStructure } from "./helper";
import { response_bad_request } from "$utils/response.utils";
import { prisma } from "$utils/prisma.utils";

// Cache for features and actions to reduce database queries
let featuresCache: Map<
    string,
    { id: string; actions: Map<string, string> }
> | null = null;
let cacheExpiry: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

async function getFeaturesAndActions() {
    const now = Date.now();

    // Return cached data if still valid
    if (featuresCache && now < cacheExpiry) {
        return featuresCache;
    }

    // Fetch fresh data
    const features = await prisma.features.findMany({
        include: {
            actions: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    // Build cache
    featuresCache = new Map();
    for (const feature of features) {
        const actionMap = new Map();
        for (const action of feature.actions) {
            actionMap.set(action.name, action.id);
        }
        featuresCache.set(feature.name, {
            id: feature.id,
            actions: actionMap,
        });
    }

    cacheExpiry = now + CACHE_DURATION;
    return featuresCache;
}

export async function validateAclCreate(c: Context, next: Next) {
    try {
        const data: AclDTO = await c.req.json();
        const invalidFields: ErrorStructure[] = [];

        // Basic validation
        if (
            !data.roleName ||
            typeof data.roleName !== "string" ||
            data.roleName.trim().length === 0
        ) {
            invalidFields.push(
                generateErrorStructure(
                    "roleName",
                    "roleName cannot be empty and must be a valid string"
                )
            );
        }

        if (
            !data.permissions ||
            !Array.isArray(data.permissions) ||
            data.permissions.length === 0
        ) {
            invalidFields.push(
                generateErrorStructure(
                    "permissions",
                    "permissions cannot be empty and must be an array"
                )
            );
        }

        // If basic validation fails, return early
        if (invalidFields.length !== 0) {
            return response_bad_request(c, "Validation Error", invalidFields);
        }

        // Validate permissions structure
        for (let index = 0; index < data.permissions.length; index++) {
            const permission = data.permissions[index];

            if (
                !permission.subject ||
                typeof permission.subject !== "string" ||
                permission.subject.trim().length === 0
            ) {
                invalidFields.push(
                    generateErrorStructure(
                        `permissions[${index}].subject`,
                        "subject cannot be empty and must be a valid string"
                    )
                );
            }

            if (
                !permission.action ||
                !Array.isArray(permission.action) ||
                permission.action.length === 0
            ) {
                invalidFields.push(
                    generateErrorStructure(
                        `permissions[${index}].action`,
                        "action cannot be empty and must be an array"
                    )
                );
            } else {
                // Validate each action is a string
                for (
                    let actionIndex = 0;
                    actionIndex < permission.action.length;
                    actionIndex++
                ) {
                    const action = permission.action[actionIndex];
                    if (
                        !action ||
                        typeof action !== "string" ||
                        action.trim().length === 0
                    ) {
                        invalidFields.push(
                            generateErrorStructure(
                                `permissions[${index}].action[${actionIndex}]`,
                                "action must be a valid non-empty string"
                            )
                        );
                    }
                }

                // Check for duplicate actions within the same permission
                const uniqueActions = new Set(permission.action);
                if (uniqueActions.size !== permission.action.length) {
                    invalidFields.push(
                        generateErrorStructure(
                            `permissions[${index}].action`,
                            "duplicate actions found in the same permission"
                        )
                    );
                }
            }
        }

        // Check for duplicate subjects
        const subjects = data.permissions.map((p) => p.subject).filter(Boolean);
        const uniqueSubjects = new Set(subjects);
        if (uniqueSubjects.size !== subjects.length) {
            invalidFields.push(
                generateErrorStructure(
                    "permissions",
                    "duplicate subjects found in permissions array"
                )
            );
        }

        // If structural validation fails, return early
        if (invalidFields.length !== 0) {
            return response_bad_request(c, "Validation Error", invalidFields);
        }

        // Check if role name already exists (for create operation)
        const userLevelExist = await prisma.userLevels.findFirst({
            where: {
                name: data.roleName.trim(),
            },
            select: { id: true, name: true },
        });

        if (userLevelExist) {
            invalidFields.push(
                generateErrorStructure(
                    "roleName",
                    "Nama Role sudah digunakan, jika ingin menggunakan nama role yang sama berikan pembeda pada nama role anda!"
                )
            );
        }

        // Get features and actions cache
        const featuresMap = await getFeaturesAndActions();

        // Validate that features and actions exist
        for (let index = 0; index < data.permissions.length; index++) {
            const permission = data.permissions[index];
            const feature = featuresMap.get(permission.subject);

            if (!feature) {
                invalidFields.push(
                    generateErrorStructure(
                        `permissions[${index}].subject`,
                        `feature '${permission.subject}' not found`
                    )
                );
                continue; // Skip action validation if feature doesn't exist
            }

            // Validate actions for this feature
            for (
                let actionIndex = 0;
                actionIndex < permission.action.length;
                actionIndex++
            ) {
                const actionName = permission.action[actionIndex];
                if (!feature.actions.has(actionName)) {
                    invalidFields.push(
                        generateErrorStructure(
                            `permissions[${index}].action[${actionIndex}]`,
                            `action '${actionName}' not found for feature '${permission.subject}'`
                        )
                    );
                }
            }
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

export async function validateUpdateAcl(c: Context, next: Next) {
    try {
        const data: AclDTO = await c.req.json();
        const invalidFields: ErrorStructure[] = [];

        // Basic validation
        if (
            !data.roleName ||
            typeof data.roleName !== "string" ||
            data.roleName.trim().length === 0
        ) {
            invalidFields.push(
                generateErrorStructure(
                    "roleName",
                    "roleName cannot be empty and must be a valid string"
                )
            );
        }

        if (
            !data.permissions ||
            !Array.isArray(data.permissions) ||
            data.permissions.length === 0
        ) {
            invalidFields.push(
                generateErrorStructure(
                    "permissions",
                    "permissions cannot be empty and must be an array"
                )
            );
        }

        // If basic validation fails, return early
        if (invalidFields.length !== 0) {
            return response_bad_request(c, "Validation Error", invalidFields);
        }

        // Validate permissions structure
        for (let index = 0; index < data.permissions.length; index++) {
            const permission = data.permissions[index];

            if (
                !permission.subject ||
                typeof permission.subject !== "string" ||
                permission.subject.trim().length === 0
            ) {
                invalidFields.push(
                    generateErrorStructure(
                        `permissions[${index}].subject`,
                        "subject cannot be empty and must be a valid string"
                    )
                );
            }

            if (
                !permission.action ||
                !Array.isArray(permission.action) ||
                permission.action.length === 0
            ) {
                invalidFields.push(
                    generateErrorStructure(
                        `permissions[${index}].action`,
                        "action cannot be empty and must be an array"
                    )
                );
            } else {
                // Validate each action is a string
                for (
                    let actionIndex = 0;
                    actionIndex < permission.action.length;
                    actionIndex++
                ) {
                    const action = permission.action[actionIndex];
                    if (
                        !action ||
                        typeof action !== "string" ||
                        action.trim().length === 0
                    ) {
                        invalidFields.push(
                            generateErrorStructure(
                                `permissions[${index}].action[${actionIndex}]`,
                                "action must be a valid non-empty string"
                            )
                        );
                    }
                }

                // Check for duplicate actions within the same permission
                const uniqueActions = new Set(permission.action);
                if (uniqueActions.size !== permission.action.length) {
                    invalidFields.push(
                        generateErrorStructure(
                            `permissions[${index}].action`,
                            "duplicate actions found in the same permission"
                        )
                    );
                }
            }
        }

        // Check for duplicate subjects
        const subjects = data.permissions.map((p) => p.subject).filter(Boolean);
        const uniqueSubjects = new Set(subjects);
        if (uniqueSubjects.size !== subjects.length) {
            invalidFields.push(
                generateErrorStructure(
                    "permissions",
                    "duplicate subjects found in permissions array"
                )
            );
        }

        // If structural validation fails, return early
        if (invalidFields.length !== 0) {
            return response_bad_request(c, "Validation Error", invalidFields);
        }

        // Check if role name exists (for update operation)
        const userLevelExist = await prisma.userLevels.findFirst({
            where: {
                name: data.roleName.trim(),
            },
            select: { id: true, name: true },
        });

        if (!userLevelExist) {
            invalidFields.push(
                generateErrorStructure("roleName", "Nama Role tidak ditemukan!")
            );
        }

        // Get features and actions cache
        const featuresMap = await getFeaturesAndActions();

        // Validate that features and actions exist
        for (let index = 0; index < data.permissions.length; index++) {
            const permission = data.permissions[index];
            const feature = featuresMap.get(permission.subject);

            if (!feature) {
                invalidFields.push(
                    generateErrorStructure(
                        `permissions[${index}].subject`,
                        `feature '${permission.subject}' not found`
                    )
                );
                continue; // Skip action validation if feature doesn't exist
            }

            // Validate actions for this feature
            for (
                let actionIndex = 0;
                actionIndex < permission.action.length;
                actionIndex++
            ) {
                const actionName = permission.action[actionIndex];
                if (!feature.actions.has(actionName)) {
                    invalidFields.push(
                        generateErrorStructure(
                            `permissions[${index}].action[${actionIndex}]`,
                            `action '${actionName}' not found for feature '${permission.subject}'`
                        )
                    );
                }
            }
        }

        if (invalidFields.length !== 0) {
            return response_bad_request(c, "Validation Error", invalidFields);
        }

        await next();
    } catch (error) {
        console.error("ACL Update Validation Error:", error);
        return response_bad_request(c, "Invalid JSON or server error", [
            generateErrorStructure(
                "request",
                "Invalid request format or server error"
            ),
        ]);
    }
}
