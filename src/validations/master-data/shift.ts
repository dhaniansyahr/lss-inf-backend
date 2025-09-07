import { ShiftDTO } from "$entities/master-data/shift";
import { response_bad_request } from "$utils/response.utils";
import { ErrorStructure, generateErrorStructure } from "$validations/helper";
import { Context, Next } from "hono";

export async function validateShift(c: Context, next: Next) {
    const data: ShiftDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.startTime)
        invalidFields.push(
            generateErrorStructure(
                "startTime",
                "Waktu mulai tidak boleh kosong"
            )
        );
    if (!data.endTime)
        invalidFields.push(
            generateErrorStructure(
                "endTime",
                "Waktu selesai tidak boleh kosong"
            )
        );

    if (data.startTime >= data.endTime)
        invalidFields.push(
            generateErrorStructure(
                "startTime",
                "startTime harus sebelum endTime"
            )
        );

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);

    if (typeof data.startTime !== "string")
        invalidFields.push(
            generateErrorStructure(
                "startTime",
                "Waktu mulai dan waktu selesai harus berupa string"
            )
        );

    if (typeof data.endTime !== "string")
        invalidFields.push(
            generateErrorStructure(
                "endTime",
                "Waktu selesai harus berupa string"
            )
        );

    await next();
}
