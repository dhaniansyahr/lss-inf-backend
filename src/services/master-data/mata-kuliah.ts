import { FilteringQueryV2, PagedList } from "$entities/Query";
import {
    BadRequestWithMessage,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { BIDANG_MINAT, Matakuliah, TYPE_MATKUL } from "@prisma/client";
import { buildFilterQueryLimitOffsetV2 } from "$services/helpers/FilterQueryV2";
import { readExcelFile } from "$utils/upload-file.utils";
import { ulid } from "ulid";
import {
    MatakuliahDTO,
    MatakuliahExcelDTO,
} from "$entities/master-data/mata-kuliah";

export type CreateResponse = Matakuliah | {};
export async function create(
    data: MatakuliahDTO
): Promise<ServiceResponse<CreateResponse>> {
    try {
        const matakuliah = await prisma.matakuliah.create({
            data,
        });

        return {
            status: true,
            data: matakuliah,
        };
    } catch (err) {
        Logger.error(`MatakuliahService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllResponse = PagedList<Matakuliah[]> | {};
export async function getAll(
    filters: FilteringQueryV2
): Promise<ServiceResponse<GetAllResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        const [matakuliah, totalData] = await Promise.all([
            prisma.matakuliah.findMany(usedFilters),
            prisma.matakuliah.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take)
            totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: matakuliah,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`MatakuliahService.getAll : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdResponse = Matakuliah | {};
export async function getById(
    id: string
): Promise<ServiceResponse<GetByIdResponse>> {
    try {
        let matakuliah = await prisma.matakuliah.findUnique({
            where: {
                id,
            },
        });

        if (!matakuliah) return INVALID_ID_SERVICE_RESPONSE;

        return {
            status: true,
            data: matakuliah,
        };
    } catch (err) {
        Logger.error(`MatakuliahService.getById : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type UpdateResponse = Matakuliah | {};
export async function update(
    id: string,
    data: MatakuliahDTO
): Promise<ServiceResponse<UpdateResponse>> {
    try {
        const existingMatakuliah = await prisma.matakuliah.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!existingMatakuliah) {
            return INVALID_ID_SERVICE_RESPONSE;
        }

        const matakuliah = await prisma.matakuliah.update({
            where: { id },
            data,
        });

        return {
            status: true,
            data: matakuliah,
        };
    } catch (err) {
        Logger.error(`MatakuliahService.update : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function bulkUpload(file: File): Promise<ServiceResponse<{}>> {
    try {
        const excelData = await readExcelFile<MatakuliahExcelDTO>(file);

        if (excelData.length === 0) {
            return BadRequestWithMessage(
                "Tidak ada data dalam file tersebut, silakan cek kembali file yang anda masukan"
            );
        }

        const matakuliah = await prisma.matakuliah.createMany({
            data: excelData.map((data) => ({
                id: ulid(),
                kode: data.KODE,
                nama: data.NAMA,
                type: data.TYPE as TYPE_MATKUL,
                sks: data.SKS,
                bidangMinat: data.BIDANG_MINAT as BIDANG_MINAT,
                semester: data.SEMESTER,
                isTeori: data.IS_TEORI === "TEORI" ? true : false,
            })),
        });

        return {
            status: true,
            data: matakuliah,
        };
    } catch (err) {
        Logger.error(`MatakuliahService.bulkUpload : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function deleteByIds(ids: string): Promise<ServiceResponse<{}>> {
    try {
        const idArray: string[] = JSON.parse(ids);

        const matakuliahUsed = await prisma.jadwal.findMany({
            where: {
                matakuliahId: { in: idArray },
            },
        });

        if (matakuliahUsed.length > 0) {
            return BadRequestWithMessage(
                "Mata Kuliah masih digunakan pada jadwal"
            );
        }

        await prisma.matakuliah.deleteMany({
            where: { id: { in: idArray } },
        });

        return {
            status: true,
            data: {},
        };
    } catch (err) {
        Logger.error(`MatakuliahService.deleteByIds : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
