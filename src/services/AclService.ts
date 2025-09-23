import {
    BadRequestWithMessage,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Acl, Prisma } from "@prisma/client";
import { AclDTO } from "$entities/Acl";
import { ulid } from "ulid";
import { UserJWTDAO } from "$entities/User";

export type CreateResponse = Acl | {};

export async function create(
    data: AclDTO
): Promise<ServiceResponse<CreateResponse>> {
    try {
        const userLevelId = ulid();

        const enabledFeatureKeys = Object.keys(data.enabledFeatures);

        const mappings: Prisma.AclCreateManyInput[] = enabledFeatureKeys
            .filter((key) => data.enabledFeatures[key] === true)
            .map((enabledFeature) => {
                const [featureName, actionName] = enabledFeature.split(".");
                return {
                    id: ulid(),
                    featureName,
                    actionName,
                    userLevelId,
                };
            });

        const result = await prisma.$transaction(async (tx) => {
            const userLevel = await tx.userLevels.create({
                data: { id: userLevelId, name: data.name },
            });

            const acl = await tx.acl.createMany({
                data: mappings.map((access) => ({
                    ...access,
                    userLevelId,
                })),
            });

            return {
                userLevel,
                acl,
            };
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
        const userLevel = await prisma.userLevels.findUnique({
            where: { id: userLevelId },
        });

        if (!userLevel) return INVALID_ID_SERVICE_RESPONSE;

        const acl = await prisma.acl.findMany({
            where: {
                userLevelId,
            },
        });

        if (acl.length === 0)
            return BadRequestWithMessage("Acl tidak ditemukan!");

        const enabledFeatures = acl.reduce(
            (featureMap: Record<string, boolean>, mapping) => {
                const featureKey = `${mapping.featureName}.${mapping.actionName}`;
                featureMap[featureKey] = true;
                return featureMap;
            },
            {}
        );

        return {
            status: true,
            data: {
                name: userLevel.name,
                enabledFeatures,
            },
        };
    } catch (err) {
        Logger.error(`AclService.getAclByUserLevelId : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function update(
    id: string,
    data: AclDTO
): Promise<ServiceResponse<CreateResponse>> {
    try {
        const userLevel = await prisma.userLevels.findUnique({
            where: { id },
        });

        if (!userLevel) {
            return BadRequestWithMessage("User Level tidak ditemukan!");
        }

        const enabledFeatureKeys = Object.keys(data.enabledFeatures);
        const createMappings: any[] = [];
        const deleteMappings: any[] = [];

        for (const enabledFeature of enabledFeatureKeys) {
            const [featureName, actionName] = enabledFeature.split(".");

            // Using repository layer to verify feature-action existence
            const actionExists = await prisma.actions.findUnique({
                where: {
                    featureName_name: {
                        name: actionName,
                        featureName,
                    },
                },
            });
            // Only proceed if the action exists for this feature
            if (actionExists) {
                const existingMapping = await prisma.acl.findUnique({
                    where: {
                        featureName_actionName_userLevelId: {
                            featureName,
                            actionName,
                            userLevelId: userLevel.id,
                        },
                    },
                });

                if (
                    data.enabledFeatures[enabledFeature] === false &&
                    existingMapping
                ) {
                    deleteMappings.push({
                        featureName,
                        actionName,
                        userLevelId: userLevel.id,
                    });
                }

                if (
                    data.enabledFeatures[enabledFeature] === true &&
                    !existingMapping
                ) {
                    createMappings.push({
                        id: ulid(),
                        featureName,
                        actionName,
                        userLevelId: userLevel.id,
                    });
                }
            }
        }

        const deletedPromises = deleteMappings.map((mapping) =>
            prisma.acl.delete({
                where: {
                    featureName_actionName_userLevelId: mapping,
                },
            })
        );

        const result = await prisma.$transaction([
            prisma.acl.createMany({
                data: createMappings,
            }),
            prisma.userLevels.update({
                where: { id: userLevel.id },
                data: { name: data.name },
            }),

            ...deletedPromises,
        ]);

        return {
            status: true,
            data: result,
        };
    } catch (err) {
        Logger.error(`AclService.update : ${err}`);
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
        const enabledActions = await prisma.acl.findMany({
            where: {
                featureName,
                userLevelId: user.userLevelId,
            },
            select: {
                actionName: true,
            },
        });

        if (!enabledActions) return INVALID_ID_SERVICE_RESPONSE;

        const enabledActionName = new Set(
            enabledActions.map((action) => action.actionName)
        );
        const result: Record<string, boolean> = {};

        for (const action of featureExists.actions) {
            result[action.name] = enabledActionName.has(action.name);
        }

        return {
            status: true,
            data: {
                featureName: featureName,
                actions: result,
            },
        };
    } catch (err) {
        Logger.error(`AclService.getAccess : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function getAvailableFeatures(
    user: UserJWTDAO
): Promise<ServiceResponse<{}>> {
    try {
        const enabledFeatures = await prisma.acl.findMany({
            where: {
                userLevelId: user.userLevelId,
            },
            select: {
                featureName: true,
            },
        });

        if (!enabledFeatures)
            return BadRequestWithMessage("Features Tidak Ditemukan!");

        const enabledFeatureName = new Set(
            enabledFeatures.map((feature) => feature.featureName)
        );

        const removeDuplicate = Array.from(enabledFeatureName);

        return {
            status: true,
            data: removeDuplicate,
        };
    } catch (err) {
        Logger.error(`AclService.getAvailableFeatures : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
