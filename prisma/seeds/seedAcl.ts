import { Prisma, PrismaClient } from "@prisma/client";
import { ulid } from "ulid";

export async function seedAcl(prisma: PrismaClient) {
    // Get all required user levels
    const [superAdminLevel, dosenLevel, mahasiswaLevel] = await Promise.all([
        prisma.userLevels.findFirst({ where: { name: "SUPER_ADMIN" } }),
        prisma.userLevels.findFirst({ where: { name: "DOSEN" } }),
        prisma.userLevels.findFirst({ where: { name: "MAHASISWA" } }),
    ]);

    if (!superAdminLevel || !dosenLevel || !mahasiswaLevel) {
        console.log("Required user levels not found, skipping ACL seeding");
        return;
    }

    const userLevelPermissions = [
        {
            userLevelId: superAdminLevel.id,
            permissions: [
                {
                    subject: "DASHBOARD",
                    action: ["VIEW"],
                },
                {
                    subject: "SHIFT",
                    action: ["VIEW", "CREATE", "UPDATE", "DELETE"],
                },
                {
                    subject: "RUANGAN",
                    action: ["VIEW", "CREATE", "UPDATE", "DELETE", "ASSIGN"],
                },
                {
                    subject: "MATA_KULIAH",
                    action: ["VIEW", "CREATE", "UPDATE", "DELETE", "BULK"],
                },
                {
                    subject: "MAHASISWA",
                    action: ["VIEW", "CREATE", "UPDATE", "DELETE", "BULK"],
                },
                {
                    subject: "DOSEN",
                    action: ["VIEW", "CREATE", "UPDATE", "DELETE", "BULK"],
                },
                {
                    subject: "JADWAL",
                    action: [
                        "VIEW",
                        "CREATE",
                        "UPDATE",
                        "DELETE",
                        "GENERATE",
                        "UPDATE_MEETING",
                        "ASSIGN_MAHASISWA",
                        "ASSIGN_ASISTEN_LAB",
                        "ABSENT",
                    ],
                },
                {
                    subject: "PENDAFTARAN_ASISTEN_LAB",
                    action: ["VIEW", "CREATE", "UPDATE"],
                },
                {
                    subject: "PENERIMAAN_ASISTEN_LAB",
                    action: ["VIEW", "ACCEPTED"],
                },
                {
                    subject: "ROLE_MANAGEMENT",
                    action: ["VIEW", "CREATE", "UPDATE", "DELETE"],
                },
                {
                    subject: "USER_MANAGEMENT",
                    action: ["VIEW", "CREATE", "UPDATE", "DELETE"],
                },
                {
                    subject: "ABSENSI",
                    action: ["VIEW", "CREATE"],
                },
            ],
        },
        {
            userLevelId: dosenLevel.id,
            permissions: [
                {
                    subject: "DASHBOARD",
                    action: ["VIEW"],
                },
                {
                    subject: "JADWAL",
                    action: ["VIEW", "UPDATE"],
                },
                {
                    subject: "ASISTEN_LAB",
                    action: ["VIEW", "ACCEPTED"],
                },
            ],
        },
        {
            userLevelId: mahasiswaLevel.id,
            permissions: [
                {
                    subject: "DASHBOARD",
                    action: ["VIEW"],
                },
                {
                    subject: "JADWAL",
                    action: ["VIEW"],
                },
                {
                    subject: "ASISTEN_LAB",
                    action: ["VIEW", "CREATE", "UPDATE"],
                },
            ],
        },
    ];

    try {
        // Get all existing features and actions in one go to minimize queries
        const [existingFeatures, existingActions, superAdmin] =
            await Promise.all([
                prisma.features.findMany({
                    select: { id: true, name: true },
                }),
                prisma.actions.findMany({
                    select: { id: true, name: true, featureId: true },
                }),
                prisma.user.findUnique({
                    where: { email: "superadmin@usk.ac.id" },
                    select: { id: true, userLevelId: true },
                }),
            ]);

        // Create maps for faster lookup
        const existingFeaturesMap = new Map(
            existingFeatures.map((f) => [f.name, f.id])
        );
        const existingActionsMap = new Set(
            existingActions.map((a) => `${a.featureId}:${a.name}`)
        );

        // Prepare bulk data for features and actions
        const featuresToCreate: Prisma.FeaturesCreateManyInput[] = [];
        const actionsToCreate: any[] = []; // Using any to bypass type checking temporarily

        // Process all permissions for all user levels
        for (const userLevelPermission of userLevelPermissions) {
            for (const rule of userLevelPermission.permissions) {
                // Add feature if it doesn't exist
                if (!existingFeaturesMap.has(rule.subject)) {
                    const featureId = ulid();
                    featuresToCreate.push({
                        id: featureId,
                        name: rule.subject,
                    });
                    existingFeaturesMap.set(rule.subject, featureId); // Add to map to avoid duplicates
                }

                // Add actions if they don't exist
                const featureId = existingFeaturesMap.get(rule.subject);
                if (featureId) {
                    for (const action of rule.action) {
                        const actionKey = `${featureId}:${action}`;
                        if (!existingActionsMap.has(actionKey)) {
                            actionsToCreate.push({
                                id: ulid(),
                                name: action,
                                featureId: featureId,
                            });
                            existingActionsMap.add(actionKey); // Add to set to avoid duplicates
                        }
                    }
                }
            }
        }

        // Bulk create features and actions
        const createPromises: Promise<any>[] = [];

        if (featuresToCreate.length > 0) {
            createPromises.push(
                prisma.features.createMany({
                    data: featuresToCreate,
                    skipDuplicates: true,
                })
            );
        }

        if (actionsToCreate.length > 0) {
            createPromises.push(
                prisma.actions.createMany({
                    data: actionsToCreate as any,
                    skipDuplicates: true,
                })
            );
        }

        // Update super admin user level if needed
        if (superAdmin && !superAdmin.userLevelId) {
            createPromises.push(
                prisma.user.update({
                    where: { id: superAdmin.id },
                    data: { userLevelId: superAdminLevel.id },
                })
            );
        }

        // Execute all creation operations in parallel
        await Promise.all(createPromises);

        // Refresh the features and actions data after creation
        const [updatedFeatures, updatedActions] = await Promise.all([
            prisma.features.findMany({
                select: { id: true, name: true },
            }),
            prisma.actions.findMany({
                select: { id: true, name: true, featureId: true },
            }),
        ]);

        // Update maps with fresh data
        const featuresMap = new Map(updatedFeatures.map((f) => [f.name, f.id]));

        // Get existing ACL mappings for all user levels to avoid duplicates
        const existingAcls = await prisma.acl.findMany({
            where: {
                userLevelId: {
                    in: [superAdminLevel.id, dosenLevel.id, mahasiswaLevel.id],
                },
            },
            select: { featureId: true, actionId: true, userLevelId: true },
        });

        const existingAclKeys = new Set(
            existingAcls.map(
                (acl) => `${acl.userLevelId}:${acl.featureId}:${acl.actionId}`
            )
        );

        // Prepare ACL data for bulk creation
        const aclCreateManyData: any[] = []; // Using any to bypass type checking temporarily

        for (const userLevelPermission of userLevelPermissions) {
            for (const rule of userLevelPermission.permissions) {
                const featureId = featuresMap.get(rule.subject);
                if (featureId) {
                    for (const action of rule.action) {
                        // Find the action ID
                        const actionId = updatedActions.find(
                            (a) =>
                                a.featureId === featureId && a.name === action
                        )?.id;

                        if (actionId) {
                            const aclKey = `${userLevelPermission.userLevelId}:${featureId}:${actionId}`;
                            if (!existingAclKeys.has(aclKey)) {
                                aclCreateManyData.push({
                                    id: ulid(),
                                    featureId: featureId,
                                    actionId: actionId,
                                    userLevelId:
                                        userLevelPermission.userLevelId,
                                });
                            }
                        }
                    }
                }
            }
        }

        // Bulk create ACL mappings
        if (aclCreateManyData.length > 0) {
            await prisma.acl.createMany({
                data: aclCreateManyData as any,
                skipDuplicates: true,
            });
        }

        console.log(`ACL Seeding completed successfully:`);
    } catch (error) {
        console.error("Error seeding ACL:", error);
        throw error;
    }
}
