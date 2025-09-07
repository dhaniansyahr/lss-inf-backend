import { HARI } from "@prisma/client";

export interface JadwalDTO {
    id: string;
    hari: HARI;
    shiftId: string;
    ruanganId: string;
    isOverride: boolean;
    kelas: string;
    matakuliahId: string;
    dosenIds: string[];
    asistenLabIds?: string[];
    mahasiswaIds?: string[];
}

export interface OverrideJadwalDTO {
    id: string;
    jadwalId: string;
    message: string;
}

export interface JadwalExcelRowDTO {
    Kode: string;
    Nama: string;
    Kelas: string;
    "Koordinator Kelas": string;
    Ruang: string;
    Hari: string;
    Waktu: string;
}

export interface JadwalMeetingDTO {
    meetingId: string;
    tanggal: string;
}
