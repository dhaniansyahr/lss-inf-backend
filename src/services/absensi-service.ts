import { Participats, RecordAttendanceDTO } from "$entities/Absensi";
import {
    BadRequestWithMessage,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import { UserJWTDAO } from "$entities/User";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Absensi } from "@prisma/client";
import { DateTime } from "luxon";
import { ulid } from "ulid";

type AbsentResponse = Absensi[] | {};
export async function getTodaySchedule(
    user: UserJWTDAO
): Promise<ServiceResponse<AbsentResponse>> {
    try {
        const today = DateTime.now().toFormat("yyyy-MM-dd");

        // Get Jadwal
        const jadwal = await prisma.meeting.findMany({
            where: {
                OR: [
                    {
                        jadwal: {
                            jadwalDosen: {
                                some: {
                                    dosenId: user.id,
                                },
                            },
                        },
                    },
                    {
                        jadwal: {
                            jadwalMahasiswa: {
                                some: {
                                    mahasiswaId: user.id,
                                },
                            },
                        },
                    },
                    {
                        jadwal: {
                            jadwalAsistenLab: {
                                some: {
                                    asistenLabId: user.id,
                                },
                            },
                        },
                    },
                ],
                AND: [
                    {
                        tanggal: today,
                    },
                ],
            },
            include: {
                jadwal: {
                    include: {
                        matakuliah: true,
                        shift: true,
                        ruangan: true,
                    },
                },
            },
        });

        if (jadwal.length === 0)
            return BadRequestWithMessage("Jadwal Tidak ditemukan!");

        return {
            status: true,
            data: jadwal,
        };
    } catch (err) {
        Logger.error(
            `AttendanceService.getTodaySchedulesForAttendance : ${err}`
        );
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

type AttendanceResponse = Absensi | {};
export async function recordAttendance(
    data: RecordAttendanceDTO
): Promise<ServiceResponse<AttendanceResponse>> {
    try {
        const { identity, meetingId, type } = data;

        let absentExist: Absensi | null = null;

        switch (type) {
            case "MAHASISWA":
                const mahasiswa = await prisma.mahasiswa.findUnique({
                    where: { npm: identity },
                });

                if (!mahasiswa) {
                    return BadRequestWithMessage("Mahasiswa tidak ditemukan!");
                }

                absentExist = await prisma.absensi.findUnique({
                    where: {
                        mahasiswaId_meetingId: {
                            mahasiswaId: mahasiswa.id,
                            meetingId,
                        },
                    },
                });

                if (absentExist) {
                    return updateAttendance(
                        identity,
                        meetingId,
                        !absentExist.isPresent,
                        "MAHASISWA"
                    );
                } else {
                    return createAttendance(identity, meetingId, "MAHASISWA");
                }

            case "DOSEN":
                const dosen = await prisma.dosen.findUnique({
                    where: { nip: identity },
                });

                if (!dosen) {
                    return BadRequestWithMessage("Dosen tidak ditemukan!");
                }

                absentExist = await prisma.absensi.findFirst({
                    where: { dosenId: dosen.id, meetingId: meetingId },
                });

                if (absentExist) {
                    return updateAttendance(
                        identity,
                        meetingId,
                        !absentExist.isPresent,
                        "DOSEN"
                    );
                } else {
                    return createAttendance(identity, meetingId, "DOSEN");
                }

            case "ASISTEN_LAB":
                const asistenLab = await prisma.asistenLab.findFirst({
                    where: {
                        mahasiswa: {
                            npm: identity,
                        },
                    },
                });

                if (!asistenLab) {
                    return BadRequestWithMessage(
                        "Asisten Lab tidak ditemukan!"
                    );
                }

                absentExist = await prisma.absensi.findFirst({
                    where: {
                        mahasiswaId: asistenLab.mahasiswaId,
                        meetingId: meetingId,
                    },
                });

                if (absentExist) {
                    return updateAttendance(
                        identity,
                        meetingId,
                        !absentExist.isPresent,
                        "ASISTEN_LAB"
                    );
                } else {
                    return createAttendance(identity, meetingId, "ASISTEN_LAB");
                }

            default:
                return BadRequestWithMessage("Tipe absen tidak valid!");
        }
    } catch (error) {
        Logger.error(`AttendanceService.recordAttendance : ${error}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

type CreateAbsentResponse = Absensi | {};
export async function createAttendance(
    identity: string,
    meetingId: string,
    type: "MAHASISWA" | "DOSEN" | "ASISTEN_LAB"
): Promise<ServiceResponse<CreateAbsentResponse>> {
    try {
        let absent = {};

        if (type === "MAHASISWA") {
            const mahasiswa = await prisma.mahasiswa.findUnique({
                where: { npm: identity },
            });

            if (!mahasiswa)
                return BadRequestWithMessage("Mahasiswa tidak ditemukan!");

            const meeting = await prisma.meeting.findUnique({
                where: { id: meetingId },
            });

            if (!meeting)
                return BadRequestWithMessage("Meeting tidak ditemukan!");

            absent = await prisma.absensi.create({
                data: {
                    id: ulid(),
                    mahasiswaId: mahasiswa.id,
                    meetingId,
                    isPresent: true,
                    waktuAbsen: DateTime.now().toJSDate(),
                    keterangan: `Absen ke-${
                        meeting.pertemuan
                    } pada ${DateTime.now().toFormat("dd MMMM yyyy HH:mm:ss")}`,
                },
            });
        } else if (type === "DOSEN") {
            const dosen = await prisma.dosen.findUnique({
                where: { nip: identity },
            });

            if (!dosen) return BadRequestWithMessage("Dosen tidak ditemukan!");

            const meeting = await prisma.meeting.findUnique({
                where: { id: meetingId },
            });

            if (!meeting)
                return BadRequestWithMessage("Meeting tidak ditemukan!");

            absent = await prisma.absensi.create({
                data: {
                    id: ulid(),
                    dosenId: dosen.id,
                    meetingId,
                    isPresent: true,
                    waktuAbsen: DateTime.now().toJSDate(),
                    keterangan: `Absen ke-${
                        meeting.pertemuan
                    } pada ${DateTime.now().toFormat("dd MMMM yyyy HH:mm:ss")}`,
                },
            });
        } else if (type === "ASISTEN_LAB") {
            const asistenLab = await prisma.asistenLab.findFirst({
                where: { mahasiswa: { npm: identity } },
            });

            if (!asistenLab)
                return BadRequestWithMessage("Asisten Lab tidak ditemukan!");

            const meeting = await prisma.meeting.findUnique({
                where: { id: meetingId },
            });

            if (!meeting)
                return BadRequestWithMessage("Meeting tidak ditemukan!");

            absent = await prisma.absensi.create({
                data: {
                    id: ulid(),
                    mahasiswaId: asistenLab.mahasiswaId,
                    meetingId,
                    isPresent: true,
                    waktuAbsen: DateTime.now().toJSDate(),
                    keterangan: `Absen ke-${
                        meeting.pertemuan
                    } pada ${DateTime.now().toFormat("dd MMMM yyyy HH:mm:ss")}`,
                },
            });
        } else {
            return BadRequestWithMessage("Tipe absen tidak valid!");
        }

        return {
            status: true,
            data: absent,
        };
    } catch (error) {
        Logger.error(`AttendanceService.createAttendance : ${error}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

type UpdateAbsentResponse = Absensi | {};
export async function updateAttendance(
    identity: string,
    meetingId: string,
    isPresent: boolean,
    type: "MAHASISWA" | "DOSEN" | "ASISTEN_LAB"
): Promise<ServiceResponse<UpdateAbsentResponse>> {
    try {
        let absent = {};

        if (type === "MAHASISWA") {
            const mahasiswa = await prisma.mahasiswa.findUnique({
                where: { npm: identity },
            });

            if (!mahasiswa)
                return BadRequestWithMessage("Mahasiswa tidak ditemukan!");

            const meeting = await prisma.meeting.findUnique({
                where: { id: meetingId },
            });

            if (!meeting)
                return BadRequestWithMessage("Meeting tidak ditemukan!");

            const absensi = await prisma.absensi.findFirst({
                where: { mahasiswaId: mahasiswa.id, meetingId: meetingId },
            });

            if (!absensi)
                return BadRequestWithMessage("Absensi tidak ditemukan!");

            absent = await prisma.absensi.update({
                where: { id: absensi.id },
                data: {
                    isPresent,
                    waktuAbsen: DateTime.now().toJSDate(),
                    keterangan: `Absen ke-${
                        meeting.pertemuan
                    } di perbaharui pada ${DateTime.now().toFormat(
                        "dd MMMM yyyy HH:mm:ss"
                    )}`,
                },
            });
        } else if (type === "DOSEN") {
            const dosen = await prisma.dosen.findUnique({
                where: { nip: identity },
            });

            if (!dosen) return BadRequestWithMessage("Dosen tidak ditemukan!");

            const meeting = await prisma.meeting.findUnique({
                where: { id: meetingId },
            });

            if (!meeting)
                return BadRequestWithMessage("Meeting tidak ditemukan!");

            const absensi = await prisma.absensi.findFirst({
                where: { dosenId: dosen.id, meetingId: meetingId },
            });

            if (!absensi)
                return BadRequestWithMessage("Absensi tidak ditemukan!");

            absent = await prisma.absensi.update({
                where: { id: absensi.id },
                data: {
                    isPresent,
                    waktuAbsen: DateTime.now().toJSDate(),
                    keterangan: `Absen ke-${
                        meeting.pertemuan
                    } di perbaharui pada ${DateTime.now().toFormat(
                        "dd MMMM yyyy HH:mm:ss"
                    )}`,
                },
            });
        } else if (type === "ASISTEN_LAB") {
            const asistenLab = await prisma.asistenLab.findFirst({
                where: { mahasiswa: { npm: identity } },
            });

            if (!asistenLab)
                return BadRequestWithMessage("Asisten Lab tidak ditemukan!");

            const meeting = await prisma.meeting.findUnique({
                where: { id: meetingId },
            });

            if (!meeting)
                return BadRequestWithMessage("Meeting tidak ditemukan!");

            const absensi = await prisma.absensi.findFirst({
                where: {
                    mahasiswaId: asistenLab.mahasiswaId,
                    meetingId: meetingId,
                },
            });

            if (!absensi)
                return BadRequestWithMessage("Absensi tidak ditemukan!");

            absent = await prisma.absensi.update({
                where: { id: absensi.id },
                data: {
                    isPresent,
                    waktuAbsen: DateTime.now().toJSDate(),
                    keterangan: `Absen ke-${
                        meeting.pertemuan
                    } di perbaharui pada ${DateTime.now().toFormat(
                        "dd MMMM yyyy HH:mm:ss"
                    )}`,
                },
            });
        } else {
            return BadRequestWithMessage("Tipe absen tidak valid!");
        }

        return {
            status: true,
            data: absent,
        };
    } catch (error) {
        Logger.error(`AttendanceService.createAttendance : ${error}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function getById(id: string): Promise<ServiceResponse<{}>> {
    try {
        const meetings = await prisma.meeting.findMany({
            where: {
                jadwalId: id,
            },
        });

        if (!meetings)
            return BadRequestWithMessage("Pertemuan Tidak Ditemukan!");

        const jadwal = await prisma.jadwal.findUnique({
            where: { id },
            include: {
                jadwalDosen: {
                    include: {
                        dosen: true,
                    },
                },
                jadwalAsistenLab: {
                    include: {
                        asistenLab: {
                            include: {
                                mahasiswa: true,
                            },
                        },
                    },
                },
                jadwalMahasiswa: {
                    include: {
                        mahasiswa: true,
                    },
                },
            },
        });

        if (!jadwal) return BadRequestWithMessage("Jadwal Tidak Ditemukan!");

        const participants: Participats[] = [];

        jadwal.jadwalDosen.forEach((item) => {
            participants.push({
                id: item.dosen.id,
                name: item.dosen.nama,
                noIdentitas: item.dosen.nip,
                type: "DOSEN",
            });
        });

        jadwal.jadwalAsistenLab.forEach((item) => {
            participants.push({
                id: item.asistenLab.id,
                name: item.asistenLab.mahasiswa.nama,
                noIdentitas: item.asistenLab.mahasiswa.npm,
                type: "ASISTEN_LAB",
            });
        });

        jadwal.jadwalMahasiswa.forEach((item) => {
            participants.push({
                id: item.mahasiswa.id,
                name: item.mahasiswa.nama,
                noIdentitas: item.mahasiswa.npm,
                type: "MAHASISWA",
            });
        });

        return {
            status: true,
            data: {
                meetings,
                participants,
            },
        };
    } catch (err) {
        Logger.error(`DosenService.getById : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
