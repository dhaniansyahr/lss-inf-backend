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

    const lectureExists = await prisma.dosen.findUnique({
        where: { nip: data.nipKepalaLab },
    });

    if (data.nipKepalaLab && !lectureExists)
        invalidFields.push(
            generateErrorStructure(
                "nipKepalaLab",
                "Kepala lab tidak ditemukan, sebagai dosen!"
            )
        );

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    await next();
}

export async function validateAssignKepalaLab(c: Context, next: Next) {
    const data: AssignKepalaLabDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.nama)
        invalidFields.push(
            generateErrorStructure("nama", "Nama kepala lab tidak boleh kosong")
        );
    if (!data.nip)
        invalidFields.push(
            generateErrorStructure("nip", "NIP kepala lab tidak boleh kosong")
        );

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    if (typeof data.nama !== "string")
        invalidFields.push(
            generateErrorStructure(
                "nama",
                "Nama kepala lab harus berupa string"
            )
        );
    if (typeof data.nip !== "string")
        invalidFields.push(
            generateErrorStructure("nip", "NIP kepala lab harus berupa string")
        );

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    await next();
}
