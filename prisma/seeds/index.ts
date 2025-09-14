import "../../src/paths";
import { prisma } from "../../src/utils/prisma.utils";
import { seedUserLevels } from "./seedUserLevels";
import { seedUsers } from "./seedUser";
import { seedShift } from "./seedShift";
import { seedRuanganLab } from "./seedRuangan";
import { seedDosen } from "./seedDosen";
import { seedAcl } from "./seedAcl";
import { seedMataKuliah } from "./seedMataKuliah";
import { seedMahasiswa } from "./seedMahasiswa";

async function seed() {
    await seedUserLevels(prisma);
    await seedUsers(prisma);
    await seedAcl(prisma);
    await seedShift(prisma);
    await seedDosen(prisma);
    await seedRuanganLab(prisma);
    await seedMataKuliah(prisma);
    await seedMahasiswa(prisma);

    // await seedRuangan(prisma);
    // await seedJadwal(prisma);
}

seed().then(() => {
    console.log("ALL SEEDING DONE");
});
