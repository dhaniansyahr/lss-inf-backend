import { FilteringQueryV2, PagedList } from "$entities/Query";
import {
    BadRequestWithMessage,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Mahasiswa } from "@prisma/client";
import { buildFilterQueryLimitOffsetV2 } from "$services/helpers/FilterQueryV2";
import { readExcelFile } from "$utils/upload-file.utils";
import { ulid } from "ulid";
import bcrypt from "bcrypt";
import { namaToEmail } from "$utils/strings.utils";
import {
    MahasiswaDTO,
    MahasiswaExcelDTO,
} from "$entities/master-data/mahasiswa";

export type CreateResponse = Mahasiswa | {};
export async function create(
    data: MahasiswaDTO
): Promise<ServiceResponse<CreateResponse>> {
    try {
        const mahasiswa = await prisma.mahasiswa.create({
            data,
        });

        return {
            status: true,
            data: mahasiswa,
        };
    } catch (err) {
        Logger.error(`MahasiswaService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllResponse = PagedList<Mahasiswa[]> | {};
export async function getAll(
    filters: FilteringQueryV2
): Promise<ServiceResponse<GetAllResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        const [mahasiswa, totalData] = await Promise.all([
            prisma.mahasiswa.findMany(usedFilters),
            prisma.mahasiswa.count({
                where: usedFilters.where,
            }),
        ]);

        let totalPage = 1;
        if (totalData > usedFilters.take)
            totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: mahasiswa,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`MahasiswaService.getAll : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdResponse = Mahasiswa | {};
export async function getById(
    id: string
): Promise<ServiceResponse<GetByIdResponse>> {
    try {
        let mahasiswa = await prisma.mahasiswa.findUnique({
            where: {
                id,
            },
        });

        if (!mahasiswa) return INVALID_ID_SERVICE_RESPONSE;

        return {
            status: true,
            data: mahasiswa,
        };
    } catch (err) {
        Logger.error(`MahasiswaService.getById : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type UpdateResponse = Mahasiswa | {};
export async function update(
    id: string,
    data: MahasiswaDTO
): Promise<ServiceResponse<UpdateResponse>> {
    try {
        const existingMahasiswa = await prisma.mahasiswa.findUnique({
            where: { id },
        });

        if (!existingMahasiswa) {
            return INVALID_ID_SERVICE_RESPONSE;
        }

        const mahasiswa = await prisma.mahasiswa.update({
            where: { id },
            data,
        });

        return {
            status: true,
            data: mahasiswa,
        };
    } catch (err) {
        Logger.error(`MahasiswaService.update : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function bulkUpload(file: File): Promise<ServiceResponse<{}>> {
    try {
        const excelData = await readExcelFile<MahasiswaExcelDTO>(file);

        if (excelData.length === 0) {
            return BadRequestWithMessage(
                "Tidak ada data dalam file tersebut, silakan cek kembali file yang anda masukan"
            );
        }

        const userLevel = await prisma.userLevels.findFirst({
            where: {
                name: "MAHASISWA",
            },
        });

        if (!userLevel) {
            return BadRequestWithMessage(
                "User level mahasiswa tidak ditemukan"
            );
        }

        const mahasiswaData = await Promise.all(
            excelData.map(async (data) => {
                const hashedPassword = await bcrypt.hash("mahasiswa123", 12);
                const email = namaToEmail(data.NAMA);

                return {
                    id: ulid(),
                    nama: data.NAMA,
                    npm: data.NPM,
                    semester: data.SEMESTER,
                    tahunMasuk: data.TAHUN_MASUK,
                    isActive: data.IS_ACTIVE,
                    userLevelId: userLevel.id,
                    email: email,
                    password: hashedPassword,
                };
            })
        );

        const mahasiswa = await prisma.mahasiswa.createMany({
            data: mahasiswaData,
        });

        return {
            status: true,
            data: mahasiswa,
        };
    } catch (err) {
        Logger.error(`MahasiswaService.bulkUpload : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function deleteByIds(ids: string): Promise<ServiceResponse<{}>> {
    try {
        const idArray: string[] = JSON.parse(ids);

        const mahasiswaUsed = await prisma.jadwal.findMany({
            where: {
                jadwalMahasiswa: {
                    some: {
                        id: { in: idArray },
                    },
                },
            },
        });

        if (mahasiswaUsed.length > 0) {
            return BadRequestWithMessage(
                "Mahasiswa masih digunakan pada jadwal"
            );
        }

        await prisma.mahasiswa.deleteMany({
            where: { id: { in: idArray } },
        });

        return {
            status: true,
            data: {},
        };
    } catch (err) {
        Logger.error(`MahasiswaService.deleteByIds : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
