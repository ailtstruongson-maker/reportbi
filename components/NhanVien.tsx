
import React, { useState, useMemo, useEffect } from 'react';
import Card from './Card';
import { LineChartIcon, SparklesIcon, ArchiveBoxIcon, UsersIcon, XIcon, BuildingStorefrontIcon, ChevronDownIcon } from './Icons';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import TrendChart, { TrendDataPoint } from './TrendChart';
import * as db from '../utils/db';
import { RevenueRow, Employee, BonusMetrics, SnapshotMetadata, SnapshotData, Tab, CompetitionDataForCriterion, Criterion } from '../types/nhanVienTypes';
import { parseRevenueData, parseCompetitionData, formatEmployeeName } from '../utils/nhanVienHelpers';
import RevenueView from './nhanvien/RevenueTab';
import { BonusView, BonusDataModal } from './nhanvien/BonusTab';
import AiAssistant from './nhanvien/AiAssistant';
import { CompetitionTab } from './nhanvien/CompetitionTab';
import { shortenSupermarketName } from '../utils/dashboardHelpers';

const NavTabButton: React.FC<{ tab: Tab; children: React.ReactNode; activeTab: Tab; setActiveTab: (t: Tab) => void; icon: React.ReactNode; }> = ({ tab, children, activeTab, setActiveTab, icon }) => (
    <button onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${activeTab === tab ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'}`} aria-current={activeTab === tab ? 'page' : undefined}>
        {icon}<span>{children}</span>
    </button>
);

const PlaceholderContent: React.FC<{ title: string; message: string; subMessage?: string }> = ({ title, message, subMessage }) => (
    <Card title={title}>
        <div className="mt-4 text-center py-12"><div className="flex justify-center items-center"><UsersIcon className="h-16 w-16 text-slate-400" /></div><p className="mt-4 text-slate-600 max-w-md mx-auto">{message}</p>{subMessage && <p className="mt-2 text-sm text-slate-500">{subMessage}</p>}</div>
    </Card>
);

export const NhanVien: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('revenue');
    const [supermarkets] = useIndexedDBState<string[]>('supermarket-list', []);
    const [activeSupermarket, setActiveSupermarket] = useIndexedDBState<string | null>('nhanvien-active-supermarket', null);
    
    const danhSachId = activeSupermarket ? `config-${String(activeSupermarket)}-danhsach` : null;
    const thiDuaId = activeSupermarket ? `config-${String(activeSupermarket)}-thidua` : null;
    const [danhSachData] = useIndexedDBState<string>(danhSachId, '');
    const [thiDuaData] = useIndexedDBState<string>(thiDuaId, '');
    const [previousThiDuaData] = useIndexedDBState<string>(activeSupermarket ? `previous-${thiDuaId}` : null, '');
    
    const [bonusData, setBonusData] = useIndexedDBState<Record<string, BonusMetrics | null>>(activeSupermarket ? `bonus-data-${String(activeSupermarket)}` : null, {});
    const [modalEmployee, setModalEmployee] = useState<Employee | null>(null);

    const revenueRows = useMemo(() => parseRevenueData(danhSachData), [danhSachData]);
    const departments = useMemo(() => {
        const deptNames = revenueRows.filter(r => r.type === 'department').map(r => r.name).sort();
        return ['all', ...deptNames];
    }, [revenueRows]);
    const [activeDepartment, setActiveDepartment] = useState('all');

    const employeeDepartmentMap = useMemo(() => {
        const map = new Map<string, string>();
        let currentDept = '';
        if (typeof danhSachData === 'string') {
            danhSachData.split('\n').forEach(line => {
                const trimmed = line.trim();
                const parts = trimmed.split('\t');
                const name = parts[0]?.trim() || '';
                if (trimmed.startsWith('BP ')) { currentDept = name; } else if (currentDept && name.includes(' - ')) { map.set(name, currentDept); }
            });
        }
        return map;
    }, [danhSachData]);
    
    const allEmployees = useMemo(() => {
        return revenueRows.filter((r): r is RevenueRow & { originalName: string, department: string } => r.type === 'employee' && !!r.originalName && !!r.department).map(r => ({ name: r.name, originalName: r.originalName, department: r.department })).sort((a,b) => a.name.localeCompare(b.name));
    }, [revenueRows]);

    const competitionData = useMemo(() => parseCompetitionData(thiDuaData, employeeDepartmentMap), [thiDuaData, employeeDepartmentMap]);
    const previousCompetitionData = useMemo(() => parseCompetitionData(previousThiDuaData, employeeDepartmentMap), [previousThiDuaData, employeeDepartmentMap]);

    const performanceChanges = useMemo(() => {
        const changes = new Map<string, { change: number; direction: 'up' | 'down' }>();
        if (!previousThiDuaData) return changes;
        const currentTotals = new Map<string, number>();
        allEmployees.forEach(emp => {
            let total = 0;
            (Object.values(competitionData) as CompetitionDataForCriterion[]).forEach(criterionData => { const empData = criterionData.employees.find(e => e.originalName === emp.originalName); if (empData) total += empData.values.reduce((acc, val) => acc + (val || 0), 0); });
            currentTotals.set(emp.originalName, total);
        });
        const previousTotals = new Map<string, number>();
         allEmployees.forEach(emp => {
            let total = 0;
            (Object.values(previousCompetitionData) as CompetitionDataForCriterion[]).forEach(criterionData => { const empData = criterionData.employees.find(e => e.originalName === emp.originalName); if (empData) total += empData.values.reduce((acc, val) => acc + (val || 0), 0); });
            previousTotals.set(emp.originalName, total);
        });
        currentTotals.forEach((currentValue, name) => {
            const previousValue = previousTotals.get(name);
            if (previousValue === undefined) { if(currentValue > 0) changes.set(name, { change: Infinity, direction: 'up' }); }
            else if (previousValue > 0) { const change = ((currentValue - previousValue) / previousValue) * 100; if (Math.abs(change) >= 10) changes.set(name, { change, direction: change > 0 ? 'up' : 'down' }); }
            else if (currentValue > 0) { changes.set(name, { change: Infinity, direction: 'up' }); }
        });
        return changes;
    }, [allEmployees, competitionData, previousCompetitionData, previousThiDuaData]);

    const allCompetitionsByCriterion = useMemo(() => ({ DTLK: competitionData.DTLK.headers, DTQĐ: competitionData.DTQĐ.headers, SLLK: competitionData.SLLK.headers }), [competitionData]);
    const allCompetitionTitles = useMemo(() => Object.values(allCompetitionsByCriterion).flat().map((c: any) => c.title), [allCompetitionsByCriterion]);

    const [versions, setVersions] = useIndexedDBState<any[]>(activeSupermarket ? `versions-${String(activeSupermarket)}` : null, []);
    const [activeVersionName, setActiveVersionName] = useState<string | 'new' | null>(null);
    const [activeCompetitionTab, setActiveCompetitionTab] = useState<Criterion | 'nhom' | 'canhan'>('canhan');
    const [highlightedEmpArray, setHighlightedEmpArray] = useIndexedDBState<string[]>(activeSupermarket ? `highlight-employees-${activeSupermarket}` : null, []);
    const highlightedEmployees = useMemo(() => new Set(highlightedEmpArray), [highlightedEmpArray]);
    const setHighlightedEmployees = (updater: React.SetStateAction<Set<string>>) => { const newSet = typeof updater === 'function' ? updater(highlightedEmployees) : updater; setHighlightedEmpArray(Array.from(newSet)); };

    const defaultCompetitionsForTab = useMemo(() => {
        if (activeCompetitionTab === 'nhom' || activeCompetitionTab === 'canhan') return new Set(allCompetitionTitles);
        return new Set(allCompetitionsByCriterion[activeCompetitionTab]?.map(c => c.title) || []);
    }, [activeCompetitionTab, allCompetitionTitles, allCompetitionsByCriterion]);

    const filterKey = activeSupermarket ? `comp-filter-${activeSupermarket}-${activeCompetitionTab}` : null;
    const [selectedCompetitionsArray, setSelectedCompetitionsArray] = useIndexedDBState<string[]>(filterKey, Array.from(defaultCompetitionsForTab));
    const selectedCompetitions = useMemo(() => new Set(selectedCompetitionsArray), [selectedCompetitionsArray]);
    const setSelectedCompetitions = (updater: React.SetStateAction<Set<string>>) => { if (typeof updater === 'function') { const newSet = updater(selectedCompetitions); setSelectedCompetitionsArray(Array.from(newSet)); } else { setSelectedCompetitionsArray(Array.from(updater)); } };
    
    const [employeeCompetitionTargets, setEmployeeCompetitionTargets] = useState<Map<string, Map<string, number>>>(new Map());
    const [dataVersion, setDataVersion] = useState(0);

    const individualViewEmployees = useMemo(() => {
        if (activeDepartment === 'all') return allEmployees;
        return allEmployees.filter(emp => emp.department === activeDepartment);
    }, [allEmployees, activeDepartment]);

    const [selectedIndividual, setSelectedIndividual] = useState<Employee | null>(null);
    useEffect(() => {
        if (individualViewEmployees.length > 0) { setSelectedIndividual(prev => { if (prev && individualViewEmployees.some(e => e.originalName === prev.originalName)) { return prev; } return individualViewEmployees[0]; }); } else { setSelectedIndividual(null); }
    }, [individualViewEmployees]);

    useEffect(() => {
        const handleDbChange = (event: CustomEvent) => { if (event.detail.key.startsWith('comptarget-') || event.detail.key.startsWith('targethero-')) { setDataVersion(v => v + 1); } };
        window.addEventListener('indexeddb-change', handleDbChange as EventListener);
        return () => window.removeEventListener('indexeddb-change', handleDbChange as EventListener);
    }, []);

    useEffect(() => {
        const fetchTargets = async () => {
            if (!activeSupermarket || !competitionData) return;
            const targets = new Map<string, Map<string, number>>();
            const competitionTargetsData = await db.get(`comptarget-${String(activeSupermarket)}-targets`);
            const departmentWeightsData = await db.get(`targethero-${String(activeSupermarket)}-departmentweights`);
            const competitionLuyKeData = await db.get('competition-luy-ke');
            if (!competitionLuyKeData) return;
            const lines = String(competitionLuyKeData).split('\n');
            let currentCompetition: string | null = null;
            const validCriterias = ['DTLK', 'DTQĐ', 'SLLK'];
            for (const line of lines) {
                const parts = line.split('\t').map(p => p.trim());
                if (parts.length > 2 && validCriterias.includes(parts[1]) && parts[2] === 'Target') { currentCompetition = parts[0]; continue; }
                if (currentCompetition && parts[0] === String(activeSupermarket)) {
                    const baseTarget = parseFloat(parts[2].replace(/,/g, '')) || 0;
                    const sliderValue = competitionTargetsData?.[currentCompetition] ?? 100;
                    const adjustedTarget = baseTarget * (sliderValue / 100);
                    const competitionEmployees = allEmployees;
                    let totalWeight = 0;
                    const employeeWeights = new Map<string, number>();
                    competitionEmployees.forEach(emp => { const deptWeight = departmentWeightsData?.[emp.department] ?? 0; const weight = deptWeight > 0 ? deptWeight : (100 / competitionEmployees.length); employeeWeights.set(emp.originalName, weight); totalWeight += weight; });
                    if (totalWeight > 0) {
                        if (!targets.has(currentCompetition)) { targets.set(currentCompetition, new Map<string, number>()); }
                        const compTargets = targets.get(currentCompetition)!;
                        competitionEmployees.forEach(emp => { const weight = employeeWeights.get(emp.originalName)!; const employeeTarget = adjustedTarget * (weight / totalWeight); compTargets.set(emp.originalName, employeeTarget); });
                    }
                }
            }
            setEmployeeCompetitionTargets(targets);
        };
        fetchTargets();
    }, [activeSupermarket, competitionData, allEmployees, dataVersion]);

    useEffect(() => { setActiveDepartment('all'); }, [activeSupermarket]);
    useEffect(() => { if (!departments.includes(activeDepartment)) { setActiveDepartment('all'); } }, [departments, activeDepartment]);
    useEffect(() => { if (activeSupermarket && supermarkets.length > 0 && !supermarkets.includes(activeSupermarket)) { setActiveSupermarket(supermarkets[0] || null); } else if (!activeSupermarket && supermarkets.length > 0) { setActiveSupermarket(supermarkets[0]); } }, [supermarkets, activeSupermarket, setActiveSupermarket]);
    useEffect(() => { setActiveVersionName(null); }, [activeCompetitionTab]);

    const handleSaveVersion = (name: string) => { if (!name.trim() || !activeSupermarket) return; const newVersion = { name: name.trim(), selectedCompetitions: Array.from(selectedCompetitions) }; const updatedVersions = [...(Array.isArray(versions) ? versions : []).filter(v => v.name !== newVersion.name), newVersion]; setVersions(updatedVersions); setActiveVersionName(newVersion.name); };
    const handleDeleteVersion = (name: string) => { if (!confirm(`Bạn có chắc chắn muốn xoá phiên bản "${name}" không?`)) return; const updatedVersions = (Array.isArray(versions) ? versions : []).filter(v => v.name !== name); setVersions(updatedVersions); if (activeVersionName === name) { setActiveVersionName(null); setSelectedCompetitions(new Set(allCompetitionTitles)); } };
    const handleVersionTabClick = (version: any) => { setActiveVersionName(version.name); setSelectedCompetitions(new Set(version.selectedCompetitions)); };
    const handleStartNewVersion = () => { setActiveVersionName('new'); };
    const handleCancelNewVersion = () => { setActiveVersionName(null); };

    const [snapshots, setSnapshots] = useIndexedDBState<SnapshotMetadata[]>(activeSupermarket ? `snapshots-${String(activeSupermarket)}` : null, []);
    const [snapshotToCompare, setSnapshotToCompare] = useState<string | null>(null);
    const handleSaveSnapshot = async () => { const name = prompt("Nhập tên cho snapshot này (ví dụ: 'Tuần 1 - Tháng 7'):"); if (!name || !activeSupermarket || !danhSachData || !thiDuaData) return; const id = new Date().toISOString(); const newSnapshot: SnapshotMetadata = { id, name, date: new Date().toISOString() }; await db.set(`snapshot-data-${String(activeSupermarket)}-${id}`, { danhSachData, thiDuaData }); setSnapshots(prev => [...(prev || []), newSnapshot].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())); };
    
    const [trendModalData, setTrendModalData] = useState<{ employee: Employee; data: TrendDataPoint[] } | null>(null);
    const handleViewTrend = async (employee: Employee) => {
        if (!activeSupermarket) return;
        const snapshotMetadata: SnapshotMetadata[] = await db.get(`snapshots-${String(activeSupermarket)}`) || [];
        const trendData: TrendDataPoint[] = [];
        const currentTotal = (Object.values(competitionData) as CompetitionDataForCriterion[]).reduce((total: number, criterionData: CompetitionDataForCriterion) => { const empData = criterionData.employees.find(e => e.originalName === employee.originalName); if (empData) { return total + empData.values.reduce((acc: number, val: number | null) => acc + (val || 0), 0); } return total; }, 0);
        trendData.push({ date: new Date().toISOString(), value: currentTotal, name: "Hiện tại" });
        for (const meta of snapshotMetadata) {
            const snapshot: SnapshotData | undefined = await db.get(`snapshot-data-${String(activeSupermarket)}-${meta.id}`);
            if (snapshot?.thiDuaData) {
                 const historicCompData = parseCompetitionData(snapshot.thiDuaData, employeeDepartmentMap);
                 const historicTotal = (Object.values(historicCompData) as CompetitionDataForCriterion[]).reduce((total: number, criterionData: CompetitionDataForCriterion) => { const empData = criterionData.employees.find(e => e.originalName === employee.originalName); if (empData) { return total + empData.values.reduce((acc: number, val: number | null) => acc + (val || 0), 0); } return total; }, 0);
                trendData.push({ date: meta.date, value: historicTotal, name: meta.name });
            }
        }
        trendData.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setTrendModalData({ employee, data: trendData });
    };
    
    const handleSaveBonusData = (employeeOriginalName: string, metrics: BonusMetrics) => { setBonusData(prev => ({ ...prev, [employeeOriginalName]: metrics })); };

    return (
        <div className="space-y-6">
            <header><h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Phân tích Nhân viên</h1></header>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full sm:w-auto">
                             <BuildingStorefrontIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                             <select id="supermarket-select" value={activeSupermarket || ''} onChange={(e) => setActiveSupermarket(e.target.value)} className="w-full sm:w-64 appearance-none bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 pl-10 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                                {supermarkets.length === 0 ? <option disabled>Chưa có dữ liệu siêu thị</option> : supermarkets.map((sm) => <option key={sm} value={sm}>{shortenSupermarketName(sm)}</option>)}
                            </select>
                            <ChevronDownIcon className="h-5 w-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                         {(activeTab === 'revenue' || activeTab === 'competition') && (
                             <div className="relative w-full sm:w-auto">
                                <UsersIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <select id="department-select" value={activeDepartment} onChange={(e) => setActiveDepartment(e.target.value)} className="w-full sm:w-64 appearance-none bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 pl-10 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                                    {departments.map(dept => <option key={dept} value={dept}>{dept === 'all' ? 'Tất cả Phòng ban' : dept}</option>)}
                                </select>
                                <ChevronDownIcon className="h-5 w-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        )}
                    </div>
                    <div className="bg-slate-200 dark:bg-slate-900 p-1 rounded-full flex items-center w-full md:w-auto justify-center">
                       <NavTabButton tab="revenue" activeTab={activeTab} setActiveTab={setActiveTab} icon={<LineChartIcon className="h-5 w-5" />}>Doanh thu</NavTabButton>
                       <NavTabButton tab="competition" activeTab={activeTab} setActiveTab={setActiveTab} icon={<SparklesIcon className="h-5 w-5" />}>Thi đua</NavTabButton>
                       <NavTabButton tab="bonus" activeTab={activeTab} setActiveTab={setActiveTab} icon={<ArchiveBoxIcon className="h-5 w-5" />}>Thưởng</NavTabButton>
                    </div>
                </div>
            </div>
             <div className="pt-2">
                 {activeTab === 'revenue' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                                <label htmlFor="snapshot-select" className="text-sm font-semibold text-slate-600 dark:text-slate-300">So sánh với:</label>
                                <select id="snapshot-select" value={snapshotToCompare || ''} onChange={(e) => setSnapshotToCompare(e.target.value || null)} className="pl-3 pr-8 py-1.5 text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md shadow-sm">
                                    <option value="">Hiện tại</option>{(snapshots || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <button onClick={handleSaveSnapshot} className="p-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200" title="Lưu snapshot hiện tại"><UsersIcon className="h-5 w-5"/></button>
                            </div>
                        <RevenueView rows={revenueRows} supermarketName={activeSupermarket || ''} departmentName={activeDepartment} performanceChanges={performanceChanges} onViewTrend={handleViewTrend} />
                    </div>
                 )}
                 {activeTab === 'competition' && (
                    <CompetitionTab
                        groupedData={competitionData}
                        allCompetitionsByCriterion={allCompetitionsByCriterion}
                        selectedCompetitions={selectedCompetitions}
                        setSelectedCompetitions={setSelectedCompetitions}
                        supermarket={activeSupermarket}
                        allCompetitionTitles={allCompetitionTitles}
                        versions={versions}
                        activeVersionName={activeVersionName}
                        setActiveVersionName={setActiveVersionName}
                        activeCompetitionTab={activeCompetitionTab}
                        setActiveCompetitionTab={setActiveCompetitionTab}
                        onVersionTabClick={handleVersionTabClick}
                        onStartNewVersion={handleStartNewVersion}
                        onCancelNewVersion={handleCancelNewVersion}
                        onSaveVersion={handleSaveVersion}
                        onDeleteVersion={handleDeleteVersion}
                        employeeCompetitionTargets={employeeCompetitionTargets}
                        allEmployees={allEmployees}
                        performanceChanges={performanceChanges}
                        individualViewEmployees={individualViewEmployees}
                        selectedIndividual={selectedIndividual}
                        onSelectIndividual={setSelectedIndividual}
                        highlightedEmployees={highlightedEmployees}
                        setHighlightedEmployees={setHighlightedEmployees}
                        department={activeDepartment}
                    />
                 )}
                  {activeTab === 'bonus' && <BonusView employees={allEmployees} bonusData={bonusData || {}} onEmployeeClick={setModalEmployee} />}
            </div>
             {modalEmployee && <BonusDataModal employee={modalEmployee} onClose={() => setModalEmployee(null)} onSave={handleSaveBonusData} />}
            {trendModalData && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setTrendModalData(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end"><button onClick={() => setTrendModalData(null)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><XIcon className="h-5 w-5 text-slate-500" /></button></div>
                        <TrendChart data={trendModalData.data} employeeName={trendModalData.employee.name} />
                    </div>
                </div>
            )}
            <AiAssistant danhSachData={danhSachData} thiDuaData={thiDuaData} />
        </div>
    );
};

export default NhanVien;
