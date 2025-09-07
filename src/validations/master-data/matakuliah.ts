import { generateErrorStructure } from "$validations/helper";
import { MatakuliahDTO } from "$entities/master-data/mata-kuliah";
import { ErrorStructure } from "$validations/helper";
import { Context, Next } from "hono";
import { response_bad_request } from "$utils/response.utils";

export async function validateMatakuliah(c: Context, next: Next) {
    const data: MatakuliahDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.nama)
        invalidFields.push(
            generateErrorStructure("nama", "Nama matakuliah tidak boleh kosong")
        );
    if (!data.kode)
        invalidFields.push(
            generateErrorStructure("kode", "Kode matakuliah tidak boleh kosong")
        );
    if (!data.sks)
        invalidFields.push(
            generateErrorStructure("sks", "SKS matakuliah tidak boleh kosong")
        );
    if (!data.semester)
        invalidFields.push(
            generateErrorStructure(
                "semester",
                "Semester matakuliah tidak boleh kosong"
            )
        );
    if (!data.type)
        invalidFields.push(
            generateErrorStructure("type", "Type matakuliah tidak boleh kosong")
        );
    if (!data.bidangMinat)
        invalidFields.push(
            generateErrorStructure(
                "bidangMinat",
                "Bidang minat matakuliah tidak boleh kosong"
            )
        );

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    if (typeof data.nama !== "string")
        invalidFields.push(
            generateErrorStructure(
                "nama",
                "Nama matakuliah harus berupa string"
            )
        );
    if (typeof data.kode !== "string")
        invalidFields.push(
            generateErrorStructure(
                "kode",
                "Kode matakuliah harus berupa string"
            )
        );
    if (typeof data.sks !== "number")
        invalidFields.push(
            generateErrorStructure("sks", "SKS matakuliah harus berupa number")
        );
    if (typeof data.semester !== "number")
        invalidFields.push(
            generateErrorStructure(
                "semester",
                "Semester matakuliah harus berupa number"
            )
        );
    if (typeof data.type !== "string")
        invalidFields.push(
            generateErrorStructure(
                "type",
                "Type matakuliah harus berupa string"
            )
        );
    if (typeof data.bidangMinat !== "string")
        invalidFields.push(
            generateErrorStructure(
                "bidangMinat",
                "Bidang minat matakuliah harus berupa string"
            )
        );

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    await next();
}
