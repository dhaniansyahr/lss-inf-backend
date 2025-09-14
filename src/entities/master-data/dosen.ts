import { BIDANG_MINAT } from "@prisma/client";

export interface DosenDTO {
    nama: string;
    email: string;
    password: string;
    nip: string;
    bidangMinat: BIDANG_MINAT;
}

export interface DosenExcelDTO {
    NAMA: string;
    NIP: string;
    BIDANG_MINAT: string;
    EMAIL: string;
    PASSWORD: string;
}
