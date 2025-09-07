export interface RuanganDTO {
    id: string;
    nama: string;
    lokasi: string;
    namaKepalaLab: string;
    nipKepalaLab: string;
    histroyKepalaLabId: string;
    kapasitas: number;
    isLab: boolean;
}

export interface AssignKepalaLabDTO {
    id: string;
    nama: string;
    nip: string;
}
