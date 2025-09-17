import { Context, TypedResponse } from "hono";
import {
    handleServiceErrorWithResponse,
    response_success,
} from "$utils/response.utils";
import * as AbsensiService from "$services/absensi-service";
import { UserJWTDAO } from "$entities/User";
import { RecordAttendanceDTO } from "$entities/Absensi";

export async function getTodaySchedule(c: Context): Promise<TypedResponse> {
    const user: UserJWTDAO = await c.get("jwtPayload");

    const serviceResponse = await AbsensiService.getTodaySchedule(user);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil jadwal hari ini!"
    );
}

export async function create(c: Context): Promise<TypedResponse> {
    const data: RecordAttendanceDTO = await c.req.json();

    const serviceResponse = await AbsensiService.recordAttendance(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mencatat absensi!"
    );
}

export async function getById(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");

    const serviceResponse = await AbsensiService.getById(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil list absensi!"
    );
}
