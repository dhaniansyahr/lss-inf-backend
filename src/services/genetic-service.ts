import {
    BadRequestWithMessage,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { getAcademicPeriod } from "$utils/date.utils";
import { prisma } from "$utils/prisma.utils";

export interface Gene {
    matakuliahId: string;
    kelas: string;
    hariIdx: number;
    shiftId: string;
    ruanganId: string;
    dosenId: string;
}

export interface TargetPair {
    matakuliahId: string;
    kelas: string;
    copies?: number;
}

export type Chromosome = Gene[];

export const DEFAULT = {
    populationSize: 180,
    generations: 400,
    crossoverRate: 0.8,
    mutationRate: 0.06,
    tournamentSize: 3,
    elitism: 6,
    stagnationLimit: 100,
};

const WEIGHTS = {
    wR: 2000,
    wD: 2000,
    wI: 5000,
    wT: 4000,
    wTD: 3000,
};

export const DAYS = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

// ========== Helper Functions ==========

const randomIdx = (arr: number) => Math.floor(Math.random() * arr);
const sample = <T>(arr: T[]) => arr[randomIdx(arr.length)];
const slotKey = (d: number, s: string) => `${d}_${s}`;

// ======================================

// ========== Fetch Functions ==========
export async function getTheoryJadwal() {
    const academicPeriod = getAcademicPeriod();

    const schedules = await prisma.jadwal.findMany({
        where: {
            semester: academicPeriod.semester,
            tahun: academicPeriod.year,
            matakuliah: {
                isTeori: true,
            },
        },
        select: {
            id: true,
            matakuliahId: true,
            kelas: true,
            hari: true,
            shiftId: true,
            jadwalDosen: { select: { dosenId: true } },
        },
    });

    return schedules;
}

export async function getShiftsAndRooms() {
    const [shifts, rooms] = await Promise.all([
        await prisma.shift.findMany({ where: { isActive: true } }),
        await prisma.ruanganLaboratorium.findMany({
            where: { isActive: true },
        }),
    ]);

    return { shifts, rooms };
}
// ======================================

// ========== Fitness / Evaluate ==========
function fitness(
    chr: Chromosome,
    allowedDosenMap: Record<string, string[]>,
    theorySlotByClass: Map<string, Set<string>>,
    theoryDosenSlotCount: Map<string, number>
) {
    const roomCounts = new Map<string, number>();
    const dosenCounts = new Map<string, number>();

    let invalidDosen = 0;
    let overlapTheory = 0;
    let dosenInTheoryConflicts = 0;

    for (const gene of chr) {
        const slot = slotKey(gene.hariIdx, gene.shiftId);

        // Akumulasi Ruangan
        const roomKey = `${gene.ruanganId}`;
        roomCounts.set(roomKey, (roomCounts.get(roomKey) || 0) + 1);

        // akumulasi dosen
        const dosenKey = `${gene.dosenId}`;
        dosenCounts.set(dosenKey, (dosenCounts.get(dosenKey) || 0) + 1);

        // Invalid Dosen
        if (
            !allowedDosenMap[gene.matakuliahId] ||
            allowedDosenMap[gene.matakuliahId].length === 0 ||
            !allowedDosenMap[gene.matakuliahId].includes(gene.dosenId)
        ) {
            invalidDosen++;
        }

        // Jadwal Teori yang overlap by class level
        if (theorySlotByClass && theorySlotByClass.has(slot)) {
            overlapTheory++;
        }

        // Konflik Dosen Jadwal Teori Konflik
        if ((theoryDosenSlotCount.get(`${gene.dosenId}_${slot}`) ?? 0) > 0) {
            dosenInTheoryConflicts +=
                theoryDosenSlotCount.get(`${gene.dosenId}_${slot}`) ?? 0;
        }
    }

    // Kalkulasi
    const roomConflicts = Array.from(roomCounts.values()).reduce(
        (acc, v) => acc + (v > 1 ? v - 1 : 0),
        0
    );

    const dosenConflicts = Array.from(dosenCounts.values()).reduce(
        (acc, v) => acc + (v > 1 ? v - 1 : 0),
        0
    );

    // Kalkulasi Penalti
    const penalty =
        WEIGHTS.wR * roomConflicts +
        WEIGHTS.wD * dosenConflicts +
        WEIGHTS.wI * invalidDosen +
        WEIGHTS.wT * overlapTheory +
        WEIGHTS.wTD * dosenInTheoryConflicts;

    const fitness = 1 / (1 + penalty);

    return { fitness, penalty };
}
// ======================================

// ========== Genetic Operations ==========
function createRandoGeneFromOptions(options: {
    matakuliahId: string;
    kelas: string;
    daysCount: number;
    shifts: { id: string }[];
    rooms: { id: string }[];
    allowedDosen: string[] | undefined;
    fallbackDosenIds: string[];
    avoidSlotsForClass?: Set<string>; // slots we should avoid for this class (theory slots)
}) {
    let dayIdx = randomIdx(options.daysCount);
    let shift = sample(options.shifts).id;
    let room = sample(options.rooms).id;

    // mencoba untuk menghindari slot teori jika avoidSlotsForClass disediakan (batasi percobaan untuk menghindari loop tak terbatas)
    if (options.avoidSlotsForClass) {
        let attempts = 0;
        while (
            options.avoidSlotsForClass.has(slotKey(dayIdx, shift)) &&
            attempts < 10
        ) {
            dayIdx = randomIdx(options.daysCount);
            shift = sample(options.shifts).id;
            room = sample(options.rooms).id;
            attempts++;
        }
    }

    const dosenIds = options.allowedDosen
        ? options.allowedDosen
        : options.fallbackDosenIds;
    const dosenId = sample(dosenIds);

    return {
        matakuliahId: options.matakuliahId,
        kelas: options.kelas,
        hariIdx: dayIdx,
        shiftId: shift,
        ruanganId: room,
        dosenId,
    };
}

function initialPopulation(options: {
    targetPairs: TargetPair[];
    daysCount: number;
    shifts: { id: string }[];
    rooms: { id: string }[];
    allowedDosenMap: Record<string, string[]>;
    fallbackDosenIds: string[];
    populationSize: number;
    theorySlotsByClass: Map<string, Set<string>>;
}) {
    // Perluas pasangan menjadi N tugas dengan mempertimbangkan salinan
    const tasks: Array<{ matakuliahId: string; kelas: string }> = [];
    for (const pair of options.targetPairs) {
        const copies = pair.copies ?? 1;

        for (let i = 0; i < copies; i++) {
            tasks.push({ matakuliahId: pair.matakuliahId, kelas: pair.kelas });
        }
    }

    const populations: Chromosome[] = [];
    while (populations.length < options.populationSize) {
        const chromosome: Chromosome = [];
        for (const task of tasks) {
            chromosome.push(
                createRandoGeneFromOptions({
                    matakuliahId: task.matakuliahId,
                    kelas: task.kelas,
                    daysCount: options.daysCount,
                    shifts: options.shifts,
                    rooms: options.rooms,
                    allowedDosen: options.allowedDosenMap[task.matakuliahId],
                    fallbackDosenIds: options.fallbackDosenIds,
                    avoidSlotsForClass: options.theorySlotsByClass.get(
                        task.kelas
                    ),
                })
            );
        }
        populations.push(chromosome);
    }

    return { populations, tasks };
}

function tournamentSelection(
    populations: Chromosome[],
    fitnessArr: number[],
    size = 3
) {
    let bestIdx = randomIdx(size);
    let bestFitness = fitnessArr[bestIdx];

    for (let i = 1; i < size; i++) {
        let idx = randomIdx(populations.length);
        if (fitnessArr[idx] > bestFitness) {
            bestIdx = idx;
            bestFitness = fitnessArr[idx];
        }
    }

    return populations[bestIdx];
}

function crossover(parent1: Chromosome, parent2: Chromosome) {
    const crossoverPoint = parent1.length;

    if (crossoverPoint < 2) return [parent1, parent2];

    const child = 1 + randomIdx(crossoverPoint - 1);
    const child1 = parent1.slice(0, child).concat(parent2.slice(child));
    const child2 = parent2.slice(0, child).concat(parent1.slice(child));
    return [child1, child2];
}

function mutation(options: {
    chromosome: Chromosome;
    daysCount: number;
    shifts: { id: string }[];
    rooms: { id: string }[];
    allowedDosenMap: Record<string, string[]>;
    fallbackDosenIds: string[];
    theorySlotsByClass: Map<string, Set<string>>;
    mutationRate: number;
}) {
    for (const gene of options.chromosome) {
        if (Math.random() < options.mutationRate) {
            const choice = randomIdx(4);
            const avoid = options.theorySlotsByClass.get(gene.kelas);

            switch (choice) {
                case 0:
                    gene.hariIdx = randomIdx(options.daysCount);
                    break;
                case 1:
                    gene.shiftId = sample(options.shifts).id;
                    break;
                case 2:
                    gene.ruanganId = sample(options.rooms).id;
                    break;

                default:
                    const allowed = options.allowedDosenMap[gene.matakuliahId];
                    gene.dosenId =
                        allowed && allowed.length
                            ? sample(allowed)
                            : sample(options.fallbackDosenIds);
                    break;
            }

            if (avoid) {
                for (let attempt = 0; attempt < 4; attempt++) {
                    const sk = slotKey(gene.hariIdx, gene.shiftId);
                    if (!avoid.has(sk)) break;
                    gene.hariIdx = randomIdx(options.daysCount);
                    gene.shiftId = sample(options.shifts).id;
                }
            }

            const newGene = gene;
            options.chromosome[options.chromosome.indexOf(gene)] = newGene;
        }
    }

    return options.chromosome;
}
// ======================================

// ========== Main function =============
type GAResponse = { bestChoromosome: Chromosome; bestScore: number } | {};
export async function geneticAlgorithm(): Promise<ServiceResponse<GAResponse>> {
    try {
        // 1. Domain data
        const [theorySchedules, { shifts, rooms }] = await Promise.all([
            getTheoryJadwal(),
            getShiftsAndRooms(),
        ]);

        if (theorySchedules.length === 0) {
            return BadRequestWithMessage(
                "Tidak ada jadwal teori yang ditemukan!"
            );
        }

        if (shifts.length === 0 || rooms.length === 0) {
            return BadRequestWithMessage(
                "Tidak ada shift atau ruangan yang ditemukan!"
            );
        }

        // Build Theory Maps
        const theorySlotByClass = new Map<string, Set<string>>();
        const theoryDosenSlotCount = new Map<string, number>();
        const matkulToClass = new Map<string, Set<string>>();

        for (const schedule of theorySchedules) {
            const dayIndex = DAYS.indexOf(schedule.hari);
            const slot = slotKey(dayIndex, schedule.shiftId);

            if (schedule.kelas) {
                theorySlotByClass.set(
                    schedule.kelas,
                    theorySlotByClass.get(schedule.kelas) || new Set()
                );

                theorySlotByClass.get(schedule.kelas)!.add(slot);

                // mapping matakuliah -> kelas
                matkulToClass.set(
                    schedule.matakuliahId,
                    matkulToClass.get(schedule.matakuliahId) || new Set()
                );
                matkulToClass.get(schedule.matakuliahId)!.add(schedule.kelas);
            }

            // Jadwal dosen yang kemungkinan memiliki multiple rows and mapping it
            for (const ls of schedule.jadwalDosen) {
                theoryDosenSlotCount.set(
                    `${ls.dosenId}_${slot}`,
                    (theoryDosenSlotCount.get(`${ls.dosenId}_${slot}`) || 0) + 1
                );
            }
        }

        // Build Target Pairs if Not Provided
        let targetPairs: TargetPair[] = [];
        if (!targetPairs || targetPairs.length === 0) {
            for (const [courseId, classes] of matkulToClass) {
                for (const c of classes) {
                    targetPairs.push({
                        matakuliahId: courseId,
                        kelas: c,
                        copies: 1,
                    });
                }
            }
        }

        // const courseIdsToSchedule = Array.from(
        //     new Set(targetPairs.map((p) => p.matakuliahId))
        // );

        // Allowed Dosen
        const allowedDosenMap: Record<string, string[]> = {};
        for (const schedule of theorySchedules) {
            if (schedule.jadwalDosen) {
                for (const ls of schedule.jadwalDosen) {
                    allowedDosenMap[schedule.matakuliahId] ||= [];
                    allowedDosenMap[schedule.matakuliahId].push(ls.dosenId);
                }
            }
        }

        const S = DAYS.length * shifts.length;
        const R = rooms.length;
        const totalCopies = targetPairs.reduce(
            (acc, t) => acc + (t.copies ?? 1),
            0
        );

        // 4. Initial Population
        const { populations } = initialPopulation({
            targetPairs,
            daysCount: DAYS.length,
            shifts,
            rooms,
            allowedDosenMap,
            fallbackDosenIds: [],
            populationSize: S * R * totalCopies,
            theorySlotsByClass: theorySlotByClass,
        });

        // 5. GA Main Loop
        let bestChoromosome: Chromosome | null = null;
        let bestScore = -Infinity;
        let stagnation = 0;

        for (let gen = 0; gen < DEFAULT.generations; gen++) {
            // Fitness Evalution
            const evals = populations.map((p) =>
                fitness(
                    p,
                    allowedDosenMap,
                    theorySlotByClass,
                    theoryDosenSlotCount
                )
            );
            const fitnessArr = evals.map((e) => e.fitness);

            // Update Bestie
            for (let i = 0; i < populations.length; i++) {
                if (fitnessArr[i] > bestScore) {
                    bestScore = fitnessArr[i];
                    bestChoromosome = populations[i];
                    stagnation = 0;
                }
            }

            stagnation++;
            if (stagnation > DEFAULT.stagnationLimit) break;

            // Sort Indexes by Fitness DESC
            const sortedIndexes = fitnessArr
                .map((v, idx) => ({ v, idx }))
                .sort((a, b) => b.v - a.v)
                .map((x) => x.idx);

            // Elitsm
            const nextPopulation: Chromosome[] = [];
            for (let e = 0; e > DEFAULT.elitism; e++) {
                nextPopulation.push(populations[sortedIndexes[e]]);
            }

            // Fill Remaining Population
            while (nextPopulation.length < DEFAULT.populationSize) {
                const parentA = tournamentSelection(
                    populations,
                    fitnessArr,
                    DEFAULT.tournamentSize
                );
                const parentB = tournamentSelection(
                    populations,
                    fitnessArr,
                    DEFAULT.tournamentSize
                );

                let [childA, childB] = [parentA, parentB];
                if (Math.random() < DEFAULT.crossoverRate)
                    [childA, childB] = crossover(parentA, parentB);

                mutation({
                    chromosome: childA,
                    daysCount: DAYS.length,
                    shifts,
                    rooms,
                    allowedDosenMap,
                    fallbackDosenIds: [],
                    theorySlotsByClass: theorySlotByClass,
                    mutationRate: DEFAULT.mutationRate,
                });
                mutation({
                    chromosome: childB,
                    daysCount: DAYS.length,
                    shifts,
                    rooms,
                    allowedDosenMap,
                    fallbackDosenIds: [],
                    theorySlotsByClass: theorySlotByClass,
                    mutationRate: DEFAULT.mutationRate,
                });

                const repairChild = (c: Chromosome) => {
                    const roomSlotCount = new Map<string, number>();

                    for (const g of c) {
                        const roomSlotKey = `${g.ruanganId}_${slotKey(
                            g.hariIdx,
                            g.shiftId
                        )}`;
                        roomSlotCount.set(
                            roomSlotKey,
                            (roomSlotCount.get(roomSlotKey) || 0) + 1
                        );

                        // Check conflict dosen
                        if ((roomSlotCount.get(roomSlotKey) || 0) > 1) {
                            // Try to Swap
                            for (let attempt = 0; attempt < 4; attempt++) {
                                const newRoom = sample(rooms).id;
                                const alternativeKey = `${newRoom}_${slotKey(
                                    g.hariIdx,
                                    g.shiftId
                                )}`;

                                if (!roomSlotCount.get(alternativeKey)) {
                                    g.ruanganId = newRoom;
                                    roomSlotCount.set(
                                        alternativeKey,
                                        (roomSlotCount.get(alternativeKey) ||
                                            0) + 1
                                    );

                                    roomSlotCount.set(
                                        roomSlotKey,
                                        roomSlotCount.get(roomSlotKey)! - 1
                                    );
                                    break;
                                }
                            }
                        }
                    }
                };

                repairChild(childA);
                repairChild(childB);

                nextPopulation.push(childA);
                if (nextPopulation.length < DEFAULT.populationSize)
                    nextPopulation.push(childB);
            }

            // SWAP Population
            for (let i = 0; i < nextPopulation.length; i++)
                populations[i] = nextPopulation[i];
        }

        if (!bestChoromosome)
            return BadRequestWithMessage("Tidak ada solusi yang ditemukan!");

        return {
            status: true,
            data: {
                bestChoromosome,
                bestScore,
            },
        };
    } catch (error) {
        Logger.error(`GeneticService.geneticAlgorithm : ${error}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
// ======================================
