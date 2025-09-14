import {
    BadRequestWithMessage,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { HARI, Jadwal, Meeting } from "@prisma/client";
import {
    JadwalDTO,
    JadwalExcelRowDTO,
    JadwalMeetingDTO,
    OverrideJadwalDTO,
} from "$entities/jadwal-entities";
import { prisma } from "$utils/prisma.utils";
import { ulid } from "ulid";
import { FilteringQueryV2 } from "$entities/Query";
import { PagedList } from "$entities/Query";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";
import { getAcademicPeriod } from "$utils/date.utils";
import { readExcelFile } from "$utils/upload-file.utils";
import {
    findOrCreateDosen,
    findOrCreateMatakuliah,
    findOrCreateRuangan,
    findOrCreateShift,
} from "./helpers/jadwal";
import { DateTime } from "luxon";
import { DAYS, geneticAlgorithm } from "./genetic-service";
import { generateNipDosen } from "$utils/strings.utils";

async function checkScheduleHasConflict(
    schedule: JadwalDTO,
    excludeScheduleId?: string // Optional parameter to exclude current schedule when updating
): Promise<OverrideJadwalDTO[]> {
    let overrideData: OverrideJadwalDTO[] = [];
    const academicPeriod = getAcademicPeriod();

    // Base where condition to exclude current schedule if updating
    const baseWhereCondition = excludeScheduleId
        ? {
              NOT: { id: excludeScheduleId },
              deletedAt: null, // Only check active schedules
          }
        : {
              deletedAt: null, // Only check active schedules
          };

    // Check Ruangan same day and shift
    const ruanganSameDayAndShift = await prisma.jadwal.findFirst({
        where: {
            ...baseWhereCondition,
            ruanganId: schedule.ruanganId,
            hari: schedule.hari,
            shiftId: schedule.shiftId,
            semester: academicPeriod.semester,
            tahun: academicPeriod.year,
        },
        include: {
            matakuliah: {
                select: { nama: true, kode: true },
            },
            ruangan: {
                select: { nama: true },
            },
            shift: {
                select: { startTime: true, endTime: true },
            },
        },
    });

    if (ruanganSameDayAndShift) {
        overrideData.push({
            id: ulid(),
            jadwalId: ruanganSameDayAndShift.id,
            message: `Ruangan ${ruanganSameDayAndShift.ruangan.nama} sudah ada jadwal "${ruanganSameDayAndShift.matakuliah.nama}" pada hari ${schedule.hari} shift ${ruanganSameDayAndShift.shift.startTime}-${ruanganSameDayAndShift.shift.endTime}!`,
        });
    }

    // Check dosen same day and shift - more specific query
    const dosenSameDayAndShift = await prisma.jadwal.findFirst({
        where: {
            ...baseWhereCondition,
            hari: schedule.hari,
            shiftId: schedule.shiftId,
            semester: academicPeriod.semester,
            tahun: academicPeriod.year,
            jadwalDosen: {
                some: { dosenId: { in: schedule.dosenIds } },
            },
        },
        include: {
            matakuliah: {
                select: { nama: true, kode: true },
            },
            ruangan: {
                select: { nama: true },
            },
            shift: {
                select: { startTime: true, endTime: true },
            },
            jadwalDosen: {
                include: {
                    dosen: {
                        select: { nama: true, nip: true },
                    },
                },
            },
        },
    });

    if (dosenSameDayAndShift) {
        // Get conflicting dosen names
        const conflictingDosen = dosenSameDayAndShift.jadwalDosen
            .filter((jd) => schedule.dosenIds.includes(jd.dosenId))
            .map((jd) => jd.dosen.nama)
            .join(", ");

        overrideData.push({
            id: ulid(),
            jadwalId: dosenSameDayAndShift.id,
            message: `Dosen ${conflictingDosen} sudah ada jadwal "${dosenSameDayAndShift.matakuliah.nama}" pada hari ${schedule.hari} shift ${dosenSameDayAndShift.shift.startTime}-${dosenSameDayAndShift.shift.endTime}!`,
        });
    }

    // Check if there are multiple conflicts (ruangan + dosen + same time)
    // This is more comprehensive than the previous combined check
    const combinedConflict = await prisma.jadwal.findFirst({
        where: {
            ...baseWhereCondition,
            ruanganId: schedule.ruanganId,
            hari: schedule.hari,
            shiftId: schedule.shiftId,
            semester: academicPeriod.semester,
            tahun: academicPeriod.year,
            jadwalDosen: {
                some: { dosenId: { in: schedule.dosenIds } },
            },
        },
        include: {
            matakuliah: {
                select: { nama: true, kode: true },
            },
            ruangan: {
                select: { nama: true },
            },
            shift: {
                select: { startTime: true, endTime: true },
            },
            jadwalDosen: {
                include: {
                    dosen: {
                        select: { nama: true },
                    },
                },
            },
        },
    });

    if (combinedConflict) {
        const conflictingDosen = combinedConflict.jadwalDosen
            .filter((jd) => schedule.dosenIds.includes(jd.dosenId))
            .map((jd) => jd.dosen.nama)
            .join(", ");

        // Only add if it's not already covered by the previous checks
        const alreadyCovered = overrideData.some(
            (override) => override.jadwalId === combinedConflict.id
        );

        if (!alreadyCovered) {
            overrideData.push({
                id: ulid(),
                jadwalId: combinedConflict.id,
                message: `Konflik lengkap: Ruangan ${combinedConflict.ruangan.nama} dan Dosen ${conflictingDosen} sudah ada jadwal "${combinedConflict.matakuliah.nama}" pada hari ${schedule.hari} shift ${combinedConflict.shift.startTime}-${combinedConflict.shift.endTime}!`,
            });
        }
    }

    return overrideData;
}
export async function createMeetingDates(
    hari: HARI,
    jadwalId: string
): Promise<Omit<Meeting, "createdAt" | "updatedAt">[]> {
    const meetings: Omit<Meeting, "createdAt" | "updatedAt">[] = [];

    const dayMap: Record<string, number> = {
        SENIN: 1,
        SELASA: 2,
        RABU: 3,
        KAMIS: 4,
        JUMAT: 5,
        SABTU: 6,
        MINGGU: 7,
    };

    const targetWeekday = dayMap[hari];
    if (!targetWeekday) {
        throw new Error(`Invalid day: ${hari}`);
    }

    const academicPeriod = getAcademicPeriod();

    const semesterStart =
        academicPeriod.semester === "GANJIL"
            ? DateTime.fromObject({
                  year: DateTime.now().year,
                  month: 8,
                  day: 15,
              })
            : DateTime.fromObject({
                  year: DateTime.now().year,
                  month: 2,
                  day: 15,
              });
    const semesterEnd =
        academicPeriod.semester === "GANJIL"
            ? DateTime.fromObject({
                  year: DateTime.now().year,
                  month: 12,
                  day: 15,
              })
            : DateTime.fromObject({
                  year: DateTime.now().year,
                  month: 6,
                  day: 15,
              });

    let currentDate = semesterStart;
    let pertemuanCount = 0;
    const maxPertemuan = 12;

    while (semesterStart <= semesterEnd && pertemuanCount < maxPertemuan) {
        if (currentDate.weekday === targetWeekday) {
            meetings.push({
                id: ulid(),
                jadwalId: jadwalId,
                tanggal: DateTime.fromFormat(
                    currentDate.toFormat("yyyy-MM-dd"),
                    "yyyy-MM-dd"
                ).toFormat("yyyy-MM-dd"),
                pertemuan: meetings.length + 1,
            });

            pertemuanCount++;
        }

        currentDate = currentDate.plus({ days: 1 });
    }

    return meetings;
}

export type CreateResponse = Jadwal | {};
export async function create(
    data: JadwalDTO
): Promise<ServiceResponse<CreateResponse>> {
    try {
        const academicPeriod = getAcademicPeriod();

        const matakuliah = await prisma.matakuliah.findUnique({
            where: { id: data.matakuliahId },
        });

        if (!matakuliah)
            return BadRequestWithMessage("Matakuliah tidak ditemukan!");

        const theoryData = await prisma.matakuliah.findFirst({
            where: { nama: matakuliah.nama.split(" ").slice(1).join(" ") },
        });

        if (!theoryData)
            return BadRequestWithMessage("Matakuliah teori tidak ditemukan!");

        let dosenIds = data.dosenIds;
        if (dosenIds.length === 0) {
            const theoryScheduleExists = await prisma.jadwal.findFirst({
                where: { matakuliahId: theoryData.id },
                include: {
                    jadwalDosen: true,
                },
            });

            if (!theoryScheduleExists)
                return BadRequestWithMessage("Jadwal teori tidak ditemukan!");

            dosenIds = theoryScheduleExists.jadwalDosen.map(
                (dosen) => dosen.dosenId
            );
        }

        const conflictData = await checkScheduleHasConflict(data);

        if (conflictData.length > 0 && !data.isOverride) {
            return {
                status: false,
                err: {
                    code: 409,
                    message: conflictData
                        .map((data) => data.message)
                        .join(", "),
                },
                data: conflictData,
            };
        }

        const schedule = await prisma.$transaction(async (prisma) => {
            const newSchedule = await prisma.jadwal.create({
                data: {
                    id: ulid(),
                    hari: data.hari,
                    shiftId: data.shiftId,
                    ruanganId: data.ruanganId,
                    semester: academicPeriod.semester,
                    tahun: academicPeriod.year,
                    kelas: data.kelas,
                    matakuliahId: data.matakuliahId,
                    jadwalDosen: {
                        create: dosenIds.map((dosenId) => ({
                            id: ulid(),
                            dosenId: dosenId,
                        })),
                    },
                    isOverride: conflictData.length > 0,
                },
            });

            if (conflictData.length > 0) {
                await prisma.overrideJadwal.createMany({
                    data: conflictData.map((conflict) => ({
                        id: ulid(),
                        jadwalId: newSchedule.id,
                        message: conflict.message,
                    })),
                });
            }

            const meetingDates = await createMeetingDates(
                data.hari,
                newSchedule.id
            );

            await prisma.meeting.createMany({
                data: meetingDates,
            });

            return newSchedule;
        });

        return {
            status: true,
            data: schedule,
        };
    } catch (err) {
        Logger.error(`JadwalService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllResponse = PagedList<Jadwal[]> | {};
export async function getAll(
    filters: FilteringQueryV2
): Promise<ServiceResponse<GetAllResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        // usedFilters.where = {
        //     matakuliah: {
        //         isTeori: false,
        //     },
        // };

        usedFilters.include = {
            jadwalDosen: {
                include: {
                    dosen: true,
                },
            },
            matakuliah: true,
            ruangan: true,
            shift: true,
        };

        const [jadwal, totalData] = await Promise.all([
            prisma.jadwal.findMany(usedFilters),
            prisma.jadwal.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take)
            totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: jadwal,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`JadwalService.getAll : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdResponse = Jadwal | {};
export async function getById(
    id: string
): Promise<ServiceResponse<GetByIdResponse>> {
    try {
        let jadwal = await prisma.jadwal.findUnique({
            where: { id },
            include: {
                jadwalAsistenLab: {
                    include: {
                        asistenLab: {
                            include: {
                                mahasiswa: true,
                            },
                        },
                    },
                },
                jadwalDosen: {
                    include: {
                        dosen: true,
                    },
                },
                jadwalMahasiswa: {
                    include: {
                        mahasiswa: true,
                    },
                },
                meetings: {
                    orderBy: {
                        pertemuan: "asc",
                    },
                },
                overrideData: true,
                ruangan: true,
                matakuliah: true,
                shift: true,
            },
        });

        if (!jadwal) return INVALID_ID_SERVICE_RESPONSE;

        return {
            status: true,
            data: jadwal,
        };
    } catch (err) {
        Logger.error(`DosenService.getById : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type UpdateResponse = Jadwal | {};
export async function update(
    id: string,
    data: JadwalDTO
): Promise<ServiceResponse<UpdateResponse>> {
    try {
        const academicPeriod = getAcademicPeriod();

        const scheduleExists = await prisma.jadwal.findUnique({
            where: { id },
        });

        if (!scheduleExists) return INVALID_ID_SERVICE_RESPONSE;

        const matakuliah = await prisma.matakuliah.findUnique({
            where: { id: data.matakuliahId },
        });

        if (!matakuliah)
            return BadRequestWithMessage("Matakuliah tidak ditemukan!");

        const theoryData = await prisma.matakuliah.findFirst({
            where: { nama: matakuliah.nama.split(" ").slice(1).join(" ") },
        });

        if (!theoryData)
            return BadRequestWithMessage("Matakuliah teori tidak ditemukan!");

        // let dosenIds = data.dosenIds;
        // if (dosenIds.length === 0) {
        //     const theoryScheduleExists = await prisma.jadwal.findFirst({
        //         where: { matakuliahId: theoryData.id },
        //         include: {
        //             jadwalDosen: true,
        //         },
        //     });

        //     if (!theoryScheduleExists)
        //         return BadRequestWithMessage("Jadwal teori tidak ditemukan!");
        // }

        const conflictData = await checkScheduleHasConflict(data, id);

        if (conflictData.length > 0 && !data.isOverride) {
            return {
                status: false,
                err: {
                    code: 409,
                    message: conflictData
                        .map((data) => data.message)
                        .join(", "),
                },
                data: conflictData,
            };
        }

        const schedule = await prisma.$transaction(async (tx) => {
            await tx.overrideJadwal.deleteMany({
                where: { jadwalId: id },
            });

            const updatedSchedule = await tx.jadwal.update({
                where: { id },
                data: {
                    hari: data.hari,
                    shiftId: data.shiftId,
                    ruanganId: data.ruanganId,
                    semester: academicPeriod.semester,
                    tahun: academicPeriod.year,
                    kelas: data.kelas,
                    matakuliahId: data.matakuliahId,
                    isOverride: conflictData.length > 0,
                    overrideData: {
                        create: conflictData,
                    },
                },
            });

            return updatedSchedule;
        });

        return {
            status: true,
            data: schedule,
        };
    } catch (err) {
        Logger.error(`JadwalService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function bulkUploadTheory(file: File) {
    try {
        const excelData = await readExcelFile<JadwalExcelRowDTO>(file);
        const academicPeriod = getAcademicPeriod();

        if (excelData.length === 0) {
            return BadRequestWithMessage(
                "Tidak ada data dalam file tersebut, silakan cek kembali file yang anda masukan"
            );
        }

        const results: Jadwal[] = [];

        for (const data of excelData) {
            const { matakuliah } = await findOrCreateMatakuliah(
                data.Kode,
                data.Nama
            );
            const { ruangan } = await findOrCreateRuangan(data.Ruang, "-");

            const timeRange = data.Waktu.split("-");
            const startTime = timeRange[0];
            const endTime = timeRange[1];

            const { shift } = await findOrCreateShift(startTime, endTime);

            const classCoordinatorName = data["Koordinator Kelas"].trim();
            const classCoordinatorNip = data.NIP_KOOR_KElAS
                ? data.NIP_KOOR_KElAS.trim()
                : data.NIP_KOOR_KElAS;

            const dosenName = classCoordinatorName;
            const dosenNip = classCoordinatorNip
                ? classCoordinatorNip
                : generateNipDosen();

            const splitGelar = dosenName.split(",");
            const nameWithoutGelar = splitGelar[0].trim();
            const splitIfMoreThanOneWord = nameWithoutGelar.split(" ");
            const joinWithUnderScore = splitIfMoreThanOneWord.join("_");
            const email = joinWithUnderScore + "@usk.ac.id";

            const { dosen } = await findOrCreateDosen(
                dosenName,
                dosenNip,
                email
            );

            if (matakuliah.isTeori) {
                const scheduleId = ulid();
                const hari =
                    data.Hari.toUpperCase() === "-"
                        ? HARI.SENIN
                        : (data.Hari.toUpperCase() as HARI);

                const schedule = await prisma.jadwal.create({
                    data: {
                        id: scheduleId,
                        matakuliahId: matakuliah.id,
                        ruanganId: ruangan.id,
                        shiftId: shift.id,
                        kelas: data.Kelas,
                        hari: hari,
                        semester: academicPeriod.semester,
                        tahun: academicPeriod.year,
                        jadwalDosen: {
                            create: {
                                id: ulid(),
                                dosenId: dosen.id,
                            },
                        },
                    },
                });

                results.push(schedule);
            }
        }

        return {
            status: true,
            data: results,
        };
    } catch (error) {
        Logger.error(`JadwalService.bulkUploadTheory : ${error}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function checkHasJadwalTheory(): Promise<ServiceResponse<{}>> {
    try {
        const jadwalTheoryCount = await prisma.jadwal.count({
            where: {
                matakuliah: {
                    isTeori: true,
                },
            },
        });

        if (jadwalTheoryCount === 0) {
            return {
                status: true,
                data: false,
            };
        }

        return {
            status: true,
            data: true,
        };
    } catch (error) {
        Logger.error(`JadwalService.checkHasJadwalTheory : ${error}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function deleteAll(): Promise<ServiceResponse<{}>> {
    try {
        await prisma.jadwal.deleteMany({
            where: {
                matakuliah: {
                    isTeori: false,
                },
            },
        });

        return {
            status: true,
            data: {},
        };
    } catch (error) {
        Logger.error(`JadwalService.deleteAll : ${error}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function generateSchedule(): Promise<ServiceResponse<{}>> {
    try {
        const gaResult = await geneticAlgorithm();
        const academicPeriod = getAcademicPeriod();

        if (!(gaResult.data as any)?.bestChoromosome)
            return BadRequestWithMessage("Tidak ada solusi yang ditemukan!");

        // Persist Schedule
        const createdIds = await prisma.$transaction(async (tx) => {
            const createdIds: string[] = [];
            const bestChr = (gaResult.data as any)?.bestChoromosome || [];

            for (const gene of bestChr) {
                const jadwalId = ulid();
                createdIds.push(jadwalId);

                await tx.jadwal.create({
                    data: {
                        id: jadwalId,
                        hari: DAYS[gene.hariIdx] as any,
                        shiftId: gene.shiftId,
                        ruanganId: gene.ruanganId,
                        semester: academicPeriod.semester,
                        tahun: academicPeriod.year,
                        kelas: gene.kelas,
                        matakuliahId: gene.matakuliahId,
                    },
                });

                await tx.jadwalDosen.create({
                    data: {
                        id: ulid(),
                        jadwalId,
                        dosenId: gene.dosenId,
                    },
                });

                const meetingDates = await createMeetingDates(
                    DAYS[gene.hariIdx] as any,
                    jadwalId
                );

                await tx.meeting.createMany({
                    data: meetingDates,
                });
            }

            return createdIds;
        });

        // Fetch the created schedules with full details
        const schedules = await prisma.jadwal.findMany({
            where: {
                id: { in: createdIds },
            },
            include: {
                matakuliah: true,
            },
        });

        return {
            status: true,
            data: {
                schedules,
                totalSchedules: schedules.length,
                bestScore: (gaResult.data as any)?.bestScore,
            },
        };
    } catch (error) {
        Logger.error(`JadwalService.generateSchedule : ${error}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function updateMeeting(
    id: string,
    data: JadwalMeetingDTO
): Promise<ServiceResponse<{}>> {
    try {
        const scheduleExists = await prisma.jadwal.findUnique({
            where: { id },
        });

        if (!scheduleExists)
            return BadRequestWithMessage("Jadwal Tidak Ditemukan!");

        const meetingExists = await prisma.meeting.findUnique({
            where: { id: data.meetingId },
        });

        if (!meetingExists)
            return BadRequestWithMessage(
                "Pertemuan Pada Jadwal ini tidak ditemukan!"
            );

        const now = DateTime.now();
        const currentMeetingDate = DateTime.fromFormat(
            meetingExists.tanggal,
            "yyyy-MM-dd"
        );
        const newMeetingDate = DateTime.fromFormat(data.tanggal, "yyyy-MM-dd");

        // Check if current meeting has already passed
        const hasCurrentMeetingPassed = currentMeetingDate < now.startOf("day");
        if (hasCurrentMeetingPassed) {
            return BadRequestWithMessage(
                "Tidak dapat mengubah pertemuan yang sudah berlalu!"
            );
        }

        // Check if new meeting date is in the past
        const isNewDateInPast = newMeetingDate < now.startOf("day");
        if (isNewDateInPast) {
            return BadRequestWithMessage(
                "Tanggal pertemuan tidak boleh di masa lalu!"
            );
        }

        // Check if trying to update less than 1 day before current meeting
        const daysDifferenceFromNow = currentMeetingDate.diff(now, "days").days;
        if (daysDifferenceFromNow < 1) {
            return BadRequestWithMessage(
                "Pertemuan hanya dapat diubah minimal 1 hari sebelum tanggal pertemuan saat ini!"
            );
        }

        // Additional validation: Check if new date is too far in the future (optional)
        const daysFromNowToNewDate = newMeetingDate.diff(now, "days").days;
        if (daysFromNowToNewDate > 365) {
            // Example: max 1 year ahead
            return BadRequestWithMessage(
                "Tanggal pertemuan tidak boleh lebih dari 1 tahun ke depan!"
            );
        }

        // Check if there's already another meeting on the new date for the same schedule
        const conflictingMeeting = await prisma.meeting.findFirst({
            where: {
                jadwalId: id,
                tanggal: data.tanggal,
                NOT: {
                    id: data.meetingId, // Exclude current meeting
                },
            },
        });

        if (currentMeetingDate > newMeetingDate) {
            return BadRequestWithMessage(
                "Tanggal pertemuan tidak boleh kurang dari tangagl pertemuan saat ini!"
            );
        }

        if (conflictingMeeting) {
            return BadRequestWithMessage(
                `Sudah ada pertemuan ke-${conflictingMeeting.pertemuan} pada tanggal ${data.tanggal}!`
            );
        }

        const updatedMeeting = await prisma.meeting.update({
            where: { id: data.meetingId },
            data: {
                tanggal: data.tanggal,
            },
        });

        return {
            status: true,
            data: updatedMeeting,
        };
    } catch (error) {
        Logger.error(`JadwalService.UpdateMeeting : ${error}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
