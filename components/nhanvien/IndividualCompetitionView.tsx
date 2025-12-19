
import React, { useRef, useState, useEffect, useMemo } from 'react';
import Card from '../Card';
import ExportButton from '../ExportButton';
import { FilterIcon, ChevronDownIcon, CameraIcon, SpinnerIcon } from '../Icons';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { Employee, Criterion, CompetitionHeader } from '../../types/nhanVienTypes';
import { roundUp, shortenName, getYesterdayDateString } from '../../utils/nhanVienHelpers';
import { Switch } from '../dashboard/DashboardWidgets'; // Reusing Switch from Widgets or define local if simpler

const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
    const percentage = Math.min(Math.max(value, 0), 200);
    const displayPercentage = Math.min(percentage, 100);
    let colorClass = 'bg-primary-500';
    if (value >= 100) colorClass = 'bg-green-500';
    else if (value < 85) colorClass = 'bg-yellow-500';
    if (value < 50) colorClass = 'bg-red-500';
    return (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 my-1 relative overflow-hidden">
            <div className={`${colorClass} h-full rounded-full transition-all duration-500 ease-out`} style={{ width: `${displayPercentage}%` }}></div>
             {percentage > 100 && <div className="absolute top-0 left-0 h-full bg-green-300 rounded-full" style={{ width: `${Math.min(percentage - 100, 100)}%` }}></div>}
        </div>
    );
};

const PerformanceIndicator: React.FC<{ changeInfo?: { change: number; direction: 'up' | 'down' } }> = ({ changeInfo }) => {
    if (!changeInfo) return null;
    const isPositive = changeInfo.direction === 'up';
    const icon = isPositive ? null : <ChevronDownIcon className="h-4 w-4 text-red-500" />;
    const percentageText = changeInfo.change !== Infinity ? (
        <span className={isPositive ? 'text-green-600' : 'text-red-600'}>{changeInfo.change.toFixed(0)}%</span>
    ) : null;
    if (!icon && !percentageText) return null;
    return <div className="flex items-center gap-1 text-xs font-bold shrink-0">{icon}{percentageText}</div>;
};

const REPORT_THEMES = [
    { headerBg: 'bg-sky-100/70 dark:bg-sky-900/40', rowBg: 'bg-sky-50/50 dark:bg-sky-900/20', text: 'text-sky-800 dark:text-sky-300', border: 'border-t border-sky-200 dark:border-sky-800', title: 'text-sky-800', bg: 'bg-sky-50' },
    { headerBg: 'bg-emerald-100/70 dark:bg-emerald-900/40', rowBg: 'bg-emerald-50/50 dark:bg-emerald-900/20', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-t border-emerald-200 dark:border-emerald-800', title: 'text-emerald-800', bg: 'bg-emerald-50' },
    { headerBg: 'bg-rose-100/70 dark:bg-rose-900/40', rowBg: 'bg-rose-50/50 dark:bg-rose-900/20', text: 'text-rose-800 dark:text-rose-300', border: 'border-t border-rose-200 dark:border-rose-800', title: 'text-rose-800', bg: 'bg-rose-50' },
    { headerBg: 'bg-amber-100/70 dark:bg-amber-900/40', rowBg: 'bg-amber-50/50 dark:bg-amber-900/20', text: 'text-amber-800 dark:text-amber-300', border: 'border-t border-amber-200 dark:border-amber-800', title: 'text-amber-800', bg: 'bg-amber-50' },
    { headerBg: 'bg-violet-100/70 dark:bg-violet-900/40', rowBg: 'bg-violet-50/50 dark:bg-violet-900/20', text: 'text-violet-800 dark:text-violet-300', border: 'border-t border-violet-200 dark:border-violet-800', title: 'text-violet-800', bg: 'bg-violet-50' },
    { headerBg: 'bg-cyan-100/70 dark:bg-cyan-900/40', rowBg: 'bg-cyan-50/50 dark:bg-cyan-900/20', text: 'text-cyan-800 dark:text-cyan-300', border: 'border-t border-cyan-200 dark:border-cyan-800', title: 'text-cyan-800', bg: 'bg-cyan-50' },
];

const CRITERIA_THEMES = [
    { headerBg: 'bg-sky-100/70 dark:bg-sky-900/40', rowBg: 'bg-sky-50/50 dark:bg-sky-900/20', text: 'text-sky-800 dark:text-sky-300', border: 'border-t border-sky-200 dark:border-sky-800' },
    { headerBg: 'bg-emerald-100/70 dark:bg-emerald-900/40', rowBg: 'bg-emerald-50/50 dark:bg-emerald-900/20', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-t border-emerald-200 dark:border-emerald-800' },
    { headerBg: 'bg-rose-100/70 dark:bg-rose-900/40', rowBg: 'bg-rose-50/50 dark:bg-rose-900/20', text: 'text-rose-800 dark:text-rose-300', border: 'border-t border-rose-200 dark:border-rose-800' },
];

interface IndividualCompetitionViewProps {
    allEmployees: Employee[];
    selectedEmployee: Employee | null;
    onSelectIndividual: (emp: Employee | null) => void;
    allCompetitionsByCriterion: Record<Criterion, CompetitionHeader[]>;
    employeeDataMap: Map<string, { name: string; department: string; values: Record<string, number | null> }>;
    employeeCompetitionTargets: Map<string, Map<string, number>>;
    selectedCompetitions: Set<string>;
    setSelectedCompetitions: (updater: React.SetStateAction<Set<string>>) => void;
}

const PlaceholderContent: React.FC<{ title: string; message: string }> = ({ title, message }) => (
    <Card title={title}>
        <div className="mt-4 text-center py-12"><p className="mt-4 text-slate-600 max-w-md mx-auto">{message}</p></div>
    </Card>
);

export const IndividualCompetitionView: React.FC<IndividualCompetitionViewProps> = ({
    allEmployees,
    selectedEmployee,
    onSelectIndividual,
    allCompetitionsByCriterion,
    employeeDataMap,
    employeeCompetitionTargets,
    selectedCompetitions,
    setSelectedCompetitions
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const sortConfig = { key: 'completion', direction: 'desc' };
    const [isBatchExporting, setIsBatchExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<{current: number; total: number} | null>(null);
    const [isEmployeeSelectorOpen, setIsEmployeeSelectorOpen] = useState(false);
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const employeeSelectorRef = useRef<HTMLDivElement>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterSearch, setFilterSearch] = useState('');
    const filterRef = useRef<HTMLDivElement>(null);
    const [savedColorIndex, setSavedColorIndex] = useIndexedDBState<number | null>(selectedEmployee ? `theme-color-${selectedEmployee.originalName}` : null, null);

    useEffect(() => {
        if (selectedEmployee && savedColorIndex === null) {
            const randomIndex = Math.floor(Math.random() * REPORT_THEMES.length);
            setSavedColorIndex(randomIndex);
        }
    }, [selectedEmployee, savedColorIndex, setSavedColorIndex]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
            if (employeeSelectorRef.current && !employeeSelectorRef.current.contains(event.target as Node)) {
                setIsEmployeeSelectorOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentTheme = REPORT_THEMES[savedColorIndex || 0] || REPORT_THEMES[0];

    const groupedPerformanceData = useMemo(() => {
        if (!selectedEmployee) return {};
        const result: Partial<Record<Criterion, { name: string; target: number; actual: number; completion: number; remaining: number }[]>> = {};
        
        (['DTLK', 'DTQĐ', 'SLLK'] as Criterion[]).forEach(criterion => {
            const headers = allCompetitionsByCriterion[criterion] || [];
            const filteredHeaders = headers.filter(h => selectedCompetitions.has(h.title));
            if (filteredHeaders.length === 0) return;

            let rows = filteredHeaders.map(comp => {
                const target = employeeCompetitionTargets.get(comp.originalTitle)?.get(selectedEmployee.originalName) ?? 0;
                const actual = employeeDataMap.get(selectedEmployee.name)?.values[comp.title] ?? 0;
                const completion = target > 0 ? (actual / target) * 100 : 0;
                const remaining = actual - target;
                return { name: comp.originalTitle, target, actual, completion, remaining };
            }).filter(d => d.target > 0 || d.actual > 0);
            
            rows.sort((a, b) => {
                if (sortConfig.key === 'completion') return b.completion - a.completion;
                return 0;
            });

            if (rows.length > 0) result[criterion] = rows;
        });
        return result;
    }, [selectedEmployee, allCompetitionsByCriterion, employeeDataMap, employeeCompetitionTargets, selectedCompetitions]);
    
    const handleExportPNG = async (customFilename?: string) => {
        if (!cardRef.current || !(window as any).html2canvas) return;
        const originalCard = cardRef.current;
        const clone = originalCard.cloneNode(true) as HTMLElement;
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '0';
        clone.style.width = 'fit-content';
        clone.style.maxWidth = 'none';
        clone.style.boxShadow = 'none';
        clone.style.margin = '0';
        if (document.documentElement.classList.contains('dark')) clone.classList.add('dark');
        const toolbar = clone.querySelector('.js-individual-view-toolbar');
        if (toolbar) (toolbar as HTMLElement).style.display = 'none';
        clone.classList.add('export-mode');
        const tableElementInClone = clone.querySelector('table');
        if (tableElementInClone) tableElementInClone.classList.add('compact-export-table');
        document.body.appendChild(clone);
        try {
            await new Promise(resolve => setTimeout(resolve, 50));
            const canvas = await (window as any).html2canvas(clone, { scale: 2, useCORS: true, backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff' });
            const link = document.createElement('a');
            const nameToUse = customFilename || selectedEmployee?.name || 'NhanVien';
            link.download = `ThiDua_${nameToUse.replace(/[\s/]/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Failed to export image', err);
        } finally {
            document.body.removeChild(clone);
        }
    };
    
    const performBatchExport = async () => {
        if (isBatchExporting) return;
        setIsBatchExporting(true);
        const employeesToExport = allEmployees;
        setExportProgress({ current: 0, total: employeesToExport.length });
        const originalSelection = selectedEmployee;
        try {
            for (const [index, emp] of employeesToExport.entries()) {
                onSelectIndividual(emp);
                await new Promise(resolve => setTimeout(resolve, 300));
                await handleExportPNG(emp.name);
                setExportProgress({ current: index + 1, total: employeesToExport.length });
            }
        } finally {
            onSelectIndividual(originalSelection);
            setIsBatchExporting(false);
            setExportProgress(null);
        }
    };

    const handleSelectAllCompetitions = () => {
         // Fix: Explicitly cast Object.values to resolve 'unknown' type errors
         const allRelevantTitles = (Object.values(allCompetitionsByCriterion) as CompetitionHeader[][]).flat().map(c => c.title);
         setSelectedCompetitions(prev => {
             const newSet = new Set(prev);
             allRelevantTitles.forEach(t => newSet.add(t));
             return newSet;
         });
    };
    const handleDeselectAllCompetitions = () => {
        // Fix: Explicitly cast Object.values to resolve 'unknown' type errors
        const allRelevantTitles = (Object.values(allCompetitionsByCriterion) as CompetitionHeader[][]).flat().map(c => c.title);
        setSelectedCompetitions(prev => {
             const newSet = new Set(prev);
             allRelevantTitles.forEach(t => newSet.delete(t));
             return newSet;
         });
    };
    const handleToggleCompetition = (competitionTitle: string) => {
        setSelectedCompetitions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(competitionTitle)) newSet.delete(competitionTitle);
            else newSet.add(competitionTitle);
            return newSet;
        });
    };

    const filteredEmployees = useMemo(() => {
        if (!employeeSearchTerm) return allEmployees;
        return allEmployees.filter(emp => emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()));
    }, [allEmployees, employeeSearchTerm]);

    if (allEmployees.length === 0) return <PlaceholderContent title="Báo cáo Cá nhân" message="Không có nhân viên nào trong bộ phận đã chọn." />;
    if (!selectedEmployee) return <PlaceholderContent title="Báo cáo Cá nhân" message="Vui lòng chọn một nhân viên để xem báo cáo chi tiết." />;

    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
    // Fix: Explicitly cast Object.values to resolve 'unknown' type errors
    const activeFilterCount = (Object.values(allCompetitionsByCriterion) as CompetitionHeader[][]).flat().filter(c => selectedCompetitions.has(c.title)).length;
    const totalFilterCount = (Object.values(allCompetitionsByCriterion) as CompetitionHeader[][]).flat().length;
    const isFiltered = activeFilterCount < totalFilterCount;

    return (
        <div ref={cardRef}>
            <Card title="CHI TIẾT THI ĐUA CÁ NHÂN">
                <div className="js-individual-view-toolbar mb-4 flex flex-col md:flex-row justify-between items-center gap-4 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 w-full md:w-auto relative" ref={employeeSelectorRef}>
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Chọn nhân viên:</span>
                        <div className="relative">
                            <button onClick={() => setIsEmployeeSelectorOpen(!isEmployeeSelectorOpen)} className="flex items-center justify-between w-full md:w-64 px-3 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <span className="truncate">{selectedEmployee ? selectedEmployee.name : "Chọn nhân viên..."}</span>
                                <ChevronDownIcon className="h-4 w-4 ml-2 text-slate-500" />
                            </button>
                            {isEmployeeSelectorOpen && (
                                <div className="absolute top-full left-0 mt-1 w-full md:w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-80">
                                    <div className="p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                                        <input type="text" value={employeeSearchTerm} onChange={(e) => setEmployeeSearchTerm(e.target.value)} placeholder="Tìm kiếm..." className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-slate-700 dark:text-slate-100" autoFocus />
                                    </div>
                                    <div className="overflow-y-auto flex-1">
                                        {filteredEmployees.length > 0 ? (
                                            filteredEmployees.map(emp => (
                                                <button key={emp.originalName} onClick={() => { onSelectIndividual(emp); setIsEmployeeSelectorOpen(false); setEmployeeSearchTerm(''); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${selectedEmployee.originalName === emp.originalName ? 'bg-primary-5 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {emp.name}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">Không tìm thấy nhân viên</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <ExportButton onExportPNG={() => handleExportPNG()} />
                    </div>
                    <div className="flex items-center justify-end gap-2 w-full md:w-auto">
                        <div className="relative" ref={filterRef}>
                            <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${isFilterOpen || isFiltered ? 'bg-primary-5 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                <FilterIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Lọc nhóm thi đua</span>
                                {isFiltered && <span className="ml-1 px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs font-bold rounded-full">{activeFilterCount}</span>}
                            </button>
                            {isFilterOpen && (
                                <div className="absolute right-0 top-full mt-2 w-80 max-h-[80vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                        <input type="text" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} placeholder="Tìm kiếm nhóm thi đua..." className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-slate-700 dark:text-slate-100 placeholder-slate-400" autoFocus />
                                        <div className="flex items-center justify-between mt-2">
                                            <button onClick={handleSelectAllCompetitions} className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">Chọn tất cả</button>
                                            <button onClick={handleDeselectAllCompetitions} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline">Bỏ chọn tất cả</button>
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto flex-1 p-2 space-y-4">
                                        {/* Fix: Cast entries to resolve 'unknown' type errors for competitions collection */}
                                        {(Object.entries(allCompetitionsByCriterion) as [string, CompetitionHeader[]][]).map(([criterion, competitions]) => {
                                            if (competitions.length === 0) return null;
                                            const filteredComps = competitions.filter(c => c.title.toLowerCase().includes(filterSearch.toLowerCase()));
                                            if (filteredComps.length === 0) return null;
                                            return (
                                                <div key={criterion}>
                                                    <h5 className="px-2 mb-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tiêu chí {criterion}</h5>
                                                    <div className="space-y-1">
                                                        {filteredComps.map(comp => (
                                                            <div key={comp.title} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                                                <span onClick={() => handleToggleCompetition(comp.title)} className={`text-sm select-none cursor-pointer flex-1 pr-2 ${selectedCompetitions.has(comp.title) ? 'font-medium text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>{comp.title}</span>
                                                                <Switch checked={selectedCompetitions.has(comp.title)} onChange={() => handleToggleCompetition(comp.title)} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={performBatchExport} disabled={isBatchExporting} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-wait whitespace-nowrap justify-center" title="Xuất ảnh cho tất cả nhân viên">
                            {isBatchExporting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <CameraIcon className="h-4 w-4" />}
                            <span>{isBatchExporting && exportProgress ? `Đang xuất ${exportProgress.current}/${exportProgress.total}...` : 'Xuất tất cả'}</span>
                        </button>
                    </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                    <h3 className={`text-center text-3xl font-bold mb-4 uppercase leading-normal ${currentTheme.title}`}>{selectedEmployee.name} - THI ĐUA ĐẾN NGÀY {getYesterdayDateString()}</h3>
                    <table className={`min-w-full text-sm border ${currentTheme.border}`}>
                        <thead className={`${currentTheme.bg}`}>
                            <tr className={currentTheme.text}>
                                <th className="text-center font-bold px-3 py-2.5 text-sm uppercase tracking-wider w-12 border-r border-slate-400/30">#</th>
                                <th className="text-left font-bold px-3 py-2.5 text-sm uppercase tracking-wider border-r border-slate-400/30 whitespace-nowrap"><div className="flex items-center">NHÓM THI ĐUA</div></th>
                                <th className="text-center font-bold px-3 py-2.5 text-sm uppercase tracking-wider border-r border-slate-400/30"><div className="flex items-center justify-center">M.TIÊU</div></th>
                                <th className="text-center font-bold px-3 py-2.5 text-sm uppercase tracking-wider border-r border-slate-400/30"><div className="flex items-center justify-center">T.Hiện</div></th>
                                <th className="text-center font-bold px-3 py-2.5 text-sm uppercase tracking-wider w-32 border-r border-slate-400/30"><div className="flex items-center justify-center">% HT</div></th>
                                <th className="text-center font-bold px-3 py-2.5 text-sm uppercase tracking-wider"><div className="flex items-center justify-center">Còn lại</div></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800">
                           {(['DTLK', 'DTQĐ', 'SLLK'] as Criterion[]).map((criterion, criterionIndex) => {
                               const items = groupedPerformanceData[criterion];
                               if (!items || items.length === 0) return null;
                               const theme = CRITERIA_THEMES[criterionIndex % CRITERIA_THEMES.length];
                               return (
                                   <React.Fragment key={criterion}>
                                       <tr className={`${theme.headerBg} ${theme.border}`}><td colSpan={6} className={`px-3 py-2 font-bold uppercase text-sm ${theme.text}`}>Tiêu chí: {criterion}</td></tr>
                                       {items.map((item, index) => {
                                           const remainingColor = item.remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                           const rowClass = index % 2 !== 0 ? theme.rowBg : '';
                                           return (
                                               <tr key={`${criterion}-${item.name}`} className={`${rowClass} hover:bg-slate-100 dark:hover:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700`}>
                                                   <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400 text-sm border-r border-slate-200 dark:border-slate-700">{index + 1}</td>
                                                   <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700 text-sm whitespace-nowrap">{shortenName(item.name)}</td>
                                                   <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 text-sm">{f.format(roundUp(item.target))}</td>
                                                   <td className="px-3 py-2 text-center font-semibold text-slate-800 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700 text-sm">{f.format(roundUp(item.actual))}</td>
                                                   <td className="px-3 py-2 text-center w-32 border-r border-slate-200 dark:border-slate-700 text-sm"><div className="flex items-center gap-2 justify-center"><span className="font-bold text-center">{roundUp(item.completion).toFixed(0)}%</span><div className="w-12 hidden sm:block"><ProgressBar value={item.completion} /></div></div></td>
                                                   <td className={`px-3 py-2 text-center font-semibold ${remainingColor} text-sm`}>{f.format(roundUp(item.remaining))}</td>
                                               </tr>
                                           );
                                       })}
                                   </React.Fragment>
                               )
                           })}
                           {Object.keys(groupedPerformanceData).length === 0 && (<tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">Chưa có chương trình thi đua nào được chọn từ bộ lọc hoặc không có dữ liệu cho nhân viên này.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
