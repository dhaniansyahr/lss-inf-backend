import { MahasiswaDTO } from "$entities/master-data/mahasiswa";
import { prisma } from "$utils/prisma.utils";
import { response_bad_request } from "$utils/response.utils";
import { ErrorStructure, generateErrorStructure } from "$validations/helper";
import { Context, Next } from "hono";

export async function validateMahasiswa(c: Context, next: Next) {
    const data: MahasiswaDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.nama)
        invalidFields.push(
            generateErrorStructure("nama", "Nama mahasiswa tidak boleh kosong")
        );
    if (!data.npm)
        invalidFields.push(
            generateErrorStructure("npm", "NPM mahasiswa tidak boleh kosong")
        );
    if (data.npm.length !== 13)
        invalidFields.push(generateErrorStructure("npm", "NPM harus 13 digit"));

    if (!data.password)
        invalidFields.push(
            generateErrorStructure("password", "Password tidak boleh kosong")
        );
    if (!data.semester)
        invalidFields.push(
            generateErrorStructure("semester", "Semester  tidak boleh kosong")
        );

    if (!data.tahunMasuk)
        invalidFields.push(
            generateErrorStructure(
                "tahunMasuk",
                "Tahun masuk tidak boleh kosong"
            )
        );

    const npmExist = await prisma.mahasiswa.findUnique({
        where: { npm: data.npm },
    });

    if (npmExist) {
        invalidFields.push(
            generateErrorStructure("npm", "NPM sudah terdaftar")
        );
    }

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    await next();
}
