export interface TodayScheduleForAttendance {
    id: string;
    hari: string;
    kelas: string;
    shift: {
        id: string;
        startTime: string;
        endTime: string;
    };
    ruangan: {
        id: string;
        nama: string;
        lokasi: string;
    };
    matakuliah: {
        id: string;
        nama: string;
        kode: string;
    };
    meeting?: {
        id: string;
        tanggal: Date;
        pertemuan: number;
    };
    attendanceCount: number;
    totalParticipants: number;
    hasAttendance: boolean;
}

export interface RecordAttendanceDTO {
    identity: string;
    meetingId: string;
    type: "DOSEN" | "MAHASISWA" | "ASISTEN_LAB";
}

export interface Participats {
    id: string;
    name: string;
    noIdentitas: string;
    type: "DOSEN" | "MAHASISWA" | "ASISTEN_LAB";
    meetings: {
        [key: string]: string | boolean;
    };
}
