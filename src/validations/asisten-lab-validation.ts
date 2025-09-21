import { Context, Next } from "hono";
import { response_bad_request } from "$utils/response.utils";
import { ErrorStructure, generateErrorStructure } from "./helper";
import { ASISTEN_LAB_STATUS, NILAI_MATAKULIAH } from "@prisma/client";
import {
    AssignAsistenLabDTO,
    PendaftaranAsistenLabDTO,
    PenerimaanAsistenDTO,
} from "$entities/asisten-lab";

export async function validatePendaftaranAsistenLab(c: Context, next: Next) {
    const data: PendaftaranAsistenLabDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.mahasiswaId)
        invalidFields.push(
            generateErrorStructure(
                "mahasiswaId",
                "mahasiswaId tidak boleh kosong"
            )
        );

    if (!data.jadwalId)
        invalidFields.push(
            generateErrorStructure("jadwalId", "jadwalId tidak boleh kosong")
        );

    if (!data.nilaiTeori)
        invalidFields.push(
            generateErrorStructure(
                "nilaiTeori",
                "nilaiTeori tidak boleh kosong"
            )
        );

    if (!data.nilaiPraktikum)
        invalidFields.push(
            generateErrorStructure(
                "nilaiPraktikum",
                "nilaiPraktikum tidak boleh kosong"
            )
        );

    if (!data.nilaiAkhir)
        invalidFields.push(
            generateErrorStructure(
                "nilaiAkhir",
                "nilaiAkhir tidak boleh kosong"
            )
        );

    if (!Object.values(NILAI_MATAKULIAH).includes(data.nilaiTeori))
        invalidFields.push(
            generateErrorStructure(
                "nilaiTeori",
                "nilaiTeori tidak valid, diharapkan: A, AB, B, BC, C, D, E"
            )
        );

    if (!Object.values(NILAI_MATAKULIAH).includes(data.nilaiPraktikum))
        invalidFields.push(
            generateErrorStructure(
                "nilaiPraktikum",
                "nilaiPraktikum tidak valid, diharapkan: A, AB, B, BC, C, D, E"
            )
        );

    if (!Object.values(NILAI_MATAKULIAH).includes(data.nilaiAkhir))
        invalidFields.push(
            generateErrorStructure(
                "nilaiAkhir",
                "nilaiAkhir tidak valid, diharapkan: A, AB, B, BC, C, D, E"
            )
        );

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    await next();
}

export async function validatePenerimaanAsistenLab(c: Context, next: Next) {
    const data: PenerimaanAsistenDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.status)
        invalidFields.push(
            generateErrorStructure("status", "status tidak boleh kosong")
        );

    if (data.status === ASISTEN_LAB_STATUS.DITOLAK && !data.keterangan)
        invalidFields.push(
            generateErrorStructure(
                "keterangan",
                "keterangan tidak boleh kosong"
            )
        );

    if (
        data.status !== ASISTEN_LAB_STATUS.DITOLAK &&
        data.status !== ASISTEN_LAB_STATUS.DISETUJUI
    )
        invalidFields.push(
            generateErrorStructure(
                "status",
                "status tidak valid, diharapkan: DISETUJUI, DITOLAK"
            )
        );

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    await next();
}

export async function validateAssignAsistenLab(c: Context, next: Next) {
    const data: AssignAsistenLabDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.asistenIds)
        invalidFields.push(
            generateErrorStructure(
                "asistenIds",
                "asistenIds harus berupa array string"
            )
        );

    if (data.asistenIds.length === 0)
        invalidFields.push(
            generateErrorStructure(
                "asistenIds",
                "asistenIds harus berupa array string"
            )
        );

    if (
        Array.isArray(data.asistenIds) &&
        data.asistenIds.some((id) => typeof id !== "string")
    )
        invalidFields.push(
            generateErrorStructure(
                "asistenIds",
                "asistenIds harus berupa array string"
            )
        );

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    await next();
}
