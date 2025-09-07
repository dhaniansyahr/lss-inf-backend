import {
    ServiceResponse,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { SEMESTER, ASISTEN_LAB_STATUS, HARI } from "@prisma/client";
import { getCurrentAcademicYear, isGanjilSemester } from "$utils/strings.utils";
import { SummaryCards } from "$entities/Dashboard";

type SummaryCardResponse = SummaryCards | {};

export async function getSummaryCards(): Promise<
    ServiceResponse<SummaryCardResponse>
> {
    try {
        const currentSemester = isGanjilSemester()
            ? SEMESTER.GANJIL
            : SEMESTER.GENAP;
        const currentYear = getCurrentAcademicYear();
        const today = new Date();
        const dayNames = [
            "MINGGU",
            "SENIN",
            "SELASA",
            "RABU",
            "KAMIS",
            "JUMAT",
            "SABTU",
        ];
        const todayName = dayNames[today.getDay()];

        const [
            totalStudents,
            totalDosen,
            totalCourses,
            totalActiveSchedules,
            todaySchedulesCount,
            pendingAssistantApplications,
        ] = await Promise.all([
            prisma.mahasiswa.count({ where: { isActive: true } }),
            prisma.dosen.count(),
            prisma.matakuliah.count(),
            prisma.jadwal.count({
                where: {
                    semester: currentSemester,
                    tahun: currentYear,
                    deletedAt: null,
                },
            }),
            prisma.jadwal.count({
                where: {
                    hari: todayName as HARI,
                    semester: currentSemester,
                    tahun: currentYear,
                    deletedAt: null,
                },
            }),
            prisma.pendaftaranAsistenLab.count({
                where: { status: ASISTEN_LAB_STATUS.PENDING },
            }),
        ]);

        const summaryData: SummaryCards = {
            totalStudents,
            totalDosen,
            totalCourses,
            totalActiveSchedules,
            todaySchedulesCount,
            pendingAssistantApplications,
        };

        return {
            status: true,
            data: summaryData,
        };
    } catch (err) {
        Logger.error(`DashboardService.getSummaryCards : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
