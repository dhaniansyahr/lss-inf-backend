import { Prisma, PrismaClient } from "@prisma/client";
import { ulid } from "ulid";

export async function seedAcl(prisma: PrismaClient) {
    console.log("[SEEDER_LOG] Seeding Access Control List");
    const features = [
        {
            featureName: "DASHBOARD",
            actions: ["VIEW"],
        },
        {
            featureName: "SHIFT",
            actions: ["VIEW", "CREATE", "UPDATE", "DELETE"],
        },
        {
            featureName: "RUANGAN",
            actions: ["VIEW", "CREATE", "UPDATE", "DELETE", "ASSIGN"],
        },
        {
            featureName: "MATA_KULIAH",
            actions: ["VIEW", "CREATE", "UPDATE", "DELETE", "BULK"],
        },
        {
            featureName: "MAHASISWA",
            actions: ["VIEW", "CREATE", "UPDATE", "DELETE", "BULK"],
        },
        {
            featureName: "DOSEN",
            actions: ["VIEW", "CREATE", "UPDATE", "DELETE", "BULK"],
        },
        {
            featureName: "JADWAL",
            actions: [
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
            featureName: "PENDAFTARAN_ASISTEN_LAB",
            actions: ["VIEW", "CREATE", "UPDATE"],
        },
        {
            featureName: "PENERIMAAN_ASISTEN_LAB",
            actions: ["VIEW", "ACCEPTED"],
        },
        {
            featureName: "ROLE_MANAGEMENT",
            actions: ["VIEW", "CREATE", "UPDATE", "DELETE"],
        },
        {
            featureName: "USER_MANAGEMENT",
            actions: ["VIEW", "CREATE", "UPDATE", "DELETE"],
        },
        {
            featureName: "ABSENSI",
            actions: ["VIEW", "CREATE"],
        },
    ];

    for (const feature of features) {
        const existingFeature = await prisma.features.findUnique({
            where: {
                name: feature.featureName,
            },
        });

        if (!existingFeature) {
            await prisma.features.create({
                data: {
                    id: ulid(),
                    name: feature.featureName,
                },
            });
        }

        const actionCreateManyData: Prisma.ActionsCreateManyInput[] = [];
        for (const action of feature.actions) {
            const existingSubFeature = await prisma.actions.findFirst({
                where: {
                    name: action,
                    featureName: feature.featureName,
                },
            });

            if (!existingSubFeature) {
                actionCreateManyData.push({
                    id: ulid(),
                    name: action,
                    featureName: feature.featureName,
                });
            }
        }
        await prisma.actions.createMany({
            data: actionCreateManyData,
        });
    }

    const allAction = await prisma.actions.findMany({
        include: {
            feature: true,
        },
    });

    let superAdminRole = await prisma.userLevels.findFirst({
        where: {
            name: "SUPER_ADMIN",
        },
    });
    if (!superAdminRole) {
        superAdminRole = await prisma.userLevels.create({
            data: {
                id: ulid(),
                name: "SUPER_ADMIN",
            },
        });
    }

    const superAdminExists = await prisma.user.findUnique({
        where: { email: "superadmin@usk.ac.id" },
    });

    if (!superAdminExists) {
        console.log("[SEEDER_ERROR] Super Admin user not found");
        return;
    }

    if (!superAdminExists.userLevelId) {
        await prisma.user.update({
            where: { id: superAdminExists.id },
            data: { userLevelId: superAdminRole.id },
        });
    }

    const accessControlListCreateManyData: Prisma.AclCreateManyInput[] = [];
    for (const action of allAction) {
        const mappingExists = await prisma.acl.findUnique({
            where: {
                featureName_actionName_userLevelId: {
                    featureName: action.feature.name,
                    actionName: action.name,
                    userLevelId: superAdminRole.id,
                },
            },
        });

        if (!mappingExists) {
            accessControlListCreateManyData.push({
                id: ulid(),
                actionName: action.name,
                featureName: action.feature.name,
                userLevelId: superAdminRole.id,
            });
        }
    }

    const accessControlList = await prisma.acl.createMany({
        data: accessControlListCreateManyData,
    });
    console.log(`Access Control List created: ${accessControlList.count}`);
}
