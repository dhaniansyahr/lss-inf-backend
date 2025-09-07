import { FilteringQueryV2, PagedList } from "$entities/Query";
import {
    BadRequestWithMessage,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { RuanganLaboratorium } from "@prisma/client";
import { ulid } from "ulid";
import { DateTime } from "luxon";
import { buildFilterQueryLimitOffsetV2 } from "$services/helpers/FilterQueryV2";
import { AssignKepalaLabDTO, RuanganDTO } from "$entities/master-data/ruangan";

export type CreateResponse = RuanganLaboratorium | {};
export async function create(
    data: RuanganDTO
): Promise<ServiceResponse<CreateResponse>> {
    try {
        const ruanganLaboratorium = await prisma.ruanganLaboratorium.create({
            data: {
                id: ulid(),
                nama: data.nama,
                lokasi: data.lokasi,
                kapasitas: data.kapasitas ?? 25,
                isLab: data.isLab !== undefined ? data.isLab : false,
            },
        });

        return {
            status: true,
            data: ruanganLaboratorium,
        };
    } catch (err) {
        Logger.error(`RuanganLaboratoriumService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllResponse = PagedList<RuanganLaboratorium[]> | {};
export async function getAll(
    filters: FilteringQueryV2
): Promise<ServiceResponse<GetAllResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        usedFilters.where.isLab = true;
        usedFilters.include = {
            kepalaLab: {
                select: {
                    nama: true,
                    nip: true,
                },
            },
        };

        const [ruanganLaboratorium, totalData] = await Promise.all([
            prisma.ruanganLaboratorium.findMany(usedFilters),
            prisma.ruanganLaboratorium.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take)
            totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: ruanganLaboratorium,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`RuanganLaboratoriumService.getAll : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdResponse = RuanganLaboratorium | {};
export async function getById(
    id: string
): Promise<ServiceResponse<GetByIdResponse>> {
    try {
        let ruanganLaboratorium = await prisma.ruanganLaboratorium.findUnique({
            where: {
                id,
            },
            include: {
                kepalaLab: true,
                historyKepalaLab: true,
            },
        });

        if (!ruanganLaboratorium) return INVALID_ID_SERVICE_RESPONSE;

        return {
            status: true,
            data: ruanganLaboratorium,
        };
    } catch (err) {
        Logger.error(`RuanganLaboratoriumService.getById : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type UpdateResponse = RuanganLaboratorium | {};
export async function update(
    id: string,
    data: RuanganDTO
): Promise<ServiceResponse<UpdateResponse>> {
    try {
        const existingRoom = await prisma.ruanganLaboratorium.findUnique({
            where: { id },
            select: { id: true, isActive: true },
        });

        if (!existingRoom || !existingRoom.isActive) {
            return INVALID_ID_SERVICE_RESPONSE;
        }

        const ruanganLaboratorium = await prisma.ruanganLaboratorium.update({
            where: { id },
            data: {
                nama: data.nama,
                lokasi: data.lokasi,
                kapasitas: data.kapasitas ?? 25,
                isLab: data.isLab !== undefined ? data.isLab : false,
            },
        });

        return {
            status: true,
            data: ruanganLaboratorium,
        };
    } catch (err) {
        Logger.error(`RuanganLaboratoriumService.update : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type AssignKepalaLabResponse = RuanganLaboratorium | {};
export async function assignKepalaLab(
    id: string,
    data: AssignKepalaLabDTO
): Promise<ServiceResponse<AssignKepalaLabResponse>> {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // Check if room exists and is active
            const existingRoom = await tx.ruanganLaboratorium.findUnique({
                where: { id },
                select: {
                    id: true,
                    isActive: true,
                    kepalaLabId: true,
                },
            });

            if (!existingRoom || !existingRoom.isActive) {
                return INVALID_ID_SERVICE_RESPONSE;
            }

            // End current kepala lab assignment if exists
            if (existingRoom.kepalaLabId) {
                await tx.historyKepalaLab.updateMany({
                    where: {
                        ruanganLabId: id,
                        endDate: null,
                    },
                    data: {
                        endDate: DateTime.now().toFormat("yyyy-MM-dd"),
                    },
                });
            }

            // Check if kepala lab already exists, if not create new one
            let kepalaLab = await tx.kepalaLab.findUnique({
                where: { nip: data.nip },
            });

            if (!kepalaLab) {
                kepalaLab = await tx.kepalaLab.create({
                    data: {
                        id: ulid(),
                        nama: data.nama,
                        nip: data.nip,
                    },
                });
            }

            // Create history entry
            await tx.historyKepalaLab.create({
                data: {
                    id: ulid(),
                    kepalaLabId: kepalaLab.id,
                    ruanganLabId: id,
                    startDate: DateTime.fromJSDate(
                        kepalaLab.createdAt
                    ).toFormat("yyyy-MM-dd"),
                    endDate: DateTime.now().toFormat("yyyy-MM-dd"),
                },
            });

            // Update the ruangan with the new kepala lab
            const ruanganLaboratorium = await tx.ruanganLaboratorium.update({
                where: { id },
                data: {
                    kepalaLabId: kepalaLab.id,
                },
            });

            return ruanganLaboratorium;
        });

        return {
            status: true,
            data: result,
        };
    } catch (err) {
        Logger.error(`RuanganLaboratoriumService.assignKepalaLab : ${err}`);

        if (
            err instanceof Error &&
            err.message.includes("Record to update not found")
        ) {
            return INVALID_ID_SERVICE_RESPONSE;
        }

        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function deleteByIds(ids: string): Promise<ServiceResponse<{}>> {
    try {
        const idArray: string[] = JSON.parse(ids);

        // Check Relation Ruangan to Other Schedule
        const jadwal = await prisma.jadwal.findMany({
            where: {
                ruanganId: { in: idArray },
            },
        });

        if (jadwal.length > 0) {
            return BadRequestWithMessage("Ruangan masih digunakan pada jadwal");
        }

        await prisma.ruanganLaboratorium.deleteMany({
            where: {
                id: { in: idArray },
            },
        });

        return {
            status: true,
            data: {},
        };
    } catch (err) {
        Logger.error(`RuanganLaboratoriumService.deleteByIds : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function activatedRoom(
    id: string,
    isActive: boolean
): Promise<ServiceResponse<{}>> {
    try {
        const existRoom = await prisma.ruanganLaboratorium.findUnique({
            where: { id },
        });

        if (!existRoom) {
            return INVALID_ID_SERVICE_RESPONSE;
        }

        const room = await prisma.ruanganLaboratorium.update({
            where: { id },
            data: { isActive },
        });

        return {
            status: true,
            data: room,
        };
    } catch (err) {
        Logger.error(`RuanganLaboratoriumService.activatedRoom : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
