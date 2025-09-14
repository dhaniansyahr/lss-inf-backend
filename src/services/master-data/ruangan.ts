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
            const ruangan = await tx.ruanganLaboratorium.findUnique({
                where: { id, isActive: true },
                include: { kepalaLab: true }, // Include current kepala lab info
            });

            if (!ruangan) {
                return BadRequestWithMessage(
                    "Ruangan tidak ditemukan atau tidak aktif!"
                );
            }

            // If there's already a kepala lab, close their history record
            if (ruangan.kepalaLabId) {
                // Find and close the current active history record
                const activeHistory = await tx.historyKepalaLab.findFirst({
                    where: {
                        kepalaLabId: ruangan.kepalaLabId,
                        ruanganLabId: id,
                        endDate: null,
                    },
                });

                if (activeHistory) {
                    await tx.historyKepalaLab.update({
                        where: { id: activeHistory.id },
                        data: {
                            endDate: DateTime.now().toJSDate(),
                        },
                    });
                }
            }

            // Create new history record for the new kepala lab
            await tx.historyKepalaLab.create({
                data: {
                    id: ulid(),
                    kepalaLabId: data.dosenId,
                    ruanganLabId: id,
                    startDate: DateTime.now().toJSDate(),
                },
            });

            // Update ruangan with new kepala lab
            const updatedRuangan = await tx.ruanganLaboratorium.update({
                where: { id },
                data: {
                    kepalaLabId: data.dosenId,
                },
                include: {
                    kepalaLab: true,
                    historyKepalaLab: {
                        include: {
                            kepalaLab: true,
                        },
                    },
                },
            });

            return updatedRuangan;
        });

        return {
            status: true,
            data: result,
        };
    } catch (err) {
        Logger.error(`RuanganLaboratoriumService.assignKepalaLab : ${err}`);

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
