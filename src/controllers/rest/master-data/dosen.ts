import { checkFilteringQueryV2 } from "$controllers/helpers/CheckFilteringQuery";
import { FilteringQueryV2 } from "$entities/Query";
import {
    handleServiceErrorWithResponse,
    response_bad_request,
    response_created,
    response_success,
} from "$utils/response.utils";
import { Context, TypedResponse } from "hono";
import * as DosenService from "$services/master-data/dosen";
import { DosenDTO } from "$entities/master-data/dosen";

// Dosen
export async function create(c: Context): Promise<TypedResponse> {
    const data: DosenDTO = await c.req.json();

    const serviceResponse = await DosenService.create(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Berhasil membuat dosen baru!"
    );
}

export async function getAll(c: Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c);

    const serviceResponse = await DosenService.getAll(filters);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil semua dosen!"
    );
}

export async function getById(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");

    const serviceResponse = await DosenService.getById(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil dosen by id!"
    );
}

export async function update(c: Context): Promise<TypedResponse> {
    const data: DosenDTO = await c.req.json();
    const id = c.req.param("id");

    const serviceResponse = await DosenService.update(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengupdate dosen!"
    );
}

export async function deleteByIds(c: Context): Promise<TypedResponse> {
    const ids = c.req.query("ids") as string;

    const serviceResponse = await DosenService.deleteByIds(ids);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil menghapus dosen!"
    );
}

export async function bulkUpload(c: Context): Promise<TypedResponse> {
    const dataBody = await c.req.parseBody();

    const file = dataBody.file as File;

    if (!file) {
        return response_bad_request(c, "File is required");
    }

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        return response_bad_request(
            c,
            "File must be an Excel file (.xlsx or .xls)"
        );
    }

    if (file.size > 5 * 1024 * 1024) {
        return response_bad_request(c, "File size must be less than 5MB");
    }

    const serviceResponse = await DosenService.bulkUpload(file);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Berhasil mengupload dosen!"
    );
}
