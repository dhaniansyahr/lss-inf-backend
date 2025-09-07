import { BIDANG_MINAT } from "@prisma/client";

export interface DosenDTO {
    id: string;
    nama: string;
    email: string;
    password: string;
    nip: string;
    bidangMinat: BIDANG_MINAT;
    userLevelId: string;
}

export interface DosenExcelDTO {
    NAMA: string;
    NIP: string;
    BIDANG_MINAT: string;
}
