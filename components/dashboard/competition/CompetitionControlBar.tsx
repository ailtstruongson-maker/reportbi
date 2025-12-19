
import React, { useRef, useState, useEffect } from 'react';
import { FilterIcon, CogIcon, ViewGridIcon, ViewListIcon } from '../../Icons';
import { Switch } from '../DashboardWidgets';
import { shortenName } from '../../../utils/dashboardHelpers';

interface CompetitionControlBarProps {
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
    programFilterSearch: string;
    setProgramFilterSearch: (val: string) => void;
    hiddenPrograms: string[];
    setHiddenPrograms: React.Dispatch<React.SetStateAction<string[]>>;
    allProgramNames: string[];
    filteredProgramNames: string[];
    hiddenColumns: string[];
    setHiddenColumns: React.Dispatch<React.SetStateAction<string[]>>;
    headers: string[];
}

const CompetitionControlBar: React.FC<CompetitionControlBarProps> = ({
    viewMode,
    setViewMode,
    programFilterSearch,
    setProgramFilterSearch,
    hiddenPrograms,
    setHiddenPrograms,
    allProgramNames,
    filteredProgramNames,
    hiddenColumns,
    setHiddenColumns,
    headers,
}) => {
    const [isProgramFilterOpen, setIsProgramFilterOpen] = useState(false);
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const programFilterRef = useRef<HTMLDivElement>(null);
    const columnSelectorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (programFilterRef.current && !programFilterRef.current.contains(event.target as Node)) {
                setIsProgramFilterOpen(false);
            }
            if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
                setIsColumnSelectorOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleProgram = (name: string) => {
        setHiddenPrograms(prev => {
            const newSet = new Set(prev);
            if (newSet.has(name)) newSet.delete(name);
            else newSet.add(name);
            return Array.from(newSet);
        });
    };

    const toggleColumn = (header: string) => {
        setHiddenColumns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(header)) newSet.delete(header);
            else newSet.add(header);
            return Array.from(newSet);
        });
    };

    return (
        <div id="competition-view-controls" className="flex items-center gap-2">
            <div className="relative" ref={programFilterRef}>
                <button
                    onClick={() => setIsProgramFilterOpen(p => !p)}
                    className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-slate-800 transition-colors"
                    title="Lọc chương trình thi đua"
                >
                    <FilterIcon className="h-5 w-5" />
                </button>
                {isProgramFilterOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border dark:border-slate-700 z-20 p-2 flex flex-col max-h-96 text-left">
                        <div className="px-1 mb-2">
                            <input
                                type="text"
                                value={programFilterSearch}
                                onChange={(e) => setProgramFilterSearch(e.target.value)}
                                placeholder="Tìm kiếm chương trình..."
                                className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-primary-500 focus:border-primary-500 dark:text-slate-200"
                            />
                        </div>
                        <div className="flex justify-between items-center mb-2 px-2">
                            <button onClick={() => setHiddenPrograms([])} className="text-xs font-semibold text-primary-600 hover:underline">Chọn tất cả</button>
                            <button onClick={() => setHiddenPrograms(allProgramNames)} className="text-xs font-semibold text-slate-500 hover:underline">Bỏ chọn tất cả</button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-60">
                            {filteredProgramNames.map(name => (
                                <div key={name} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                                    <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 mr-3 cursor-pointer select-none" onClick={() => toggleProgram(name)}>{shortenName(name)}</span>
                                    <Switch 
                                        checked={!hiddenPrograms.includes(name)} 
                                        onChange={() => toggleProgram(name)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="relative" ref={columnSelectorRef}>
                    <button
                    onClick={() => setIsColumnSelectorOpen(p => !p)}
                    className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-slate-800 transition-colors"
                    title="Cột hiển thị"
                >
                    <CogIcon className="h-5 w-5" />
                </button>
                {isColumnSelectorOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border dark:border-slate-700 z-20 p-2 flex flex-col max-h-96 text-left">
                        <h4 className="px-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2 mt-1">Cột hiển thị</h4>
                        <div className="flex-1 overflow-y-auto space-y-1">
                            {headers.map(header => (
                                <div key={header} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                                    <span className="text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none" onClick={() => toggleColumn(header)}>{header}</span>
                                    <Switch 
                                        checked={!hiddenColumns.includes(header)} 
                                        onChange={() => toggleColumn(header)} 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>
                    <ViewGridIcon className="h-5 w-5"/>
                </button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>
                    <ViewListIcon className="h-5 w-5"/>
                </button>
            </div>
        </div>
    );
};

export default CompetitionControlBar;
