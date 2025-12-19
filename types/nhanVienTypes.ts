
export type Tab = 'revenue' | 'competition' | 'bonus';
export type Criterion = 'DTLK' | 'DTQĐ' | 'SLLK';

export interface CompetitionHeader {
    title: string;
    originalTitle: string;
    metric: string;
}

export interface PerformanceChange {
    change: number;
    direction: 'up' | 'down';
}

export interface BonusMetrics {
    erp: number;
    tNong: number;
    tong: number;
    dKien: number;
    pNong: number;
}

export interface CompetitionDataForCriterion {
    headers: CompetitionHeader[];
    employees: { name: string; originalName: string; department: string; values: (number | null)[] }[];
}

export interface RevenueRow {
    type: 'total' | 'department' | 'employee';
    name: string;
    originalName?: string;
    department?: string;
    dtlk: number;
    dtqd: number;
    hieuQuaQD: number;
}

export interface SnapshotMetadata {
    id: string;
    name: string;
    date: string;
}

export interface SnapshotData {
    danhSachData: string;
    thiDuaData: string;
}

export interface Version {
    name: string;
    selectedCompetitions: string[];
}

export interface Employee {
    name: string;
    originalName: string;
    department: string;
}
