import { DateTime } from "luxon";

type SemesterType = "GANJIL" | "GENAP";

interface AcademicPeriod {
    year: string; // e.g. "2025/2026"
    semester: SemesterType;
}

export function getAcademicPeriod(): AcademicPeriod {
    const year = DateTime.now().year;
    const month = DateTime.now().month;

    let academicYear: string;
    let semester: SemesterType;

    if (month >= 8 && month <= 12) {
        academicYear = `${year}/${year + 1}`;
        semester = "GANJIL";
    } else {
        // January → July = GENAP
        academicYear = `${year - 1}/${year}`;
        semester = "GENAP";
    }

    return { year: academicYear, semester };
}
