import { DosenDTO } from "$entities/master-data/dosen";
import { prisma } from "$utils/prisma.utils";
import { response_bad_request } from "$utils/response.utils";
import { checkUskEmail } from "$utils/strings.utils";
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

    if (data.nip.length < 16 || data.nip.length > 18) {
        invalidFields.push(
            generateErrorStructure(
                "nip",
                "Periksa panjang nip yang anda masukan harus antara 16 - 18 digits"
            )
        );
    }

    if (!checkUskEmail(data.email)) {
        invalidFields.push(
            generateErrorStructure(
                "email",
                "Mohon masukan email dengan format usk, ex: ...@usk.ac.id"
            )
        );
    }

    const nipExist = await prisma.dosen.findUnique({
        where: { nip: data.nip },
    });

    if (nipExist) {
        invalidFields.push(
            generateErrorStructure("nip", "NIP dosen sudah terdaftar")
        );
    }

    const emailExist = await prisma.dosen.findUnique({
        where: { email: data.email },
    });

    if (emailExist) {
        invalidFields.push(
            generateErrorStructure("email", "Email dosen sudah terdaftar")
        );
    }

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    await next();
}

export async function validateDosenUpdate(c: Context, next: Next) {
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

    if (data.nip.length < 16 || data.nip.length > 18) {
        invalidFields.push(
            generateErrorStructure(
                "nip",
                "Periksa panjang nip yang anda masukan harus antara 16 - 18 digits"
            )
        );
    }

    if (!checkUskEmail(data.email)) {
        invalidFields.push(
            generateErrorStructure(
                "email",
                "Mohon masukan email dengan format usk, ex: ...@usk.ac.id"
            )
        );
    }

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    await next();
}
