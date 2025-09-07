import { Context, TypedResponse } from "hono";
import {
    handleServiceErrorWithResponse,
    response_created,
    response_success,
} from "$utils/response.utils";
import { FilteringQueryV2 } from "$entities/Query";
import { checkFilteringQueryV2 } from "$controllers/helpers/CheckFilteringQuery";
import { ShiftDTO } from "$entities/master-data/shift";
import * as ShiftService from "$services/master-data/shift";

export async function create(c: Context): Promise<TypedResponse> {
    const data: ShiftDTO = await c.req.json();

    const serviceResponse = await ShiftService.create(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Berhasil membuat shift baru!"
    );
}

export async function getAll(c: Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c);

    const serviceResponse = await ShiftService.getAll(filters);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil semua shift!"
    );
}

export async function getById(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");

    const serviceResponse = await ShiftService.getById(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil shift by id!"
    );
}

export async function update(c: Context): Promise<TypedResponse> {
    const data: ShiftDTO = await c.req.json();
    const id = c.req.param("id");

    const serviceResponse = await ShiftService.update(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengupdate shift!"
    );
}

export async function deleteByIds(c: Context): Promise<TypedResponse> {
    const ids = c.req.query("ids") as string;

    const serviceResponse = await ShiftService.deleteByIds(ids);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil menghapus shift!"
    );
}

export async function activate(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");
    const data: { isActive: boolean } = await c.req.json();

    const serviceResponse = await ShiftService.activatedShift(
        id,
        data.isActive
    );

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengaktifkan ruangan!"
    );
}
