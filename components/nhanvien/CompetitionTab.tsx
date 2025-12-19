
import React, { useRef, useState, useMemo, useEffect } from 'react';
import Card from '../Card';
import { UsersIcon, XIcon, SpinnerIcon, CameraIcon, ChevronDownIcon, FilterIcon } from '../Icons';
import { Criterion, CompetitionHeader, Employee, Version } from '../../types/nhanVienTypes';
import { CompetitionGroupCard } from './CompetitionGroupView';
import { IndividualCompetitionView } from './IndividualCompetitionView';
import { getYesterdayDateString } from '../../utils/nhanVienHelpers';
import { Switch } from '../dashboard/DashboardWidgets';

const PALETTE = [
  { main: 'bg-sky-600', light: 'bg-sky-100', text: 'text-sky-800', hover: 'hover:bg-sky-50', zebra: 'bg-sky-50/50', footer: 'bg-sky-800' },
  { main: 'bg-teal-600', light: 'bg-teal-100', text: 'text-teal-800', hover: 'hover:bg-teal-50', zebra: 'bg-teal-50/50', footer: 'bg-teal-800' },
  { main: 'bg-rose-600', light: 'bg-rose-100', text: 'text-rose-800', hover: 'hover:bg-rose-50', zebra: 'bg-rose-50/50', footer: 'bg-rose-800' },
  { main: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-800', hover: 'hover:bg-amber-50', zebra: 'bg-amber-50/50', footer: 'bg-amber-800' },
  { main: 'bg-indigo-600', light: 'bg-indigo-100', text: 'text-indigo-800', hover: 'hover:bg-indigo-50', zebra: 'bg-indigo-50/50', footer: 'bg-indigo-800' },
  { main: 'bg-fuchsia-600', light: 'bg-fuchsia-100', text: 'text-fuchsia-800', hover: 'hover:bg-fuchsia-50', zebra: 'bg-fuchsia-50/50', footer: 'bg-fuchsia-800' },
];

const HIGHLIGHT_COLORS = [
    { dot: 'bg-teal-500', row: 'bg-teal-200 dark:bg-teal-900/60' },
    { dot: 'bg-rose-500', row: 'bg-rose-200 dark:bg-rose-900/60' },
    { dot: 'bg-sky-500', row: 'bg-sky-200 dark:bg-sky-900/60' },
    { dot: 'bg-amber-500', row: 'bg-amber-200 dark:bg-amber-900/60' },
    { dot: 'bg-violet-500', row: 'bg-violet-200 dark:bg-violet-900/60' },
    { dot: 'bg-lime-500', row: 'bg-lime-200 dark:bg-teal-900/60' }, 
    { dot: 'bg-pink-500', row: 'bg-pink-200 dark:bg-pink-900/60' },
    { dot: 'bg-indigo-500', row: 'bg-indigo-200 dark:bg-indigo-900/60' },
];

interface CompetitionTabProps {
    groupedData: Record<Criterion, { headers: CompetitionHeader[]; employees: { name: string; originalName: string; department: string; values: (number | null)[] }[] }>;
    allCompetitionsByCriterion: Record<Criterion, CompetitionHeader[]>;
    selectedCompetitions: Set<string>;
    setSelectedCompetitions: (updater: React.SetStateAction<Set<string>>) => void;
    supermarket: string | null;
    allCompetitionTitles: string[];
    versions: Version[];
    activeVersionName: string | 'new' | null;
    setActiveVersionName: React.Dispatch<React.SetStateAction<string | 'new' | null>>;
    activeCompetitionTab: Criterion | 'nhom' | 'canhan';
    setActiveCompetitionTab: (c: Criterion | 'nhom' | 'canhan') => void;
    onVersionTabClick: (version: Version) => void;
    onStartNewVersion: () => void;
    onCancelNewVersion: () => void;
    onSaveVersion: (name: string) => void;
    onDeleteVersion: (name: string) => void;
    employeeCompetitionTargets: Map<string, Map<string, number>>;
    allEmployees: Employee[];
    performanceChanges: Map<string, { change: number; direction: 'up' | 'down' }>;
    individualViewEmployees: Employee[];
    selectedIndividual: Employee | null;
    onSelectIndividual: (emp: Employee | null) => void;
    highlightedEmployees: Set<string>;
    setHighlightedEmployees: React.Dispatch<React.SetStateAction<Set<string>>>;
    department: string;
}

export const CompetitionTab: React.FC<CompetitionTabProps> = ({
    groupedData,
    allCompetitionsByCriterion,
    selectedCompetitions,
    setSelectedCompetitions,
    supermarket,
    versions,
    activeVersionName,
    setActiveVersionName,
    activeCompetitionTab,
    setActiveCompetitionTab,
    onVersionTabClick,
    onStartNewVersion,
    onCancelNewVersion,
    onSaveVersion,
    onDeleteVersion,
    employeeCompetitionTargets,
    allEmployees,
    performanceChanges,
    individualViewEmployees,
    selectedIndividual,
    onSelectIndividual,
    highlightedEmployees,
    setHighlightedEmployees,
    department
}) => {
    const criteriaOrder: Criterion[] = ['DTLK', 'DTQĐ', 'SLLK'];
    const [newVersionName, setNewVersionName] = useState('');
    const [isBatchExporting, setIsBatchExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
    const [isEmployeeFilterOpen, setIsEmployeeFilterOpen] = useState(false);
    const [employeeFilterSearch, setEmployeeFilterSearch] = useState('');
    const employeeFilterRef = useRef<HTMLDivElement>(null);
    const [isExportingHighlights, setIsExportingHighlights] = useState(false);
    const [exportTitleOverride, setExportTitleOverride] = useState<string | null>(null);
    const [isolatedHighlightEmployee, setIsolatedHighlightEmployee] = useState<string | null>(null);
    const groupViewRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterSearch, setFilterSearch] = useState('');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (employeeFilterRef.current && !employeeFilterRef.current.contains(event.target as Node)) setIsEmployeeFilterOpen(false);
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) setIsFilterOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hasAnyData = criteriaOrder.some(c => groupedData[c]?.headers.length > 0);

    const relevantCompetitions = useMemo(() => {
        if (activeCompetitionTab === 'nhom' || activeCompetitionTab === 'canhan') {
             return allCompetitionsByCriterion;
        }
        return { [activeCompetitionTab]: allCompetitionsByCriterion[activeCompetitionTab] } as Partial<Record<Criterion, CompetitionHeader[]>>;
    }, [activeCompetitionTab, allCompetitionsByCriterion]);

    const handleSaveVersionAction = () => {
        onSaveVersion(newVersionName);
        setNewVersionName('');
    };

    const filteredEmployees = useMemo(() => {
        const allCriterionEmployees = criteriaOrder.flatMap(criterion => groupedData[criterion]?.employees || []);
        const uniqueEmployeesMap = new Map();
        allCriterionEmployees.forEach(e => {
            if (e && e.name) uniqueEmployeesMap.set(e.name, e);
        });
        const uniqueEmployees = Array.from(uniqueEmployeesMap.values());
        return uniqueEmployees
            .filter((emp) => emp && (department === 'all' || emp.department === department))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [groupedData, department]);

    const employeeDataMap = useMemo(() => {
        const map = new Map<string, {name: string; department: string; values: Record<string, number | null>}>();
        criteriaOrder.forEach(criterion => {
            const data = groupedData[criterion];
            if (!data) return;
            data.employees.forEach((employee) => {
                if (!map.has(employee.name)) map.set(employee.name, { name: employee.name, department: employee.department, values: {} });
                const employeeRecord = map.get(employee.name)!;
                data.headers.forEach((header, index) => {
                    employeeRecord.values[header.title] = employee.values[index];
                });
            });
        });
        return map;
    }, [groupedData]);

    const selectedHeadersForNhom = useMemo(() => {
        return criteriaOrder.flatMap(criterion =>
            (allCompetitionsByCriterion[criterion] || [])
                .filter((h: CompetitionHeader) => selectedCompetitions.has(h.title))
                .map((header, index) => ({ ...header, criterion, originalIndex: index }))
        );
    }, [allCompetitionsByCriterion, selectedCompetitions]);

    const sortedSelectedHeaders = useMemo(() => {
        if (selectedHeadersForNhom.length === 0) return [];
        return [...selectedHeadersForNhom].sort((a, b) => {
            const targetsA = employeeCompetitionTargets.get(a.originalTitle);
            let totalTargetA = 0, totalActualA = 0;
            filteredEmployees.forEach((emp: any) => {
                totalTargetA += targetsA?.get(emp.originalName) ?? 0;
                totalActualA += employeeDataMap.get(emp.name)?.values[a.title] ?? 0;
            });
            const completionA = totalTargetA > 0 ? (totalActualA / totalTargetA) : 0;
    
            const targetsB = employeeCompetitionTargets.get(b.originalTitle);
            let totalTargetB = 0, totalActualB = 0;
            filteredEmployees.forEach((emp: any) => {
                totalTargetB += targetsB?.get(emp.originalName) ?? 0;
                totalActualB += employeeDataMap.get(emp.name)?.values[b.title] ?? 0;
            });
            const completionB = totalTargetB > 0 ? (totalActualB / totalTargetB) : 0;
            return completionB - completionA;
        });
    }, [selectedHeadersForNhom, filteredEmployees, employeeDataMap, employeeCompetitionTargets]);

    const effectiveHighlightColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        if (isolatedHighlightEmployee) {
             const employeeIndex = allEmployees.findIndex(e => e.originalName === isolatedHighlightEmployee);
             if (employeeIndex !== -1) map[isolatedHighlightEmployee] = HIGHLIGHT_COLORS[employeeIndex % HIGHLIGHT_COLORS.length].row;
             return map;
        }
        const highlightedArray = Array.from(highlightedEmployees) as string[];
        highlightedArray.forEach((name) => {
            const employeeIndex = allEmployees.findIndex(e => e.originalName === name);
            if (employeeIndex !== -1) map[name] = HIGHLIGHT_COLORS[employeeIndex % HIGHLIGHT_COLORS.length].row;
        });
        return map;
    }, [highlightedEmployees, isolatedHighlightEmployee, allEmployees]);

    const getEmployeeDotColor = (originalName: string) => {
        const index = allEmployees.findIndex(e => e.originalName === originalName);
        if (index === -1) return 'bg-gray-300';
        return HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length].dot;
    };

    const handleSelectAllEmployees = () => setHighlightedEmployees(new Set(allEmployees.map(e => e.originalName)));
    const handleDeselectAllEmployees = () => setHighlightedEmployees(new Set());

    const exportGroupViewToPNG = async (filename: string, refToExport = groupViewRef) => {
        if (!refToExport.current || !(window as any).html2canvas) return;
        const original = refToExport.current;
        const clone = original.cloneNode(true) as HTMLElement;
        
        // Cấu hình clone để lấy width tự động
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '0';
        clone.style.width = 'max-content';
        clone.style.maxWidth = 'none';
        clone.style.margin = '0';
        clone.style.padding = '24px';
        clone.style.display = 'block';

        if (document.documentElement.classList.contains('dark')) {
            clone.classList.add('dark');
            clone.style.backgroundColor = '#1e293b'; 
        } else {
            clone.style.backgroundColor = '#ffffff';
        }
        clone.classList.add('export-mode');

        // Bỏ các nút chức năng
        const exportButtons = clone.querySelectorAll('.export-button-component');
        exportButtons.forEach(btn => (btn as HTMLElement).style.display = 'none');

        // Ép các container bảng hiện thị full nội dung
        const containers = clone.querySelectorAll('.overflow-x-auto');
        containers.forEach(el => {
            (el as HTMLElement).style.overflow = 'visible';
            (el as HTMLElement).style.width = 'max-content';
            (el as HTMLElement).style.minWidth = '100%';
        });

        const tables = clone.querySelectorAll('table');
        tables.forEach(table => {
            (table as HTMLElement).style.width = 'max-content';
            (table as HTMLElement).style.minWidth = '100%';
        });

        // Thiết lập layout grid dọc trong bản clone
        const gridContainer = clone.querySelector('.grid');
        if (gridContainer) {
            (gridContainer as HTMLElement).style.display = 'flex';
            (gridContainer as HTMLElement).style.flexDirection = 'column';
            (gridContainer as HTMLElement).style.alignItems = 'center';
            (gridContainer as HTMLElement).style.gap = '32px';
            (gridContainer as HTMLElement).style.width = '100%';
        }

        document.body.appendChild(clone);
        try {
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Tính toán width dựa trên card rộng nhất
            let maxCardWidth = 0;
            const cards = clone.querySelectorAll('.competition-group-card');
            cards.forEach(card => {
                maxCardWidth = Math.max(maxCardWidth, (card as HTMLElement).offsetWidth);
            });
            
            // Ép toàn bộ container và tiêu đề theo width rộng nhất này
            const finalWidth = maxCardWidth + 48; // padding
            clone.style.width = `${finalWidth}px`;
            
            const titleContainer = clone.querySelector('.export-show-border');
            if (titleContainer) {
                (titleContainer as HTMLElement).style.width = '100%';
                (titleContainer as HTMLElement).style.display = 'flex';
                (titleContainer as HTMLElement).style.justifyContent = 'center';
                const h3 = titleContainer.querySelector('h3');
                if (h3) h3.style.width = '100%';
            }

            const canvas = await (window as any).html2canvas(clone, { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
                width: finalWidth,
                windowWidth: finalWidth
            });
            
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error("Export failed", err);
            alert("Xuất ảnh thất bại.");
        } finally {
            document.body.removeChild(clone);
        }
    };

    const handleSmartBatchExport = async () => {
        if (highlightedEmployees.size === 0) {
            alert("Vui lòng chọn ít nhất một nhân viên để xuất báo cáo.");
            return;
        }
        setIsExportingHighlights(true);
        const targets = Array.from(highlightedEmployees);
        setExportProgress({ current: 0, total: targets.length });

        try {
            for (let i = 0; i < targets.length; i++) {
                const empId = targets[i];
                const emp = allEmployees.find(e => e.originalName === empId);
                const empName = emp ? emp.name : empId;
                setIsolatedHighlightEmployee(empId);
                setExportTitleOverride(`${empName} - NHÓM HÀNG THI ĐUA ĐẾN NGÀY ${getYesterdayDateString()}`);
                await new Promise(resolve => setTimeout(resolve, 600));
                const safeName = `${empName.replace(/[\s/]/g, '_')}_Highlight.png`;
                await exportGroupViewToPNG(safeName);
                setExportProgress(prev => ({ ...prev, current: i + 1 }));
            }
        } catch (err) {
            console.error("Batch highlight export failed", err);
            alert("Có lỗi xảy ra khi xuất hàng loạt.");
        } finally {
            setIsolatedHighlightEmployee(null);
            setExportTitleOverride(null);
            setIsExportingHighlights(false);
            setExportProgress({ current: 0, total: 0 });
        }
    };

    const handleGroupBatchExport = async () => {
        if (!groupViewRef.current || !(window as any).html2canvas) return;
        setIsBatchExporting(true);
        const cards = groupViewRef.current.querySelectorAll('.competition-group-card');
        setExportProgress({ current: 0, total: cards.length + 1 });

        try {
            await exportGroupViewToPNG(`TongHop_NhomThiDua_${supermarket || 'SieuThi'}.png`);
            setExportProgress(prev => ({ ...prev, current: prev.current + 1 }));
            await new Promise(resolve => setTimeout(resolve, 500)); 
            
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i] as HTMLElement;
                const titleElement = card.querySelector('h4');
                const title = titleElement ? titleElement.innerText : `Nhom_${i}`;
                
                const clone = card.cloneNode(true) as HTMLElement;
                clone.style.position = 'absolute';
                clone.style.left = '-9999px';
                clone.style.top = '0';
                clone.style.width = 'max-content';
                clone.style.maxWidth = 'none';
                clone.style.margin = '0';
                clone.style.borderRadius = '0';
                clone.style.display = 'inline-block';

                const tableContainer = clone.querySelector('.overflow-x-auto') as HTMLElement;
                if (tableContainer) {
                    tableContainer.style.overflow = 'visible';
                    tableContainer.style.width = 'max-content';
                }

                const tableInClone = clone.querySelector('table') as HTMLElement | null;
                if (tableInClone) {
                    tableInClone.style.width = 'max-content';
                }

                if (document.documentElement.classList.contains('dark')) clone.classList.add('dark');
                clone.classList.add('export-mode');
                const btn = clone.querySelector('.export-button-component');
                if(btn) (btn as HTMLElement).style.display = 'none';
                
                document.body.appendChild(clone);
                await new Promise(resolve => setTimeout(resolve, 150));
                
                const finalCardWidth = clone.offsetWidth;
                const headerDiv = clone.querySelector('div:first-child') as HTMLElement;
                if (headerDiv) {
                    headerDiv.style.width = '100%';
                    const h4 = headerDiv.querySelector('h4');
                    if (h4) h4.style.paddingLeft = '15px'; h4.style.paddingRight = '15px';
                }

                const cardCanvas = await (window as any).html2canvas(clone, { 
                    scale: 2, 
                    useCORS: true, 
                    backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
                    width: finalCardWidth,
                    windowWidth: finalCardWidth
                });
                const cardLink = document.createElement('a');
                cardLink.download = `${title.replace(/[\s/]/g, '_')}.png`;
                cardLink.href = cardCanvas.toDataURL('image/png');
                cardLink.click();
                document.body.removeChild(clone);
                setExportProgress(prev => ({ ...prev, current: prev.current + 1 }));
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        } catch (error) {
            console.error("Batch export failed", error);
            alert("Xuất hàng loạt thất bại.");
        } finally {
            setIsBatchExporting(false);
            setExportProgress({ current: 0, total: 0 });
        }
    };

    const handleSelectAllCompetitions = () => {
         const allRelevantTitles = (Object.values(relevantCompetitions) as CompetitionHeader[][]).flat().map(c => c.title);
         setSelectedCompetitions(prev => { const newSet = new Set(prev); allRelevantTitles.forEach(t => newSet.add(t)); return newSet; });
    };
    const handleDeselectAllCompetitions = () => {
        const allRelevantTitles = (Object.values(relevantCompetitions) as CompetitionHeader[][]).flat().map(c => c.title);
        setSelectedCompetitions(prev => { const newSet = new Set(prev); allRelevantTitles.forEach(t => newSet.delete(t)); return newSet; });
    };
    const handleToggleCompetition = (competitionTitle: string) => {
        setSelectedCompetitions(prev => { const newSet = new Set(prev); if (newSet.has(competitionTitle)) newSet.delete(competitionTitle); else newSet.add(competitionTitle); return newSet; });
    };

    const activeFilterCount = (Object.values(relevantCompetitions) as CompetitionHeader[][]).flat().filter(c => selectedCompetitions.has(c.title)).length;
    const totalFilterCount = (Object.values(relevantCompetitions) as CompetitionHeader[][]).flat().length;
    const isFiltered = activeFilterCount < totalFilterCount;

    if (!hasAnyData) {
        return (
            <Card title="HIỆU QUẢ THI ĐUA THEO NHÂN VIÊN">
                <div className="mt-4 text-center py-12">
                     <UsersIcon className="h-16 w-16 text-slate-400 mx-auto" />
                    <p className="mt-4 text-slate-600 max-w-md mx-auto">Không có dữ liệu thi đua. Vui lòng chọn siêu thị và dán dữ liệu "Chương trình thi đua" tại trang Cập nhật.</p>
                </div>
            </Card>
        );
    }

    return (
        <Card title="HIỆU QUẢ THI ĐUA THEO NHÂN VIÊN">
            <div className="mt-4">
                 <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
                    <nav className="flex space-x-2 items-end flex-wrap -mb-px" aria-label="Tabs">
                         <button onClick={() => { setActiveCompetitionTab('canhan'); setActiveVersionName(null); }} className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 ${activeVersionName === null && activeCompetitionTab === 'canhan' ? 'border border-b-white dark:border-b-slate-800 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400' : `text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent ${activeVersionName !== null ? 'opacity-60' : ''}`}`}>CÁ NHÂN</button>
                        <button onClick={() => { setActiveCompetitionTab('nhom'); setActiveVersionName(null); }} className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 ${activeVersionName === null && activeCompetitionTab === 'nhom' ? 'border border-b-white dark:border-b-slate-800 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400' : `text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent ${activeVersionName !== null ? 'opacity-60' : ''}`}`}>NHÓM</button>
                        
                        <div className="h-6 border-l border-slate-300 dark:border-slate-600 mx-2 hidden sm:block"></div>
                        
                        {versions.filter(v => v && typeof v === 'object' && v.name).map(version => (
                            <div key={version.name} role="button" tabIndex={0} onClick={() => onVersionTabClick(version)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onVersionTabClick(version)} className={`group relative flex items-center gap-2 pl-4 pr-8 py-2 text-sm font-semibold rounded-t-md cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 border ${activeVersionName === version.name ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 border-b-white dark:border-b-slate-800 text-primary-700 dark:text-primary-400' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`} title={`Tải phiên bản: ${version.name}`}>
                                <span>{version.name}</span>
                                <button onClick={(e) => { e.stopPropagation(); onDeleteVersion(version.name); }} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:bg-red-100 dark:hover:bg-red-800/50 hover:text-red-600 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all"><XIcon className="h-4 w-4" /></button>
                            </div>
                        ))}
                        {activeVersionName === 'new' ? (
                            <div className="flex items-center gap-2 p-2 border border-b-0 border-slate-200 dark:border-slate-700 rounded-t-md bg-slate-50 dark:bg-slate-700/50 transition-all duration-200">
                                <input type="text" value={newVersionName} onChange={(e) => setNewVersionName(e.target.value)} placeholder={selectedCompetitions.size === 0 ? "Chọn nhóm hàng thi đua trước" : "Tên phiên bản..."} className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-200 dark:disabled:bg-slate-600 disabled:cursor-not-allowed bg-white dark:bg-slate-800" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveVersionAction()} disabled={selectedCompetitions.size === 0} />
                                <button onClick={handleSaveVersionAction} className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed" disabled={!newVersionName.trim() || selectedCompetitions.size === 0}>Lưu</button>
                                <button onClick={onCancelNewVersion} className="p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full"><XIcon className="h-4 w-4" /></button>
                            </div>
                        ) : (
                            <button onClick={onStartNewVersion} disabled={!supermarket} className="px-3 py-2 text-sm font-semibold rounded-t-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed flex items-center gap-2"><span>+ Tạo mới</span></button>
                        )}
                    </nav>
                </div>
                <div className="pt-6">
                    {activeCompetitionTab === 'nhom' && (
                        <>
                        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="relative" ref={employeeFilterRef}>
                                    <button onClick={() => setIsEmployeeFilterOpen(!isEmployeeFilterOpen)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 shadow-sm ${isEmployeeFilterOpen ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-700 ring-2 ring-primary-100 dark:ring-primary-800' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                                        <UsersIcon className="h-4 w-4" /><span>Highlight nhân viên</span>{highlightedEmployees.size > 0 && <span className="ml-1 px-1.5 py-0.5 bg-primary-600 text-white text-xs font-bold rounded-full shadow-sm">{highlightedEmployees.size}</span>}<ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isEmployeeFilterOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isEmployeeFilterOpen && (
                                        <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 max-h-[70vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                                <input type="text" value={employeeFilterSearch} onChange={(e) => setEmployeeFilterSearch(e.target.value)} placeholder="Tìm nhân viên..." className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-slate-700 dark:text-slate-100 placeholder-slate-400" autoFocus />
                                                <div className="flex items-center justify-between mt-2 px-1"><button onClick={handleSelectAllEmployees} className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">Chọn tất cả</button><button onClick={handleDeselectAllEmployees} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline">Bỏ chọn tất cả</button></div>
                                            </div>
                                            <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                                {allEmployees.filter(emp => emp.name.toLowerCase().includes(employeeFilterSearch.toLowerCase())).map(emp => {
                                                    const isSelected = highlightedEmployees.has(emp.originalName);
                                                    return (
                                                        <div key={emp.originalName} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-default">
                                                            <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={() => setHighlightedEmployees(prev => { const newSet = new Set(prev); if (newSet.has(emp.originalName)) newSet.delete(emp.originalName); else newSet.add(emp.originalName); return newSet; })}>
                                                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getEmployeeDotColor(emp.originalName)} shadow-sm`}></span>
                                                                <span className={`text-sm truncate transition-colors ${isSelected ? 'font-medium text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>{emp.name}</span>
                                                            </div>
                                                            <Switch 
                                                                checked={isSelected} 
                                                                onChange={() => setHighlightedEmployees(prev => { const newSet = new Set(prev); if (newSet.has(emp.originalName)) newSet.delete(emp.originalName); else newSet.add(emp.originalName); return newSet; })}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button onClick={handleSmartBatchExport} disabled={isExportingHighlights || highlightedEmployees.size === 0} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isExportingHighlights ? <SpinnerIcon className="h-4 w-4 animate-spin text-primary-600" /> : <CameraIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />}<span>{isExportingHighlights ? `Đang xuất ${exportProgress.current}/${exportProgress.total}...` : 'Xuất Highlight'}</span>
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative" ref={filterRef}>
                                    <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${isFilterOpen || isFiltered ? 'bg-primary-5 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><FilterIcon className="h-4 w-4" /><span>Lọc nhóm thi đua</span>{isFiltered && <span className="ml-1 px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs font-bold rounded-full">{activeFilterCount}</span>}</button>
                                    {isFilterOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-80 max-h-[80vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                                <input type="text" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} placeholder="Tìm kiếm nhóm thi đua..." className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-slate-700 dark:text-slate-100 placeholder-slate-400" autoFocus />
                                                <div className="flex items-center justify-between mt-2"><button onClick={handleSelectAllCompetitions} className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">Chọn tất cả</button><button onClick={handleDeselectAllCompetitions} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline">Bỏ chọn tất cả</button></div>
                                            </div>
                                            <div className="overflow-y-auto flex-1 p-2 space-y-4">
                                                {(Object.entries(relevantCompetitions) as [string, CompetitionHeader[]][]).map(([criterion, competitions]) => {
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
                                <button onClick={handleGroupBatchExport} disabled={isBatchExporting || selectedHeadersForNhom.length === 0} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-wait min-w-[140px] justify-center">{isBatchExporting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <CameraIcon className="h-4 w-4" />}<span>{isBatchExporting ? `Đang xuất ${exportProgress.current}/${exportProgress.total}...` : 'Xuất tất cả'}</span></button>
                            </div>
                        </div>
                        {selectedHeadersForNhom.length === 0 ? (
                            <div className="mt-4 text-center py-12"><UsersIcon className="h-16 w-16 text-slate-400 mx-auto" /><p className="mt-4 text-slate-600 max-w-md mx-auto">Hãy chọn nhóm hàng thi đua cần hiển thị từ bộ lọc nhóm thi đua.</p></div>
                        ) : (
                            <div className="space-y-8" ref={groupViewRef}>
                                <div className="mb-6 text-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-transparent export-show-border"><h3 className="text-3xl font-bold uppercase text-primary-700 dark:text-primary-400 drop-shadow-sm">{exportTitleOverride || `NHÓM HÀNG THI ĐUA ĐẾN NGÀY ${getYesterdayDateString()}`}</h3></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                    {sortedSelectedHeaders.map((header, index) => (
                                        <CompetitionGroupCard key={header.title} header={header as CompetitionHeader} colorScheme={PALETTE[index % PALETTE.length]} sortedEmployees={filteredEmployees as Employee[]} employeeDataMap={employeeDataMap} employeeCompetitionTargets={employeeCompetitionTargets} highlightColorMap={effectiveHighlightColorMap} />
                                    ))}
                                </div>
                            </div>
                        )}
                        </>
                    )}
                    {activeCompetitionTab === 'canhan' && (
                        <IndividualCompetitionView
                            allEmployees={individualViewEmployees}
                            selectedEmployee={selectedIndividual}
                            onSelectIndividual={onSelectIndividual}
                            allCompetitionsByCriterion={allCompetitionsByCriterion}
                            employeeDataMap={employeeDataMap}
                            employeeCompetitionTargets={employeeCompetitionTargets}
                            selectedCompetitions={selectedCompetitions}
                            setSelectedCompetitions={setSelectedCompetitions}
                        />
                    )}
                </div>
            </div>
        </Card>
    );
};
