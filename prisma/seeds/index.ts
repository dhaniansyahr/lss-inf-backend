import "../../src/paths";
import { prisma } from "../../src/utils/prisma.utils";
import { seedUserLevels } from "./seedUserLevels";
import { seedUsers } from "./seedUser";
import { seedShift } from "./seedShift";
import { seedRuanganLab } from "./seedRuangan";
import { seedDosen } from "./seedDosen";

async function seed() {
    await seedUserLevels(prisma);
    await seedUsers(prisma);
    await seedShift(prisma);
    await seedDosen(prisma);
    await seedRuanganLab(prisma);

    // await seedRuangan(prisma);
    // await seedAcl(prisma);
    // await seedMataKuliah(prisma);
    // await seedJadwal(prisma);
    // await seedMahasiswa(prisma);
}

seed().then(() => {
    console.log("ALL SEEDING DONE");
});
