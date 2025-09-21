import { FilteringQueryV2, PagedList } from "$entities/Query";
import {
    BadRequestWithMessage,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import {
    ASISTEN_LAB_STATUS,
    AsistenLab,
    NILAI_MATAKULIAH,
    PendaftaranAsistenLab,
} from "@prisma/client";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";
import { ulid } from "ulid";
import { UserJWTDAO } from "$entities/User";
import {
    AssignAsistenLabDTO,
    PendaftaranAsistenLabDTO,
    PenerimaanAsistenDTO,
} from "$entities/asisten-lab";
import { getAcademicPeriod } from "$utils/date.utils";

export type CreateResponse = PendaftaranAsistenLab | {};
export async function create(
    data: PendaftaranAsistenLabDTO
): Promise<ServiceResponse<CreateResponse>> {
    try {
        const scheduleExists = await prisma.jadwal.findUnique({
            where: { id: data.jadwalId },
        });

        if (!scheduleExists) {
            return BadRequestWithMessage("Jadwal tidak ditemukan!");
        }

        const mahasiswaExists = await prisma.mahasiswa.findUnique({
            where: { id: data.mahasiswaId },
        });

        if (!mahasiswaExists) {
            return BadRequestWithMessage("Mahasiswa tidak ditemukan!");
        }

        // Check Registrations
        const registrations = await prisma.pendaftaranAsistenLab.findMany({
            where: {
                jadwalId: data.jadwalId,
            },
        });

        if (registrations.length > 0) {
            return BadRequestWithMessage(
                "Pendaftaran anda sudah ada pada jadwal ini!"
            );
        }

        const pendaftaranAsistenLab = await prisma.pendaftaranAsistenLab.create(
            {
                data: {
                    id: ulid(),
                    mahasiswaId: data.mahasiswaId,
                    jadwalId: data.jadwalId,
                    matakuliahId: scheduleExists.matakuliahId,
                    nilaiTeori: data.nilaiTeori as NILAI_MATAKULIAH,
                    nilaiPraktikum: data.nilaiPraktikum as NILAI_MATAKULIAH,
                    nilaiAkhir: data.nilaiAkhir as NILAI_MATAKULIAH,
                    keterangan: data.keterangan ?? "",
                },
            }
        );

        return {
            status: true,
            data: pendaftaranAsistenLab,
        };
    } catch (err) {
        Logger.error(`PendaftaranAsistenLabService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllResponse = PagedList<PendaftaranAsistenLab[]> | {};
export async function getAll(
    filters: FilteringQueryV2,
    user: UserJWTDAO
): Promise<ServiceResponse<GetAllResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        const userLevel = await prisma.userLevels.findUnique({
            where: { id: user.userLevelId },
        });

        if (!userLevel)
            return BadRequestWithMessage("User Level Tidak Ditemukan!");

        if (userLevel.name === "MAHASISWA") {
            usedFilters.where = {
                mahasiswaId: user.id,
            };
        } else if (userLevel.name === "DOSEN") {
            usedFilters.where = {
                jadwal: {
                    jadwalDosen: {
                        some: { dosenId: user.id },
                    },
                },
            };
        }

        const [pendaftaranAsistenLab, totalData] = await Promise.all([
            prisma.pendaftaranAsistenLab.findMany(usedFilters),
            prisma.pendaftaranAsistenLab.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take)
            totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: pendaftaranAsistenLab,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`PendaftaranAsistenLabService.getAll : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllAsistenLabResponse = PagedList<AsistenLab[]> | {};
export async function getAllAsisten(
    filters: FilteringQueryV2
): Promise<ServiceResponse<GetAllResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        const [asistenLab, totalData] = await Promise.all([
            prisma.asistenLab.findMany(usedFilters),
            prisma.asistenLab.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take)
            totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: asistenLab,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`AsistenLabService.getAll : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type UpdateResponse = PendaftaranAsistenLab | {};
export async function update(
    id: string,
    data: PendaftaranAsistenLabDTO
): Promise<ServiceResponse<UpdateResponse>> {
    try {
        const registrationExists =
            await prisma.pendaftaranAsistenLab.findUnique({
                where: { id },
            });

        if (!registrationExists) return INVALID_ID_SERVICE_RESPONSE;

        const pendaftaranAsistenLab = await prisma.pendaftaranAsistenLab.update(
            {
                where: { id },
                data: data,
            }
        );

        return {
            status: true,
            data: pendaftaranAsistenLab,
        };
    } catch (err) {
        Logger.error(`PendaftaranAsistenLabService.update : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type PenerimaanAsistenLabResponse = PendaftaranAsistenLab | {};
export async function penerimaanAsistenLab(
    id: string,
    data: PenerimaanAsistenDTO
): Promise<ServiceResponse<PenerimaanAsistenLabResponse>> {
    try {
        const academicPeriod = getAcademicPeriod();

        const registrationExists =
            await prisma.pendaftaranAsistenLab.findUnique({
                where: { id, status: ASISTEN_LAB_STATUS.PENDING },
            });

        if (!registrationExists) return INVALID_ID_SERVICE_RESPONSE;

        const assistAcceptanceResponse = await prisma.$transaction(
            async (tx) => {
                const assistAcceptance = await tx.pendaftaranAsistenLab.update({
                    where: { id },
                    data: data,
                    include: {
                        mahasiswa: true,
                    },
                });

                if (data.status === ASISTEN_LAB_STATUS.DISETUJUI) {
                    await tx.asistenLab.create({
                        data: {
                            id: ulid(),
                            mahasiswaId: assistAcceptance.mahasiswaId,
                            semester: assistAcceptance.mahasiswa.semester,
                            tahun: academicPeriod.year,
                        },
                    });
                }

                return assistAcceptance;
            }
        );

        return {
            status: true,
            data: assistAcceptanceResponse,
        };
    } catch (err) {
        Logger.error(
            `PendaftaranAsistenLabService.penerimaanAsistenLab : ${err}`
        );
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function assignAsistenLab(
    id: string,
    data: AssignAsistenLabDTO
): Promise<ServiceResponse<{}>> {
    try {
        const scheduleExists = await prisma.jadwal.findUnique({
            where: { id },
        });

        if (!scheduleExists) return INVALID_ID_SERVICE_RESPONSE;

        const assistenIds = data.asistenIds;

        const updatedSchedule = await prisma.jadwal.update({
            where: { id },
            data: {
                jadwalAsistenLab: {
                    create: assistenIds.map((asistenId) => ({
                        id: ulid(),
                        asistenLabId: asistenId,
                    })),
                },
            },
        });

        return {
            status: true,
            data: updatedSchedule,
        };
    } catch (err) {
        Logger.error(`PendaftaranAsistenLabService.assignAsistenLab : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
