import {
    BadRequestWithMessage,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Acl, Prisma } from "@prisma/client";
import { AclDTO, CheckFeatureAccessDTO } from "$entities/Acl";
import { ulid } from "ulid";
import { UserJWTDAO } from "$entities/User";

export type CreateResponse = Acl | {};
export async function create(
    data: AclDTO
): Promise<ServiceResponse<CreateResponse>> {
    try {
        // Create or find user level first
        let userLevel = await prisma.userLevels.findFirst({
            where: {
                name: data.roleName,
            },
            select: { id: true, name: true },
        });

        if (!userLevel) {
            userLevel = await prisma.userLevels.create({
                data: {
                    id: ulid(),
                    name: data.roleName,
                },
                select: { id: true, name: true },
            });
        }

        // Get all features and actions for validation
        const featuresWithActions = await prisma.features.findMany({
            include: {
                actions: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        const featureMap = new Map(featuresWithActions.map((f) => [f.name, f]));
        const aclCreateData: Prisma.AclCreateManyInput[] = [];

        // Validate and prepare ACL data
        for (const permission of data.permissions) {
            const feature = featureMap.get(permission.subject);
            if (!feature) {
                return BadRequestWithMessage(
                    `Feature '${permission.subject}' not found`
                );
            }

            const actionMap = new Map(
                feature.actions.map((a) => [a.name, a.id])
            );

            for (const actionName of permission.action) {
                const actionId = actionMap.get(actionName);
                if (!actionId) {
                    return BadRequestWithMessage(
                        `Action '${actionName}' not found for feature '${permission.subject}'`
                    );
                }

                aclCreateData.push({
                    id: ulid(),
                    featureId: feature.id,
                    actionId: actionId,
                    userLevelId: userLevel.id,
                });
            }
        }

        // Execute transaction
        const result = await prisma.$transaction(async (tx) => {
            // Delete existing ACL entries for this user level
            await tx.acl.deleteMany({
                where: {
                    userLevelId: userLevel!.id,
                },
            });

            // Create new ACL entries
            await tx.acl.createMany({
                data: aclCreateData,
            });

            // Return created ACL entries
            return tx.acl.findMany({
                where: {
                    userLevelId: userLevel!.id,
                },
            });
        });

        return {
            status: true,
            data: result,
        };
    } catch (err) {
        Logger.error(`AclService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function getAclByUserLevelId(
    userLevelId: string
): Promise<ServiceResponse<{}>> {
    try {
        const acl = await prisma.acl.findMany({
            where: {
                userLevelId,
            },
        });

        if (!acl) return INVALID_ID_SERVICE_RESPONSE;

        const formattedAcl = acl.reduce((acc: any, current: any) => {
            if (!acc[current.namaFeature]) {
                acc[current.namaFeature] = {};
            }
            acc[current.namaFeature][current.namaAction] = true;
            return acc;
        }, {});

        return {
            status: true,
            data: formattedAcl,
        };
    } catch (err) {
        Logger.error(`AclService.getAclByUserLevelId : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function update(
    data: AclDTO
): Promise<ServiceResponse<CreateResponse>> {
    try {
        const userLevel = await prisma.userLevels.findFirst({
            where: { name: data.roleName },
            select: { id: true },
        });

        if (!userLevel) {
            return BadRequestWithMessage("Role tidak ditemukan!");
        }

        // Get features and actions for validation
        const featuresWithActions = await prisma.features.findMany({
            include: {
                actions: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        const featureMap = new Map(featuresWithActions.map((f) => [f.name, f]));

        // Get existing ACL permissions
        const existingAcls = await prisma.acl.findMany({
            where: { userLevelId: userLevel.id },
            select: { featureId: true, actionId: true },
        });

        const existingPermissionKeys = new Set(
            existingAcls.map((acl) => `${acl.featureId}:${acl.actionId}`)
        );

        // Prepare new permissions data
        const newAclData: Prisma.AclCreateManyInput[] = [];
        const newPermissionKeys = new Set<string>();

        for (const permission of data.permissions) {
            const feature = featureMap.get(permission.subject);
            if (!feature) {
                return BadRequestWithMessage(
                    `Feature '${permission.subject}' not found`
                );
            }

            const actionMap = new Map(
                feature.actions.map((a) => [a.name, a.id])
            );

            for (const actionName of permission.action) {
                const actionId = actionMap.get(actionName);
                if (!actionId) {
                    return BadRequestWithMessage(
                        `Action '${actionName}' not found for feature '${permission.subject}'`
                    );
                }

                const permissionKey = `${feature.id}:${actionId}`;
                newPermissionKeys.add(permissionKey);

                // Only add if it doesn't already exist
                if (!existingPermissionKeys.has(permissionKey)) {
                    newAclData.push({
                        id: ulid(),
                        featureId: feature.id,
                        actionId: actionId,
                        userLevelId: userLevel.id,
                    });
                }
            }
        }

        // Find permissions to remove
        const permissionsToRemove = existingAcls.filter(
            (acl) => !newPermissionKeys.has(`${acl.featureId}:${acl.actionId}`)
        );

        // Execute update in transaction
        const result = await prisma.$transaction(async (tx) => {
            let removedCount = 0;
            let addedCount = 0;

            // Remove permissions that are no longer needed
            if (permissionsToRemove.length > 0) {
                const deleteResult = await tx.acl.deleteMany({
                    where: {
                        userLevelId: userLevel.id,
                        OR: permissionsToRemove.map((perm) => ({
                            featureId: perm.featureId,
                            actionId: perm.actionId,
                        })),
                    },
                });
                removedCount = deleteResult.count;
            }

            // Add new permissions
            if (newAclData.length > 0) {
                await tx.acl.createMany({
                    data: newAclData,
                    skipDuplicates: true,
                });
                addedCount = newAclData.length;
            }

            // Get total permissions count
            const totalPermissions = await tx.acl.count({
                where: { userLevelId: userLevel.id },
            });

            return {
                userLevelId: userLevel.id,
                permissionsAdded: addedCount,
                permissionsRemoved: removedCount,
                totalPermissions,
            };
        });

        return {
            status: true,
            data: result,
        };
    } catch (err) {
        Logger.error(`AclService.update : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

type getFeatureAccessResponse = CheckFeatureAccessDTO | {};

export async function getFeatureAccess(
    userLevelId: string,
    featureName: string
): Promise<ServiceResponse<getFeatureAccessResponse>> {
    try {
        // Input validation
        if (!userLevelId || !featureName) {
            return BadRequestWithMessage(
                "User level ID and feature name are required"
            );
        }

        // Check if feature exists
        const feature = await prisma.features.findUnique({
            where: { name: featureName },
            select: { id: true, name: true },
        });

        if (!feature) {
            return BadRequestWithMessage(`Feature '${featureName}' not found`);
        }

        // Get user's ACL for this specific feature
        const userAcl = await prisma.acl.findMany({
            where: {
                userLevelId,
                featureId: feature.id,
            },
            include: {
                feature: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // Get action details for this feature
        const actionIds = userAcl.map((a) => a.actionId);
        const actions = await prisma.actions.findMany({
            where: {
                id: { in: actionIds },
            },
            select: {
                name: true,
            },
        });

        const allowedActions = actions.map((a) => a.name);

        return {
            status: true,
            data: {
                featureName,
                actions: allowedActions,
            },
        };
    } catch (err) {
        Logger.error(`AclService.getFeatureAccess : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function getAllFeatures(): Promise<ServiceResponse<{}>> {
    try {
        const features = await prisma.features.findMany({
            include: {
                actions: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
        });

        return {
            status: true,
            data: features,
        };
    } catch (err) {
        Logger.error(`AclService.getAllFeatures : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function getAccess(
    user: UserJWTDAO,
    featureName: string
): Promise<ServiceResponse<{}>> {
    try {
        // Find User Level
        const userLevelExists = await prisma.userLevels.findUnique({
            where: { id: user.userLevelId },
        });

        if (!userLevelExists) return INVALID_ID_SERVICE_RESPONSE;

        // Find Feature
        const featureExists = await prisma.features.findUnique({
            where: { name: featureName },
            include: {
                actions: true,
            },
        });

        if (!featureExists) return INVALID_ID_SERVICE_RESPONSE;

        // Find ACL
        const aclExists = await prisma.acl.findFirst({
            where: {
                userLevelId: user.userLevelId,
                featureId: featureExists.id,
            },
            include: {
                feature: {
                    include: {
                        actions: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!aclExists) return INVALID_ID_SERVICE_RESPONSE;

        const actions = await prisma.actions.findMany({
            select: {
                name: true,
            },
        });

        if (!actions) return BadRequestWithMessage("Actions Tidak Ditemukan!");

        // Format the response to have actions as boolean values
        const actionNames = featureExists.actions.map((action) => action.name);
        const formattedActions = actions.reduce((acc, action) => {
            acc[action.name] = actionNames.includes(action.name);
            return acc;
        }, {} as Record<string, boolean>);

        return {
            status: true,
            data: {
                featureName: featureName,
                actions: formattedActions,
            },
        };
    } catch (err) {
        Logger.error(`AclService.getAccess : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
