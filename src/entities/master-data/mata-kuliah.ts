import { BIDANG_MINAT, TYPE_MATKUL } from "@prisma/client";

export interface MatakuliahDTO {
    id: string;
    nama: string;
    kode: string;
    type: TYPE_MATKUL;
    sks: number;
    bidangMinat: BIDANG_MINAT;
    isTeori: boolean;
    semester: number;
}

export interface MatakuliahExcelDTO {
    KODE: string;
    NAMA: string;
    TYPE: string;
    SKS: number;
    BIDANG_MINAT: string;
    SEMESTER: number;
    IS_TEORI: string;
}
