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
    schedule: JadwalDTO
): Promise<OverrideJadwalDTO[]> {
    let overrideData: OverrideJadwalDTO[] = [];

    // check Ruangan same day and shift
    const ruanganSameDayAndShift = await prisma.jadwal.findFirst({
        where: {
            ruanganId: schedule.ruanganId,
            hari: schedule.hari,
            shiftId: schedule.shiftId,
        },
    });

    if (ruanganSameDayAndShift) {
        overrideData.push({
            id: ulid(),
            jadwalId: ruanganSameDayAndShift.id,
            message: "Ruangan sudah ada jadwal pada hari dan shift yang sama!",
        });
    }

    // check dosen same day and shift
    const dosenSameDayAndShift = await prisma.jadwal.findFirst({
        where: {
            jadwalDosen: {
                some: { dosenId: { in: schedule.dosenIds } },
            },
        },
    });

    if (dosenSameDayAndShift) {
        overrideData.push({
            id: ulid(),
            jadwalId: dosenSameDayAndShift.id,
            message: "Dosen sudah ada jadwal pada hari dan shift yang sama!",
        });
    }

    // check ruangan, sam day, shift, and dosen
    const ruanganSameDayAndShiftAndDosen = await prisma.jadwal.findFirst({
        where: {
            ruanganId: schedule.ruanganId,
            hari: schedule.hari,
            shiftId: schedule.shiftId,
            jadwalDosen: {
                some: { dosenId: { in: schedule.dosenIds } },
            },
        },
    });

    if (ruanganSameDayAndShiftAndDosen) {
        overrideData.push({
            id: ulid(),
            jadwalId: ruanganSameDayAndShiftAndDosen.id,
            message: "Ruangan, dosen, dan hari yang sama sudah ada jadwal!",
        });
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

        const theoryScheduleExists = await prisma.jadwal.findFirst({
            where: { matakuliahId: theoryData.id },
            include: {
                jadwalDosen: true,
            },
        });

        if (!theoryScheduleExists)
            return BadRequestWithMessage("Jadwal teori tidak ditemukan!");

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
                        create: theoryScheduleExists.jadwalDosen.map(
                            (dosen) => ({
                                id: ulid(),
                                dosenId: dosen.dosenId,
                            })
                        ),
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
                meetings: true,
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

        const theoryScheduleExists = await prisma.jadwal.findFirst({
            where: { matakuliahId: theoryData.id },
            include: {
                jadwalDosen: true,
            },
        });

        if (!theoryScheduleExists)
            return BadRequestWithMessage("Jadwal teori tidak ditemukan!");

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

        const schedulesData = await Promise.all(
            excelData.map(async (data) => {
                const { matakuliah } = await findOrCreateMatakuliah(
                    data.Kode,
                    data.Nama
                );
                const { ruangan } = await findOrCreateRuangan(data.Ruang, "");

                const timeRange = data.Waktu.split("-");
                const startTime = timeRange[0];
                const endTime = timeRange[1];

                const { shift } = await findOrCreateShift(startTime, endTime);

                const coordinatorKelas = data["Koordinator Kelas"].trim();
                const coordinatorKelasNip =
                    coordinatorKelas.match(/NIP\.\s*(\d+)/)?.[1];
                const coordinatorKelasName =
                    coordinatorKelas.match(/^([^NIP]+)/);

                const dosenName = coordinatorKelasName
                    ? coordinatorKelasName[1].trim().replace(/,\s*$/, "")
                    : coordinatorKelas;
                const dosenNip = coordinatorKelasNip
                    ? coordinatorKelasNip
                    : generateNipDosen();

                const { dosen } = await findOrCreateDosen(dosenName, dosenNip);

                return {
                    id: ulid(),
                    matakuliahId: matakuliah.id,
                    ruanganId: ruangan.id,
                    shiftId: shift.id,
                    dosenId: dosen.id,
                    kelas: data.Kelas,
                    hari: data.Hari.toUpperCase() as HARI,
                    semester: academicPeriod.semester,
                    tahun: academicPeriod.year,
                };
            })
        );

        const schedules = await prisma.jadwal.createMany({
            data: schedulesData,
        });

        return {
            status: true,
            data: schedules,
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
        const schedules = await prisma.$transaction(async (tx) => {
            const created: string[] = [];
            const bestChr = (gaResult.data as any)?.bestChoromosome || [];
            for (const gene of bestChr) {
                const jadwalId = ulid();
                created.push(jadwalId);

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
            }

            return created;
        });

        return {
            status: true,
            data: {
                schedules,
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
