import { FilteringQueryV2, PagedList } from "$entities/Query";
import {
    BadRequestWithMessage,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { BIDANG_MINAT, Dosen } from "@prisma/client";
import { buildFilterQueryLimitOffsetV2 } from "$services/helpers/FilterQueryV2";
import { readExcelFile } from "$utils/upload-file.utils";
import { ulid } from "ulid";
import { DosenDTO, DosenExcelDTO } from "$entities/master-data/dosen";
import bcrypt from "bcrypt";
import { generateNipDosen, namaToEmail } from "$utils/strings.utils";

export type CreateResponse = Dosen | {};
export async function create(
    data: DosenDTO
): Promise<ServiceResponse<CreateResponse>> {
    try {
        const userLevel = await prisma.userLevels.findFirst({
            where: {
                name: "DOSEN",
            },
        });

        if (!userLevel) {
            return BadRequestWithMessage("User level dosen tidak ditemukan");
        }

        const hashedPassword = await bcrypt.hash(data.password, 12);

        const dosen = await prisma.dosen.create({
            data: {
                id: ulid(),
                nama: data.nama,
                nip: data.nip,
                email: data.email,
                password: hashedPassword,
                userLevelId: userLevel.id,
                bidangMinat: data.bidangMinat,
            },
        });

        return {
            status: true,
            data: dosen,
        };
    } catch (err) {
        Logger.error(`DosenService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllResponse = PagedList<Dosen[]> | {};
export async function getAll(
    filters: FilteringQueryV2
): Promise<ServiceResponse<GetAllResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        const [dosen, totalData] = await Promise.all([
            prisma.dosen.findMany(usedFilters),
            prisma.dosen.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take)
            totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: dosen,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`DosenService.getAll : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdResponse = Dosen | {};
export async function getById(
    id: string
): Promise<ServiceResponse<GetByIdResponse>> {
    try {
        let dosen = await prisma.dosen.findUnique({
            where: {
                id,
            },
        });

        if (!dosen) return INVALID_ID_SERVICE_RESPONSE;

        return {
            status: true,
            data: dosen,
        };
    } catch (err) {
        Logger.error(`DosenService.getById : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type UpdateResponse = Dosen | {};
export async function update(
    id: string,
    data: DosenDTO
): Promise<ServiceResponse<UpdateResponse>> {
    try {
        const existingDosen = await prisma.dosen.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!existingDosen) {
            return INVALID_ID_SERVICE_RESPONSE;
        }

        const dosen = await prisma.dosen.update({
            where: { id },
            data,
        });

        return {
            status: true,
            data: dosen,
        };
    } catch (err) {
        Logger.error(`DosenService.update : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function bulkUpload(file: File): Promise<ServiceResponse<{}>> {
    try {
        const excelData = await readExcelFile<DosenExcelDTO>(file);

        if (excelData.length === 0) {
            return BadRequestWithMessage(
                "Tidak ada data dalam file tersebut, silakan cek kembali file yang anda masukan"
            );
        }

        const userLevel = await prisma.userLevels.findFirst({
            where: {
                name: "DOSEN",
            },
        });

        if (!userLevel) {
            return BadRequestWithMessage("User level dosen tidak ditemukan");
        }

        const dosenData = await Promise.all(
            excelData.map(async (data) => {
                const hashedPassword = await bcrypt.hash(data.PASSWORD, 12);
                const email = namaToEmail(data.EMAIL);

                return {
                    id: ulid(),
                    nama: data.NAMA,
                    email: email,
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

        return {
            status: true,
            data: dosen,
        };
    } catch (err) {
        Logger.error(`DosenService.bulkUpload : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function deleteByIds(ids: string): Promise<ServiceResponse<{}>> {
    try {
        const idArray: string[] = JSON.parse(ids);

        const dosenUsed = await prisma.jadwal.findMany({
            where: {
                jadwalDosen: {
                    some: {
                        id: { in: idArray },
                    },
                },
            },
        });

        if (dosenUsed.length > 0) {
            return BadRequestWithMessage("Dosen masih digunakan pada jadwal");
        }

        await prisma.dosen.deleteMany({
            where: { id: { in: idArray } },
        });

        return {
            status: true,
            data: {},
        };
    } catch (err) {
        Logger.error(`DosenService.deleteByIds : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
