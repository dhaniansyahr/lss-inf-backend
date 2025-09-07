import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { ulid } from "ulid";

export async function seedUsers(prisma: PrismaClient) {
    const countUser = await prisma.user.count();

    const users = [
        {
            fullName: "Kepala Laboratorium",
            email: "kelapalab@usk.ac.id",
            password: "kelapalab123",
            userLevelName: "KEPALA_LABORATORIUM",
        },
        {
            fullName: "Operator Keuangan",
            email: "operatorkeuangan@usk.ac.id",
            password: "operatorkeuangan123",
            userLevelName: "OPERATOR_KEUANGAN",
        },
        {
            fullName: "Super Admin",
            email: "superadmin@usk.ac.id",
            password: "superadmin123",
            userLevelName: "SUPER_ADMIN",
        },
    ];

    if (countUser === 0) {
        for (const user of users) {
            const userLevel = await prisma.userLevels.findFirst({
                where: {
                    name: user.userLevelName,
                },
            });

            if (userLevel) {
                const hashedPassword = await bcrypt.hash(user.password, 12);

                await prisma.user.create({
                    data: {
                        id: ulid(),
                        fullName: user.fullName,
                        email: user.email,
                        password: hashedPassword,
                        userLevelId: userLevel.id,
                    },
                });
            }
        }
    }
}
