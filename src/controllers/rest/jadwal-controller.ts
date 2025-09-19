import { Context, TypedResponse } from "hono";
import {
    handleServiceErrorWithResponse,
    response_created,
    response_success,
    response_bad_request,
} from "$utils/response.utils";
import { FilteringQueryV2 } from "$entities/Query";
import { checkFilteringQueryV2 } from "$controllers/helpers/CheckFilteringQuery";
import {
    JadwalDTO,
    JadwalMeetingDTO,
    ManualAssignMahasiswaDTO,
} from "$entities/jadwal-entities";
import * as JadwalService from "$services/jadwal-service";

export async function create(c: Context): Promise<TypedResponse> {
    const data: JadwalDTO = await c.req.json();

    const serviceResponse = await JadwalService.create(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Berhasil membuat jadwal baru!"
    );
}

export async function getAll(c: Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c);

    const serviceResponse = await JadwalService.getAll(filters);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil semua jadwal!"
    );
}

export async function getById(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");

    const serviceResponse = await JadwalService.getById(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil jadwal by id!"
    );
}

export async function update(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");
    const data: JadwalDTO = await c.req.json();

    const serviceResponse = await JadwalService.update(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil Memperbaharui Jadwal!"
    );
}

export async function updateMeeting(c: Context): Promise<TypedResponse> {
    const data: JadwalMeetingDTO = await c.req.json();
    const id = c.req.param("id");

    const serviceResponse = await JadwalService.updateMeeting(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil Memperbaharui Pertemuan pada Jadwal!"
    );
}

export async function manualAssignMahasiswa(
    c: Context
): Promise<TypedResponse> {
    const data: ManualAssignMahasiswaDTO = await c.req.json();
    const id = c.req.param("id");

    const serviceResponse = await JadwalService.manualAssignMahasiswa(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil Memperbaharui Mahasiswa pada Jadwal!"
    );
}

export async function bulkUploadTheorySchedule(
    c: Context
): Promise<TypedResponse> {
    const bodyData = await c.req.parseBody();
    const file = bodyData.file as File;

    if (!file) {
        return response_bad_request(c, "File Excel wajib diisi");
    }

    // Check file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        return response_bad_request(
            c,
            "File harus berupa file Excel (.xlsx atau .xls)"
        );
    }

    // Check file size (5MB limit for Excel files)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
        return response_bad_request(c, "Ukuran file harus kurang dari 5MB");
    }

    const serviceResponse = await JadwalService.bulkUploadTheory(file);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Berhasil memproses file Excel!"
    );
}

export async function checkTheoryScheduleExists(
    c: Context
): Promise<TypedResponse> {
    const serviceResponse = await JadwalService.checkHasJadwalTheory();

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Berhasil memeriksa jadwal teori!"
    );
}

export async function deleteAll(c: Context): Promise<TypedResponse> {
    const serviceResponse = await JadwalService.deleteAll();

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Berhasil menghapus semua jadwal!"
    );
}

export async function generateSchedule(c: Context): Promise<TypedResponse> {
    const serviceResponse = await JadwalService.generateSchedule();

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil membuat jadwal untuk semua mata kuliah yang tersedia!"
    );
}

export async function bulkUploadMahasiswa(c: Context): Promise<TypedResponse> {
    const jadwalId = c.req.param("id");
    const bodyData = await c.req.parseBody();
    const file = bodyData.file as File;

    if (!file) {
        return response_bad_request(c, "File Excel wajib diisi");
    }

    // Check file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        return response_bad_request(
            c,
            "File harus berupa file Excel (.xlsx atau .xls)"
        );
    }

    // Check file size (5MB limit for Excel files)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
        return response_bad_request(c, "Ukuran file harus kurang dari 5MB");
    }

    const serviceResponse = await JadwalService.bulkUpload(jadwalId, file);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Berhasil mengassign mahasiswa ke jadwal!"
    );
}

export async function getListMeetings(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");

    const serviceResponse = await JadwalService.getListMeetings(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil list pertemuan!"
    );
}
