import { Context, TypedResponse } from "hono";
import {
    handleServiceErrorWithResponse,
    response_created,
    response_success,
} from "$utils/response.utils";
import { FilteringQueryV2 } from "$entities/Query";
import { checkFilteringQueryV2 } from "$controllers/helpers/CheckFilteringQuery";
import { AssignKepalaLabDTO, RuanganDTO } from "$entities/master-data/ruangan";
import * as RuanganService from "$services/master-data/ruangan";

export async function create(c: Context): Promise<TypedResponse> {
    const data: RuanganDTO = await c.req.json();

    const serviceResponse = await RuanganService.create(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Berhasil membuat ruangan baru!"
    );
}

export async function getAll(c: Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c);

    const serviceResponse = await RuanganService.getAll(filters);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil semua ruangan!"
    );
}

export async function getById(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");

    const serviceResponse = await RuanganService.getById(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil ruangan by id!"
    );
}

export async function update(c: Context): Promise<TypedResponse> {
    const data: RuanganDTO = await c.req.json();
    const id = c.req.param("id");

    const serviceResponse = await RuanganService.update(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengupdate ruangan!"
    );
}

export async function assignKepalaRuangan(c: Context): Promise<TypedResponse> {
    const data: AssignKepalaLabDTO = await c.req.json();
    const id = c.req.param("id");

    const serviceResponse = await RuanganService.assignKepalaLab(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil menugaskan kepala lab!"
    );
}

export async function deleteByIds(c: Context): Promise<TypedResponse> {
    const ids = c.req.query("ids") as string;

    const serviceResponse = await RuanganService.deleteByIds(ids);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil menghapus ruangan!"
    );
}

export async function activate(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");
    const data: { isActive: boolean } = await c.req.json();

    const serviceResponse = await RuanganService.activatedRoom(
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
