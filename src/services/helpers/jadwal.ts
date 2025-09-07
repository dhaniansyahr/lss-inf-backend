import { prisma } from "$utils/prisma.utils";
import Logger from "$pkg/logger";
import { ulid } from "ulid";
import { BIDANG_MINAT, TYPE_MATKUL } from "@prisma/client";
import bcrypt from "bcrypt";

/**
 * Validate schedule data before creation/update
 */
export async function validateScheduleData(
    schedule: any
): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check if matakuliah exists
    const matakuliah = await prisma.matakuliah.findUnique({
        where: { id: schedule.matakuliahId },
    });
    if (!matakuliah) {
        errors.push("Matakuliah not found");
    }

    // Check if ruangan exists and is active
    const ruangan = await prisma.ruanganLaboratorium.findUnique({
        where: { id: schedule.ruanganId },
    });
    if (!ruangan || !ruangan.isActive) {
        errors.push("Room not found or inactive");
    }

    // Check if shift exists and is active
    const shift = await prisma.shift.findUnique({
        where: { id: schedule.shiftId },
    });
    if (!shift || !shift.isActive) {
        errors.push("Shift not found or inactive");
    }

    // Check if dosen exist (if provided)
    if (schedule.dosenIds && schedule.dosenIds.length > 0) {
        const dosenCount = await prisma.dosen.count({
            where: {
                id: {
                    in: schedule.dosenIds,
                },
            },
        });
        if (dosenCount !== schedule.dosenIds.length) {
            errors.push("One or more dosen not found");
        }
    }

    // Validate day
    const validDays = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
    if (!validDays.includes(schedule.hari)) {
        errors.push("Invalid day");
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Helper function to find or create Matakuliah
 */
export async function findOrCreateMatakuliah(
    kode: string,
    nama: string,
    defaultSks: number = 3
): Promise<{ matakuliah: any; isNew: boolean }> {
    try {
        // Try to find existing matakuliah by kode
        let matakuliah = await prisma.matakuliah.findFirst({
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
                    isTeori: !nameContains,
                    semester: 1,
                },
            });
            Logger.info(`Created new matakuliah: ${kode} - ${nama}`);
            return { matakuliah, isNew: true };
        }

        return { matakuliah, isNew: false };
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
    nip?: string
): Promise<{ dosen: any; isNew: boolean }> {
    try {
        let dosen;

        // If NIP is provided, try to find by NIP first
        if (nip) {
            dosen = await prisma.dosen.findUnique({
                where: {
                    nip: nip,
                },
            });
        }

        // If not found by NIP, try to find by name
        if (!dosen) {
            dosen = await prisma.dosen.findFirst({
                where: {
                    nama: {
                        contains: nama.split(",")[0].trim(),
                    },
                },
            });

            // If found by name but NIP is provided, update the NIP
            if (dosen && nip && dosen.nip !== nip) {
                try {
                    dosen = await prisma.dosen.update({
                        where: { id: dosen.id },
                        data: { nip: nip },
                    });
                    Logger.info(
                        `Updated NIP for dosen ${dosen.nama} to ${nip}`
                    );
                } catch (updateError) {
                    Logger.error(
                        `Failed to update NIP for dosen: ${updateError}`
                    );
                }
            }
        }

        // If still not found, create new dosen
        if (!dosen) {
            const userLevel = await prisma.userLevels.findFirst({
                where: { name: "DOSEN" },
            });

            if (!userLevel) {
                throw new Error("DOSEN user level not found");
            }

            // Generate email from name
            const cleanName = nama
                .split(",")[0]
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "");
            const baseEmail = `${cleanName}@gmail.com`;

            // Check if email already exists and make it unique
            let email = baseEmail;
            let counter = 1;
            while (await prisma.dosen.findFirst({ where: { email } })) {
                email = `${cleanName}${counter}@gmail.com`;
                counter++;
            }

            // Generate unique NIP if not provided
            let finalNip = nip;
            if (!finalNip) {
                // Generate NIP based on current year + random number
                const currentYear = new Date().getFullYear();
                let generatedNip;
                let nipExists = true;

                while (nipExists) {
                    const randomNum = Math.floor(Math.random() * 10000)
                        .toString()
                        .padStart(4, "0");
                    generatedNip = `${currentYear}${randomNum}`;
                    nipExists =
                        (await prisma.dosen.findFirst({
                            where: { nip: generatedNip },
                        })) !== null;
                }
                finalNip = generatedNip;
            }

            dosen = await prisma.dosen.create({
                data: {
                    id: ulid(),
                    nama: nama.trim(),
                    nip: finalNip || "",
                    email: email,
                    password: await bcrypt.hash(cleanName, 10),
                    bidangMinat: BIDANG_MINAT.UMUM,
                    userLevelId: userLevel.id,
                },
            });

            Logger.info(`Created new dosen: ${nama} with NIP: ${finalNip}`);
            return { dosen, isNew: true };
        }

        return { dosen, isNew: false };
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
    lokasi: string = "Auto-generated from Excel"
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
            ruangan = await prisma.ruanganLaboratorium.create({
                data: {
                    id: ulid(),
                    nama: nama.trim(),
                    lokasi: lokasi,
                    kapasitas: 30, // Default capacity
                    isLab: nama.toLowerCase().includes("lab"), // Auto-detect if it's a lab
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
