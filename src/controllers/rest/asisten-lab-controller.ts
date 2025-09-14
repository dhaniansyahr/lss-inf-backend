import { Context, TypedResponse } from "hono";
import * as PendaftaranAsistenLabService from "$services/asisten-lab-service";
import {
    handleServiceErrorWithResponse,
    response_created,
    response_success,
} from "$utils/response.utils";
import { FilteringQueryV2 } from "$entities/Query";
import { checkFilteringQueryV2 } from "$controllers/helpers/CheckFilteringQuery";
import { UserJWTDAO } from "$entities/User";
import {
    AssignAsistenLabDTO,
    PendaftaranAsistenLabDTO,
    PenerimaanAsistenDTO,
} from "$entities/asisten-lab";

export async function create(c: Context): Promise<TypedResponse> {
    const data: PendaftaranAsistenLabDTO = await c.req.json();

    const serviceResponse = await PendaftaranAsistenLabService.create(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Berhasil mendaftar sebagai asisten lab!"
    );
}

export async function getAll(c: Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c);
    const user: UserJWTDAO = c.get("jwtPayload");

    const serviceResponse = await PendaftaranAsistenLabService.getAll(
        filters,
        user
    );

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil semua pendaftaran asisten lab!"
    );
}

export async function getAllAsisten(c: Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c);

    const serviceResponse = await PendaftaranAsistenLabService.getAllAsisten(
        filters
    );

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil semua pendaftaran asisten lab!"
    );
}

export async function update(c: Context): Promise<TypedResponse> {
    const data: PendaftaranAsistenLabDTO = await c.req.json();
    const id = c.req.param("id");

    const serviceResponse = await PendaftaranAsistenLabService.update(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil memperbarui pendaftaran asisten lab!"
    );
}

export async function penerimaanAsistenLab(c: Context): Promise<TypedResponse> {
    const data: PenerimaanAsistenDTO = await c.req.json();
    const id = c.req.param("id");

    const serviceResponse =
        await PendaftaranAsistenLabService.penerimaanAsistenLab(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil memperbaharui pendaftaran asisten lab!"
    );
}

export async function assignAsistenLab(c: Context) {
    const data: AssignAsistenLabDTO = await c.req.json();
    const id = c.req.param("id");

    const serviceResponse = await PendaftaranAsistenLabService.assignAsistenLab(
        id,
        data
    );

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil menugaskan asisten lab!"
    );
}
