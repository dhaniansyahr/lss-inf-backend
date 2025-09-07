import { Context, TypedResponse } from "hono";
import * as AclService from "$services/AclService";
import {
    handleServiceErrorWithResponse,
    response_created,
    response_success,
} from "$utils/response.utils";
import { AclDTO } from "$entities/Acl";
import { UserJWTDAO } from "$entities/User";

export async function create(c: Context): Promise<TypedResponse> {
    const data: AclDTO = await c.req.json();

    const serviceResponse = await AclService.create(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Berhasil membuat access control list baru!"
    );
}

export async function getByUserLevelId(c: Context): Promise<TypedResponse> {
    const userLevelId = c.req.param("userLevelId");

    const serviceResponse = await AclService.getAclByUserLevelId(userLevelId);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil access control list berdasarkan user level id!"
    );
}

export async function update(c: Context): Promise<TypedResponse> {
    const data: AclDTO = await c.req.json();

    const serviceResponse = await AclService.update(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil memperbarui access control list!"
    );
}

export async function getAllFeatures(c: Context): Promise<TypedResponse> {
    const serviceResponse = await AclService.getAllFeatures();

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil semua fitur!"
    );
}

export async function getAccess(c: Context) {
    const user: UserJWTDAO = await c.get("jwtPayload");
    const featureName = c.req.param("featureName");

    const serviceResponse = await AclService.getAccess(user, featureName);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil access control list berdasarkan fitur!"
    );
}
