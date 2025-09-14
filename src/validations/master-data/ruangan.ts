import { Context, Next } from "hono";
import { AssignKepalaLabDTO, RuanganDTO } from "$entities/master-data/ruangan";
import { ErrorStructure, generateErrorStructure } from "$validations/helper";
import { response_bad_request } from "$utils/response.utils";
import { prisma } from "$utils/prisma.utils";

export async function validateRuangan(c: Context, next: Next) {
    const data: RuanganDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.nama)
        invalidFields.push(
            generateErrorStructure("nama", "Nama ruangan tidak boleh kosong")
        );
    if (!data.lokasi)
        invalidFields.push(
            generateErrorStructure(
                "lokasi",
                "Lokasi ruangan tidak boleh kosong"
            )
        );
    if (!data.kapasitas)
        invalidFields.push(
            generateErrorStructure(
                "kapasitas",
                "Kapasitas ruangan tidak boleh kosong"
            )
        );

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    if (typeof data.nama !== "string")
        invalidFields.push(
            generateErrorStructure("nama", "Nama ruangan harus berupa string")
        );
    if (typeof data.lokasi !== "string")
        invalidFields.push(
            generateErrorStructure(
                "lokasi",
                "Lokasi ruangan harus berupa string"
            )
        );
    if (typeof data.kapasitas !== "number")
        invalidFields.push(
            generateErrorStructure(
                "kapasitas",
                "Kapasitas ruangan harus berupa number"
            )
        );

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    await next();
}

export async function validateAssignKepalaLab(c: Context, next: Next) {
    const data: AssignKepalaLabDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.dosenId)
        invalidFields.push(
            generateErrorStructure(
                "dosenId",
                "Dosen kepala lab tidak boleh kosong"
            )
        );

    const dosenExist = await prisma.dosen.findUnique({
        where: {
            id: data.dosenId,
        },
    });

    if (!dosenExist)
        invalidFields.push(
            generateErrorStructure(
                "dosenId",
                "Dosen kepala lab tidak ditemukan atau belum menjadi dosen pengajar!"
            )
        );

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    await next();
}
