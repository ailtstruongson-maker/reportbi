
import { useState, useMemo, useEffect } from 'react';
import { useIndexedDBState } from './useIndexedDBState';
import * as db from '../utils/db';
import { 
    MainTab, 
    SubTab, 
    SupermarketCompetitionData, 
    parseSummaryData, 
    parseCompetitionDataBySupermarket, 
    parseIndustryRealtimeData, 
    parseIndustryLuyKeData, 
    parseNumber,
    shortenSupermarketName
} from '../utils/dashboardHelpers';

export const useDashboardLogic = () => {
    // --- State Management ---
    const [activeMainTab, setActiveMainTab] = useIndexedDBState<MainTab>('dashboard-main-tab', 'realtime');
    const [activeSubTab, setActiveSubTab] = useIndexedDBState<SubTab>('dashboard-sub-tab', 'revenue');
    const [activeSupermarket, setActiveSupermarket] = useIndexedDBState<string>('dashboard-active-supermarket', 'Tổng');
    
    const [summaryRealtime] = useIndexedDBState('summary-realtime', '');
    const [summaryLuyKe] = useIndexedDBState('summary-luy-ke', '');
    const [competitionRealtime] = useIndexedDBState('competition-realtime', '');
    const [competitionLuyKe] = useIndexedDBState('competition-luy-ke', '');
    const [supermarkets] = useIndexedDBState<string[]>('supermarket-list', []);
    const [summaryRealtimeTs] = useIndexedDBState<string | null>('summary-realtime-ts', null);
    const [competitionRealtimeTs] = useIndexedDBState<string | null>('competition-realtime-ts', null);
    const [competitionLuyKeTs] = useIndexedDBState<string | null>('competition-luy-ke-ts', null);

    const [isBatchExporting, setIsBatchExporting] = useState(false);
    const [isBatchExportingCumulative, setIsBatchExportingCumulative] = useState(false);
    const [isBatchExportingCompetition, setIsBatchExportingCompetition] = useState(false);
    const [dataVersion, setDataVersion] = useState(0);

    // --- Derived Data Parsing ---
    const [industryRealtimeData] = useIndexedDBState(activeSupermarket && activeSupermarket !== 'Tổng' ? `config-${String(activeSupermarket)}-industry-realtime` : null, '');
    const [industryLuyKeData] = useIndexedDBState(activeSupermarket && activeSupermarket !== 'Tổng' ? `config-${String(activeSupermarket)}-industry-luyke` : null, '');
    
    const summaryRealtimeParsed = useMemo(() => parseSummaryData(summaryRealtime), [summaryRealtime]);
    const summaryLuyKeParsed = useMemo(() => parseSummaryData(summaryLuyKe), [summaryLuyKe]);
    const competitionRealtimeBySupermarket = useMemo(() => parseCompetitionDataBySupermarket(competitionRealtime), [competitionRealtime]);
    const competitionLuyKeBySupermarket = useMemo(() => parseCompetitionDataBySupermarket(competitionLuyKe), [competitionLuyKe]);
    
    const industryRealtimeParsed = useMemo(() => parseIndustryRealtimeData(industryRealtimeData), [industryRealtimeData]);
    const industryLuyKeParsed = useMemo(() => parseIndustryLuyKeData(industryLuyKeData), [industryLuyKeData]);

    // --- Targets State ---
    const [supermarketDailyTargets, setSupermarketDailyTargets] = useState<Record<string, number>>({});
    const [supermarketMonthlyTargets, setSupermarketMonthlyTargets] = useState<Record<string, number>>({});
    const [supermarketTargets, setSupermarketTargets] = useState<Record<string, { quyDoi: number; traGop: number }>>({});
    
    const [augmentedRealtimeData, setAugmentedRealtimeData] = useState<Record<string, SupermarketCompetitionData>>({});
    const [augmentedLuyKeData, setAugmentedLuyKeData] = useState<Record<string, SupermarketCompetitionData>>({});

    // --- Side Effects ---

    // 1. Listen for DB changes to trigger re-calculations
    useEffect(() => {
        const handleDbChange = (event: CustomEvent) => {
            if (event.detail.key.startsWith('comptarget-') || event.detail.key.startsWith('targethero-')) {
                setDataVersion(v => v + 1);
            }
        };
        window.addEventListener('indexeddb-change', handleDbChange as EventListener);
        return () => window.removeEventListener('indexeddb-change', handleDbChange as EventListener);
    }, []);

    // 2. Helper to parse base targets from Competition Cumulative Data
    const parseCompetitionLuyKeBaseTargets = (text: string): Record<string, Record<string, number>> => {
        if (!text) return {};
        const lines = text.split('\n');
        const targets: Record<string, Record<string, number>> = {};
        let currentCompetition: string | null = null;
        const validCriterias = ['DTLK', 'DTQĐ', 'SLLK'];
    
        for (const line of lines) {
            const parts = line.split('\t').map(p => p.trim());
            if (parts.length > 2 && validCriterias.includes(parts[1]) && parts[2] === 'Target') {
                currentCompetition = parts[0];
                continue;
            }
            if (currentCompetition && (parts[0].startsWith('ĐM') || parts[0] === 'Tổng')) {
                const supermarketName = parts[0];
                const targetValue = parseNumber(parts[2]); 
                if (!targets[supermarketName]) targets[supermarketName] = {};
                targets[supermarketName][currentCompetition] = targetValue;
            }
        }
        return targets;
    };

    // 3. Augment Realtime Data
    useEffect(() => {
        const augmentData = async () => {
            if (Object.keys(competitionRealtimeBySupermarket).length === 0 || !competitionLuyKe) {
                setAugmentedRealtimeData(competitionRealtimeBySupermarket);
                return;
            }
    
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const baseTargets = parseCompetitionLuyKeBaseTargets(competitionLuyKe); 
            const newAugmentedData = JSON.parse(JSON.stringify(competitionRealtimeBySupermarket));
            const programTotalTargets: Record<string, number> = {};
    
            for (const supermarketName in newAugmentedData) {
                if (supermarketName === 'Tổng') continue;

                const adjustments = await db.get(`comptarget-${supermarketName}-targets`) || {};
                const supermarketData = newAugmentedData[supermarketName];

                if (!supermarketData || !supermarketData.headers || !supermarketData.programs) continue;
    
                const headersToAdd: string[] = [];
                if (!supermarketData.headers.includes('Target V.Trội')) headersToAdd.push('Target V.Trội');
                if (!supermarketData.headers.includes('%HT Target V.Trội')) headersToAdd.push('%HT Target V.Trội');
                
                if (headersToAdd.length > 0) supermarketData.headers.push(...headersToAdd);
    
                for (const program of supermarketData.programs) {
                    const originalHeaderCount = supermarketData.headers.length - headersToAdd.length;
                    while (program.data.length < originalHeaderCount) program.data.push('');
                    program.data.length = originalHeaderCount;

                    const dtRealtime = parseNumber(program.data[0]);
                    const baseTarget = baseTargets[supermarketName]?.[program.name] ?? 0;
                    const adjustmentPercent = adjustments[program.name] ?? 100;
                    const adjustedMonthTarget = baseTarget * (adjustmentPercent / 100);
                    const targetVT = adjustedMonthTarget > 0 ? adjustedMonthTarget / daysInMonth : 0;
                    
                    if (!programTotalTargets[program.name]) programTotalTargets[program.name] = 0;
                    programTotalTargets[program.name] += targetVT;
    
                    const htTargetVT = targetVT > 0 ? (dtRealtime / targetVT) * 100 : 0;
                    
                    program.data.push(targetVT);
                    program.data.push(Math.ceil(htTargetVT));
                }
            }
            
            if (newAugmentedData['Tổng']) {
                const totalData = newAugmentedData['Tổng'];
                const headersToAdd: string[] = [];
                if (!totalData.headers.includes('Target V.Trội')) headersToAdd.push('Target V.Trội');
                if (!totalData.headers.includes('%HT Target V.Trội')) headersToAdd.push('%HT Target V.Trội');
                if (headersToAdd.length > 0) totalData.headers.push(...headersToAdd);

                for (const program of totalData.programs) {
                    const originalHeaderCount = totalData.headers.length - headersToAdd.length;
                    while (program.data.length < originalHeaderCount) program.data.push('');
                    program.data.length = originalHeaderCount;

                    const dtRealtime = parseNumber(program.data[0]);
                    const totalTargetVT = programTotalTargets[program.name] ?? 0;
                    const totalHtTargetVT = totalTargetVT > 0 ? (dtRealtime / totalTargetVT) * 100 : 0;
                    
                    program.data.push(totalTargetVT);
                    program.data.push(Math.ceil(totalHtTargetVT));
                }
            }
            setAugmentedRealtimeData(newAugmentedData);
        };
        augmentData();
    }, [competitionRealtimeBySupermarket, competitionLuyKe, dataVersion]);

    // 4. Augment Cumulative (Luy Ke) Data
    useEffect(() => {
        const augmentData = async () => {
            if (Object.keys(competitionLuyKeBySupermarket).length === 0) {
                setAugmentedLuyKeData(competitionLuyKeBySupermarket);
                return;
            }
    
            const now = new Date();
            const daysPassed = now.getDate();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const baseTargets = parseCompetitionLuyKeBaseTargets(competitionLuyKe);
            const newAugmentedData = JSON.parse(JSON.stringify(competitionLuyKeBySupermarket));
            const programTotals: Record<string, { totalVT: number; totalLK: number }> = {};
    
            for (const supermarketName in newAugmentedData) {
                if (supermarketName === 'Tổng') continue;
    
                const adjustments = await db.get(`comptarget-${supermarketName}-targets`) || {};
                const supermarketData = newAugmentedData[supermarketName];
    
                if (!supermarketData || !supermarketData.headers || !supermarketData.programs) continue;
    
                const headersToAdd: string[] = [];
                if (!supermarketData.headers.includes('Target V.Trội')) headersToAdd.push('Target V.Trội');
                if (!supermarketData.headers.includes('%HTDK V.Trội')) headersToAdd.push('%HTDK V.Trội');
                
                const originalHeaderCount = supermarketData.headers.length;
                if (headersToAdd.length > 0) supermarketData.headers.push(...headersToAdd);
    
                for (const program of supermarketData.programs) {
                    program.data.length = originalHeaderCount;
    
                    const baseTarget = baseTargets[supermarketName]?.[program.name] ?? 0;
                    const adjustmentPercent = adjustments[program.name] ?? 100;
                    const targetVT = baseTarget * (adjustmentPercent / 100);
    
                    const luyKeIndex = supermarketData.headers.slice(0, originalHeaderCount).findIndex((h: string) => h === 'DTLK' || h === 'DTQĐ' || h === 'SLLK');
                    const luyKeValue = luyKeIndex !== -1 ? parseNumber(program.data[luyKeIndex]) : 0;
    
                    let htdkVT = 0;
                    if (daysPassed > 0 && targetVT > 0) {
                        const projectedValue = (luyKeValue / daysPassed) * daysInMonth;
                        htdkVT = (projectedValue / targetVT) * 100;
                    }
    
                    if (!programTotals[program.name]) programTotals[program.name] = { totalVT: 0, totalLK: 0 };
                    programTotals[program.name].totalVT += targetVT;
                    programTotals[program.name].totalLK += luyKeValue;
    
                    program.data.push(targetVT);
                    program.data.push(htdkVT);
                }
            }
    
            if (newAugmentedData['Tổng']) {
                const totalData = newAugmentedData['Tổng'];
                const headersToAdd: string[] = [];
                if (!totalData.headers.includes('Target V.Trội')) headersToAdd.push('Target V.Trội');
                if (!totalData.headers.includes('%HTDK V.Trội')) headersToAdd.push('%HTDK V.Trội');
                
                const originalHeaderCount = totalData.headers.length;
                if (headersToAdd.length > 0) totalData.headers.push(...headersToAdd);
    
                for (const program of totalData.programs) {
                    program.data.length = originalHeaderCount;
                    const totals = programTotals[program.name] || { totalVT: 0, totalLK: 0 };
                    let totalHtdkVT = 0;
                    if (daysPassed > 0 && totals.totalVT > 0) {
                        const totalProjected = (totals.totalLK / daysPassed) * daysInMonth;
                        totalHtdkVT = (totalProjected / totals.totalVT) * 100;
                    }
                    program.data.push(totals.totalVT);
                    program.data.push(totalHtdkVT);
                }
            }
            setAugmentedLuyKeData(newAugmentedData);
        };
        augmentData();
    }, [competitionLuyKeBySupermarket, competitionLuyKe, dataVersion]);

    // 5. Calculate Revenue Targets
    useEffect(() => {
        const calculateTargets = async () => {
            const allDailyTargets: Record<string, number> = {};
            const allMonthlyTargets: Record<string, number> = {};
            const allTargets: Record<string, { quyDoi: number; traGop: number; }> = {};
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

            const allSupermarketsForTargets = ['Tổng', ...supermarkets];

            for (const supermarketName of allSupermarketsForTargets) {
                const quyDoi = await db.get(`targethero-${supermarketName}-quydoi`) ?? 40;
                const traGop = await db.get(`targethero-${supermarketName}-tragop`) ?? 45;
                allTargets[supermarketName] = { quyDoi, traGop };
                
                if (supermarketName === 'Tổng') continue;

                const totalTargetPercent = await db.get(`targethero-${supermarketName}-total`) ?? 100;
                const luyKeSupermarketSummary = summaryLuyKeParsed.table.rows.find(r => r[0] === supermarketName);
                const dtDuKienQd = luyKeSupermarketSummary ? parseNumber(luyKeSupermarketSummary[5]) : 0; 
                const htTargetDuKienPercent = luyKeSupermarketSummary ? parseNumber(luyKeSupermarketSummary[6]) : 0; 
                
                let baseMonthTarget = 0;
                if (htTargetDuKienPercent > 0) {
                    baseMonthTarget = dtDuKienQd / (htTargetDuKienPercent / 100);
                }

                const adjustedMonthTarget = baseMonthTarget * (totalTargetPercent / 100);
                const dailyTarget = adjustedMonthTarget > 0 ? adjustedMonthTarget / daysInMonth : 0;

                allDailyTargets[supermarketName] = dailyTarget;
                allMonthlyTargets[supermarketName] = adjustedMonthTarget;
            }
            setSupermarketDailyTargets(allDailyTargets);
            setSupermarketMonthlyTargets(allMonthlyTargets);
            setSupermarketTargets(allTargets);
        };

        if (summaryLuyKeParsed.table.rows.length > 0) {
            calculateTargets();
        }
    }, [supermarkets, summaryLuyKeParsed, dataVersion]);

    // 6. Ensure active supermarket validity
    useEffect(() => {
        if (supermarkets.length > 0 && !['Tổng', ...supermarkets].includes(activeSupermarket)) {
            setActiveSupermarket('Tổng');
        }
    }, [supermarkets, activeSupermarket, setActiveSupermarket]);

    // --- KPI Helper ---
    const getKpiData = (isRealtime: boolean) => {
        if (isRealtime) {
            if (!summaryRealtimeParsed || summaryRealtimeParsed.table.rows.length === 0) return {};
            if (activeSupermarket === 'Tổng') return summaryRealtimeParsed.kpis;
            const headers = summaryRealtimeParsed.table.headers;
            const row = summaryRealtimeParsed.table.rows.find(r => r[0] === activeSupermarket);
            if (!row) return {};
            const kpis: Record<string, string> = {};
            const mapping: Record<string, string> = {
                dtlk: 'DTLK', dtqd: 'DTQĐ', targetQD: 'Target (QĐ)', htTargetQD: '% HT Target (QĐ)',
                lkhach: 'Lượt Khách LK', lbill: 'Lượt bill', lbillBH: 'Lượt Bill Bán Hàng',
                lbillTH: 'Lượt Bill Thu Hộ', tlpv: 'TLPVTC LK', tyTrongTraGop: 'Tỷ Trọng Trả Góp',
            };
            for (const key in mapping) {
                const idx = headers.indexOf(mapping[key]);
                if (idx !== -1 && row[idx]) kpis[key] = row[idx];
            }
            return kpis;
        } else {
            if (!summaryLuyKeParsed || summaryLuyKeParsed.table.rows.length === 0) return {};
            if (activeSupermarket === 'Tổng') return summaryLuyKeParsed.kpis;
            const headers = summaryLuyKeParsed.table.headers;
            const row = summaryLuyKeParsed.table.rows.find(r => r[0] === activeSupermarket);
            if (!row) return {};
            const kpis: Record<string, string> = {};
            const mapping: Record<string, string> = {
                dtlk: 'DTLK', dtqd: 'DTQĐ', htTargetDuKienQD: '% HT Target Dự Kiến (QĐ)',
                dtDuKienQD: 'DT Dự Kiến (QĐ)', lkhach: 'Lượt Khách LK', tlpv: 'TLPVTC LK',
                tyTrongTraGop: 'Tỷ Trọng Trả Góp', dtckThang: '+/- DTCK Tháng',
                dtckThangQD: '+/- DTCK Tháng (QĐ)', luotKhachChange: '+/- Lượt Khách',
                tlpvChange: '+/- TLPVTC', traGopChange: '+/- Tỷ Trọng Trả Góp',
            };
            for (const key in mapping) {
                const idx = headers.indexOf(mapping[key]);
                if (idx !== -1 && row[idx]) kpis[key] = row[idx];
            }
            kpis.lbillBH = 'N/A';
            kpis.lbillTH = summaryLuyKeParsed.kpis.lbillTH || 'N/A';
            return kpis;
        }
    };

    return {
        activeMainTab, setActiveMainTab,
        activeSubTab, setActiveSubTab,
        activeSupermarket, setActiveSupermarket,
        supermarkets,
        isBatchExporting, setIsBatchExporting,
        isBatchExportingCumulative, setIsBatchExportingCumulative,
        isBatchExportingCompetition, setIsBatchExportingCompetition,
        summaryRealtimeParsed, summaryLuyKeParsed,
        industryRealtimeParsed, industryLuyKeParsed,
        augmentedRealtimeData, augmentedLuyKeData,
        supermarketDailyTargets, supermarketMonthlyTargets, supermarketTargets,
        summaryRealtimeTs,
        competitionRealtimeTs,
        competitionLuyKeTs,
        getKpiData,
        hasRealtimeData: summaryRealtimeParsed.table.rows.length > 0,
        hasCumulativeData: summaryLuyKeParsed.table.rows.length > 0
    };
};
