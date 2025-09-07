export interface MahasiswaDTO {
    id: string;
    nama: string;
    npm: string;
    semester: number;
    password: string;
    tahunMasuk: number;
    isActive: boolean;
    userLevelId: string;
}

export interface MahasiswaExcelDTO {
    NPM: string;
    NAMA: string;
    SEMESTER: number;
    TAHUN_MASUK: number;
    IS_ACTIVE: boolean;
}
