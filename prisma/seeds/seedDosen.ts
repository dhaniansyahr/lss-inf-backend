import { BIDANG_MINAT, PrismaClient } from "@prisma/client";
import { ulid } from "ulid";
import bcrypt from "bcrypt";
import path from "path";

interface DosenExcelDTO {
    NAMA: string;
    NIP: string;
    BIDANG_MINAT: string;
}

async function readExcelFile<T>(path: string): Promise<T[]> {
    const XLSX = await import("xlsx");
    const workbook = XLSX.readFile(path);

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json<T>(worksheet);
}

export function namaToEmail(nama: string): string {
    // remove gelar
    const gelarRegex =
        /(Prof\.|Dr\.|Ir\.|S\.Si,|S\.T\.,|M\.Tech|M\.Si|M\.Sc\.|M\.Kom|M\.S\.|IPM\.|M\.Inf\.Tech|M\.Inf\.)/gi;
    nama = nama.replace(gelarRegex, "").trim();

    const convertToEmail = nama.toLowerCase().replace(/\s+/g, ".");

    return `${convertToEmail}@usk.ac.id`;
}

function generateNipDosen(): string {
    const randomDigits = () => Math.floor(Math.random() * 10);
    let nip = "";
    for (let i = 0; i < 16; i++) {
        nip += randomDigits();
    }
    return nip;
}

export async function seedDosen(prisma: PrismaClient) {
    const countDosen = await prisma.dosen.count();

    if (countDosen === 0) {
        const hashedPassword = await bcrypt.hash("dosen123", 12);

        const userLevel = await prisma.userLevels.findFirst({
            where: {
                name: "DOSEN",
            },
        });

        if (userLevel) {
            // Read from Excel file in the seeds/data directory
            const excelPath = path.join(__dirname, "data", "dosen.xlsx");
            const excelData = await readExcelFile<DosenExcelDTO>(excelPath);

            const dosenData = await Promise.all(
                excelData.map(async (data) => {
                    return {
                        id: ulid(),
                        nama: data.NAMA,
                        email: namaToEmail(data.NAMA),
                        password: hashedPassword,
                        nip: data.NIP ?? generateNipDosen(),
                        bidangMinat: data.BIDANG_MINAT as BIDANG_MINAT,
                        userLevelId: userLevel.id,
                    };
                })
            );

            const dosen = await prisma.dosen.createMany({
                data: dosenData,
            });

            console.log(`${dosen.count} Dosen seeded`);
        }
    }

    console.log("✅ Dosen already seeded");
}
