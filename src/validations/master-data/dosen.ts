import { DosenDTO } from "$entities/master-data/dosen";
import { response_bad_request } from "$utils/response.utils";
import { ErrorStructure, generateErrorStructure } from "$validations/helper";
import { Context, Next } from "hono";

export async function validateDosen(c: Context, next: Next) {
    const data: DosenDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.nama)
        invalidFields.push(
            generateErrorStructure("nama", "Nama dosen tidak boleh kosong")
        );
    if (!data.nip)
        invalidFields.push(
            generateErrorStructure("nip", "NIP dosen tidak boleh kosong")
        );
    if (data.nip.length !== 16)
        invalidFields.push(
            generateErrorStructure("nip", "NIP dosen harus 16 digit")
        );
    if (!data.email)
        invalidFields.push(
            generateErrorStructure("email", "Email dosen tidak boleh kosong")
        );
    if (!data.password)
        invalidFields.push(
            generateErrorStructure(
                "password",
                "Password dosen tidak boleh kosong"
            )
        );
    if (!data.bidangMinat)
        invalidFields.push(
            generateErrorStructure(
                "bidangMinat",
                "Bidang minat dosen tidak boleh kosong"
            )
        );

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    if (typeof data.nama !== "string")
        invalidFields.push(
            generateErrorStructure("nama", "Nama dosen harus berupa string")
        );
    if (typeof data.nip !== "string")
        invalidFields.push(
            generateErrorStructure("nip", "NIP dosen harus berupa string")
        );
    if (typeof data.email !== "string")
        invalidFields.push(
            generateErrorStructure("email", "Email dosen harus berupa string")
        );
    if (typeof data.password !== "string")
        invalidFields.push(
            generateErrorStructure(
                "password",
                "Password dosen harus berupa string"
            )
        );
    if (typeof data.bidangMinat !== "string")
        invalidFields.push(
            generateErrorStructure(
                "bidangMinat",
                "Bidang minat dosen harus berupa string"
            )
        );

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    await next();
}
