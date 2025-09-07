import { PrismaClient } from "@prisma/client";
import { ulid } from "ulid";

export async function seedRuangan(prisma: PrismaClient) {
    const countRuangan = await prisma.ruanganLaboratorium.count();

    if (countRuangan === 0) {
        console.log("🏫 Creating 10 ruangan for theory matakuliah...");

        const ruanganData = [
            {
                nama: "Ruang Kuliah A101",
                lokasi: "Gedung A, Lantai 1",
            },
            {
                nama: "Ruang Kuliah A102",
                lokasi: "Gedung A, Lantai 1",
            },
            {
                nama: "Ruang Kuliah A201",
                lokasi: "Gedung A, Lantai 2",
            },
            {
                nama: "Ruang Kuliah A202",
                lokasi: "Gedung A, Lantai 2",
            },
            {
                nama: "Ruang Kuliah B101",
                lokasi: "Gedung B, Lantai 1",
            },
            {
                nama: "Ruang Kuliah B102",
                lokasi: "Gedung B, Lantai 1",
            },
            {
                nama: "Ruang Kuliah B201",
                lokasi: "Gedung B, Lantai 2",
            },
            {
                nama: "Ruang Kuliah C101",
                lokasi: "Gedung C, Lantai 1",
            },
            {
                nama: "Ruang Kuliah C102",
                lokasi: "Gedung C, Lantai 1",
            },
            {
                nama: "Ruang Kuliah C201",
                lokasi: "Gedung C, Lantai 2",
            },
        ];

        // Create each classroom room without kepala lab
        for (let i = 0; i < ruanganData.length; i++) {
            const roomData = ruanganData[i];

            console.log(`📍 Creating ${roomData.nama}...`);

            await prisma.ruanganLaboratorium.create({
                data: {
                    id: ulid(),
                    nama: roomData.nama,
                    lokasi: roomData.lokasi,
                    isActive: true,
                    isLab: false,
                    kapasitas: 30, // Added default capacity for classrooms
                },
            });

            console.log(
                `✅ ${roomData.nama} created successfully (no kepala lab assigned)`
            );
        }

        console.log(
            "🎉 All 10 ruangan for theory matakuliah have been seeded successfully!"
        );
    } else {
        console.log(
            `ℹ️ Ruangan already exist (${countRuangan} found). Skipping seeder.`
        );
    }
}

/**
 * Additional function to seed laboratory rooms for praktikum subjects
 * Call this function separately if you also need lab rooms
 */
export async function seedRuanganLab(prisma: PrismaClient) {
    const existingLabCount = await prisma.ruanganLaboratorium.count({
        where: {
            isLab: true,
        },
    });

    if (existingLabCount > 0) {
        console.log(
            `ℹ️ Laboratory rooms already exist (${existingLabCount} found). Skipping lab room seeder.`
        );
        return;
    }

    console.log("🧪 Creating laboratory rooms for praktikum matakuliah...");

    const allDosen = await prisma.dosen.findMany();

    if (allDosen.length === 0) {
        console.log(
            "❌ No dosen found in database. Please seed dosen first before creating lab rooms."
        );
        return;
    }

    const labRuanganData = [
        {
            nama: "Lab. Database",
            lokasi: "Gedung D, Lantai 1",
        },
        {
            nama: "Lab. Sistem Komputer dan Jaringan",
            lokasi: "Gedung A, Lantai 3",
        },
        {
            nama: "Lab. GIS",
            lokasi: "Gedung A, Lantai 3",
        },
        {
            nama: "Lab. RPL",
            lokasi: "Gedung A, Lantai 3",
        },
        {
            nama: "Lab. Data Science",
            lokasi: "Gedung A, Lantai 3",
        },
        {
            nama: "Lab. AI",
            lokasi: "Gedung A, Lantai 3",
        },
    ];

    // Create each lab room with random kepala lab
    for (let i = 0; i < labRuanganData.length; i++) {
        const labData = labRuanganData[i];

        console.log(`🧪 Creating ${labData.nama}...`);

        // Get random dosen for kepala lab
        const randomDosen =
            allDosen[Math.floor(Math.random() * allDosen.length)];

        // Create kepala lab record first
        const kepalaLab = await prisma.kepalaLab.create({
            data: {
                id: ulid(),
                nama: randomDosen.nama,
                nip: randomDosen.nip,
            },
        });

        const ruangan = await prisma.ruanganLaboratorium.create({
            data: {
                id: ulid(),
                nama: labData.nama,
                lokasi: labData.lokasi,
                isActive: true,
                isLab: true,
                kapasitas: 25,
                kepalaLabId: kepalaLab.id,
            },
        });

        await prisma.historyKepalaLab.create({
            data: {
                id: ulid(),
                kepalaLabId: kepalaLab.id,
                ruanganLabId: ruangan.id,
                startDate: new Date(),
            },
        });

        console.log(
            `✅ ${labData.nama} created successfully with kepala lab: ${randomDosen.nama} (${randomDosen.nip})`
        );
    }

    console.log(
        "🎉 All laboratory rooms for praktikum matakuliah have been seeded successfully!"
    );
}

/**
 * Helper function to seed both classroom and laboratory rooms
 */
export async function seedAllRuangan(prisma: PrismaClient) {
    await seedRuangan(prisma);
    await seedRuanganLab(prisma);
}
