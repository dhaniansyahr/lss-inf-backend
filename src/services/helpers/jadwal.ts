import { prisma } from "$utils/prisma.utils";
import Logger from "$pkg/logger";
import { ulid } from "ulid";
import { BIDANG_MINAT, Dosen, Matakuliah, TYPE_MATKUL } from "@prisma/client";
import bcrypt from "bcrypt";

/**
 * Helper function to find or create Matakuliah
 */
export async function findOrCreateMatakuliah(
    kode: string,
    nama: string,
    defaultSks: number = 3
): Promise<{ matakuliah: Matakuliah; isPractical: boolean }> {
    try {
        // Try to find existing matakuliah by kode
        let matakuliah = await prisma.matakuliah.findUnique({
            where: {
                kode: kode.trim(),
            },
        });

        const nameContains = nama.toLowerCase().includes("praktikum");

        if (!matakuliah) {
            // Create new matakuliah
            matakuliah = await prisma.matakuliah.create({
                data: {
                    id: ulid(),
                    kode: kode.trim(),
                    nama: nama.trim(),
                    type: TYPE_MATKUL.WAJIB,
                    sks: defaultSks,
                    bidangMinat: BIDANG_MINAT.UMUM,
                    isTeori: nameContains ? false : true,
                    semester: 1,
                },
            });
            Logger.info(`Created new matakuliah: ${kode} - ${nama}`);
            return { matakuliah, isPractical: nameContains };
        }

        return { matakuliah, isPractical: nameContains };
    } catch (error) {
        Logger.error(`Error in findOrCreateMatakuliah: ${error}`);
        throw error;
    }
}

/**
 * Helper function to find or create Dosen
 */
export async function findOrCreateDosen(
    nama: string,
    nip: string,
    email: string
): Promise<{ dosen: Dosen; isNew: boolean }> {
    try {
        // Find User Level for DOSEN
        const lectureRole = await prisma.userLevels.findFirst({
            where: {
                name: "DOSEN",
            },
        });

        if (!lectureRole) {
            throw new Error("DOSEN user level not found");
        }

        const hashedPassword = await bcrypt.hash("dosen123", 12);

        // Check Dosen Exist or not
        const lectureExists = await prisma.dosen.findFirst({
            where: {
                OR: [
                    {
                        nama: { contains: nama },
                    },
                    {
                        nip,
                    },
                ],
            },
        });

        if (lectureExists) {
            const response = await prisma.dosen.update({
                where: { id: lectureExists.id },
                data: {
                    nip,
                },
            });

            return { dosen: response, isNew: false };
        } else {
            const response = await prisma.dosen.create({
                data: {
                    id: ulid(),
                    nama,
                    nip,
                    email: email,
                    password: hashedPassword,
                    bidangMinat: BIDANG_MINAT.UMUM,
                    userLevelId: lectureRole.id,
                },
            });

            return { dosen: response, isNew: true };
        }
    } catch (error) {
        Logger.error(`Error in findOrCreateDosen: ${error}`);
        throw error;
    }
}

/**
 * Helper function to find or create Ruangan
 */
export async function findOrCreateRuangan(
    nama: string,
    lokasi: string = "-"
): Promise<{ ruangan: any; isNew: boolean }> {
    try {
        // Try to find existing ruangan
        let ruangan = await prisma.ruanganLaboratorium.findFirst({
            where: {
                nama: {
                    contains: nama.trim(),
                },
            },
        });

        if (!ruangan) {
            // Create new ruangan

            const capacity = nama.toLowerCase().includes("lab") ? 50 : 25;
            const isLab = nama.toLowerCase().includes("lab");

            ruangan = await prisma.ruanganLaboratorium.create({
                data: {
                    id: ulid(),
                    nama: nama.trim(),
                    lokasi: lokasi,
                    kapasitas: capacity,
                    isLab: isLab,
                    isActive: true,
                },
            });

            Logger.info(`Created new ruangan: ${nama}`);
            return { ruangan, isNew: true };
        }

        return { ruangan, isNew: false };
    } catch (error) {
        Logger.error(`Error in findOrCreateRuangan: ${error}`);
        throw error;
    }
}

/**
 * Helper function to find or create Shift
 */
export async function findOrCreateShift(
    startTime: string,
    endTime: string
): Promise<{ shift: any; isNew: boolean }> {
    try {
        // Try to find existing shift
        let shift = await prisma.shift.findFirst({
            where: {
                startTime: startTime.trim(),
                endTime: endTime.trim(),
            },
        });

        if (!shift) {
            // Create new shift
            shift = await prisma.shift.create({
                data: {
                    id: ulid(),
                    startTime: startTime.trim(),
                    endTime: endTime.trim(),
                    isActive: true,
                },
            });

            Logger.info(`Created new shift: ${startTime}-${endTime}`);
            return { shift, isNew: true };
        }

        return { shift, isNew: false };
    } catch (error) {
        Logger.error(`Error in findOrCreateShift: ${error}`);
        throw error;
    }
}
