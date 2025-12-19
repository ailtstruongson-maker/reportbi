
import React, { useMemo, useEffect, useState } from 'react';
import Card from '../Card';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { SupermarketCompetitionData, Criterion, shortenName, shortenSupermarketName, parseNumber } from '../../utils/dashboardHelpers';
import CompetitionControlBar from './competition/CompetitionControlBar';
import CompetitionGridView from './competition/CompetitionGridView';
import CompetitionListView from './competition/CompetitionListView';

interface CompetitionViewProps {
    data: Record<string, SupermarketCompetitionData>;
    isRealtime: boolean;
    activeSupermarket: string;
    setActiveSupermarket: (sm: string) => void;
    onBatchExport: () => void; 
    isBatchExporting: boolean; 
    updateTimestamp?: string | null;
}

const CompetitionView = React.forwardRef<HTMLDivElement, CompetitionViewProps>((props, ref) => {
    const { data, isRealtime, activeSupermarket, setActiveSupermarket, updateTimestamp } = props;
    
    const [viewMode, setViewMode] = useIndexedDBState<'grid' | 'list'>('competition_view_mode', 'list');
    const [programFilterSearch, setProgramFilterSearch] = useState('');
    const [hiddenPrograms, setHiddenPrograms] = useIndexedDBState<string[]>('competition_hidden_programs', []);
    const [sortConfig, setSortConfig] = useIndexedDBState<{ columnIndex: number | 'conLai' | 'htdkVT' | -1; direction: 'asc' | 'desc' } | null>(`competition-sort-config-${isRealtime ? 'rt' : 'lk'}`, null);
    const [hiddenColumns, setHiddenColumns] = useIndexedDBState<string[]>(`competition_view_hidden_columns_${isRealtime ? 'rt' : 'lk'}`, []);
    const [defaultSortSet, setDefaultSortSet] = useState(false);
    
    const handleSort = (columnIndex: number | 'conLai' | 'htdkVT' | -1) => {
        setSortConfig(current => {
            if (current && current.columnIndex === columnIndex) {
                return { columnIndex, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { columnIndex, direction: 'desc' };
        });
    };

    const allProgramNames = useMemo(() => {
        const names = new Set<string>();
        (Object.values(data) as SupermarketCompetitionData[]).forEach(supermarket => {
            if (supermarket && supermarket.programs) {
                supermarket.programs.forEach(program => names.add(program.name));
            }
        });
        return Array.from(names).sort();
    }, [data]);

    const filteredProgramNames = useMemo(() => {
        if (!programFilterSearch) return allProgramNames;
        return allProgramNames.filter(name =>
            name.toLowerCase().includes(programFilterSearch.toLowerCase())
        );
    }, [allProgramNames, programFilterSearch]);
    
    const supermarketData = data[activeSupermarket];

    const processedSupermarketData = useMemo(() => {
        if (!supermarketData || !supermarketData.headers) {
            return undefined;
        }
    
        let processedHeaders = [...supermarketData.headers];
        let processedPrograms = JSON.parse(JSON.stringify(supermarketData.programs));
    
        if (!isRealtime) {
            const htdkVTIndex = processedHeaders.indexOf('%HTDK V.Trội');
            if (htdkVTIndex !== -1) {
                processedPrograms = processedPrograms.map((program: any) => ({
                    ...program,
                    htdkVT: parseNumber(program.data[htdkVTIndex])
                }));
            }
        }
    
        const headersToRemove = isRealtime 
            ? ['Xếp hạng trong miền'] 
            : ['Xếp hạng trong miền', 'Top/Bottom Trong Miền'];
    
        const headerRenames: Record<string, string> = isRealtime 
            ? {
                'DT Realtime': 'Realtime',
                'DT Realtime (QĐ)': 'Realtime (QĐ)',
                'SL Realtime': 'Realtime',
                'Target Ngày': 'Target',
                '% HT Target Ngày': '%HT',
                '%HT Target V.Trội': '%HT V.Trội',
              }
            : {
                'DTLK': 'L.Kế',
                'DTQĐ': 'L.Kế (QĐ)',
                'SLLK': 'L.Kế',
                'Target': 'Target',
                '% HT Target Tháng': '%HT',
                '% HT Dự Kiến': '%HTDK',
                'Target V.Trội': 'Target V.Trội',
                '%HT Target V.Trội': '%HT V.Trội',
                '%HTDK V.Trội': '%HTDK V.Trội',
              };
    
        const indicesToRemove: number[] = [];
        processedHeaders = processedHeaders
            .map((header, index) => {
                if (headersToRemove.includes(header)) {
                    indicesToRemove.push(index);
                }
                return headerRenames[header] || header;
            })
            .filter((_, index) => !indicesToRemove.includes(index));
    
        processedPrograms = processedPrograms.map((program: { data: any[]; }) => ({
            ...program,
            data: program.data.filter((_, index) => !indicesToRemove.includes(index)),
        }));
    
        processedPrograms = processedPrograms.map((program: { data: (string | number)[]; }) => {
            let conLaiValue: number | null = null;
            let actualIndex = -1;
            let targetIndex = -1;
            
            if (isRealtime) {
                actualIndex = processedHeaders.findIndex(h => h.startsWith('Realtime'));
                targetIndex = processedHeaders.indexOf('Target');
            } else {
                actualIndex = processedHeaders.findIndex(h => h.startsWith('L.Kế'));
                targetIndex = processedHeaders.indexOf('Target');
            }
    
            if(actualIndex !== -1 && targetIndex !== -1) {
                const actual = parseNumber(program.data[actualIndex]);
                const target = parseNumber(program.data[targetIndex]);
                conLaiValue = actual - target;
            }
            
            return {
                ...program,
                conLai: conLaiValue,
            };
        });
    
        if (processedHeaders.length > 0 && !processedHeaders.includes('Còn Lại')) {
            processedHeaders.push('Còn Lại');
        }
    
        return { headers: processedHeaders, programs: processedPrograms };
    }, [supermarketData, isRealtime]);

    useEffect(() => {
        if (processedSupermarketData && processedSupermarketData.headers && !defaultSortSet) {
            // Updated Logic: Prioritize sorting by "Outstanding" columns
            // Realtime: %HT V.Trội
            // Cumulative: %HTDK V.Trội (since cumulative uses projected for outstanding)
            const sortHeader = isRealtime ? '%HT V.Trội' : '%HTDK V.Trội';
            const sortIndex = processedSupermarketData.headers.indexOf(sortHeader);
           
            if (sortIndex !== -1) {
                setSortConfig({ columnIndex: sortIndex, direction: 'desc' });
                setDefaultSortSet(true);
            }
        }
    }, [processedSupermarketData, defaultSortSet, isRealtime, setSortConfig]);
    
    useEffect(() => {
        setDefaultSortSet(false);
        // Only reset if we want to force re-evaluation of default when switching supermakets/tabs
        // but we keep the current sortConfig if it exists to maintain user experience.
        // However, if the key changes (rt vs lk), useIndexedDBState handles the key change.
    }, [activeSupermarket, isRealtime]);


    const visiblePrograms = useMemo(() => {
        if (!processedSupermarketData || !processedSupermarketData.programs) return [];
        const hiddenSet = new Set(hiddenPrograms);
        return processedSupermarketData.programs.filter((p: any) => !hiddenSet.has(p.name));
    }, [processedSupermarketData, hiddenPrograms]);

    const sortedPrograms = useMemo(() => {
        if (!visiblePrograms) return [];
        if (sortConfig === null) return visiblePrograms;
        
        const sorted = [...visiblePrograms].sort((a: any, b: any) => {
            let aValue: number | string, bValue: number | string;

            if (sortConfig.columnIndex === 'conLai') {
                aValue = a.conLai ?? -Infinity;
                bValue = b.conLai ?? -Infinity;
            } else if (sortConfig.columnIndex === 'htdkVT') {
                aValue = (a as any).htdkVT ?? -Infinity;
                bValue = (b as any).htdkVT ?? -Infinity;
            } else if (sortConfig.columnIndex === -1) {
                aValue = shortenName(a.name);
                bValue = shortenName(b.name);
            } else {
                if (a.data.length <= sortConfig.columnIndex || b.data.length <= sortConfig.columnIndex) {
                    return 0;
                }
                aValue = parseNumber(a.data[sortConfig.columnIndex]);
                bValue = parseNumber(b.data[sortConfig.columnIndex]);
            }
            
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                 return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }

            if ((aValue as number) < (bValue as number)) return sortConfig.direction === 'asc' ? -1 : 1;
            if ((aValue as number) > (bValue as number)) return sortConfig.direction === 'asc' ? 1 : -1;
            return a.name.localeCompare(b.name);
        });

        return sorted;
    }, [visiblePrograms, sortConfig]);

    const groupedAndSortedPrograms = useMemo(() => {
        if (!sortedPrograms) return {};
        return sortedPrograms.reduce((acc: any, program: any) => {
            const metric = program.metric as Criterion;
            if (!acc[metric]) {
                acc[metric] = [];
            }
            acc[metric].push(program);
            return acc;
        }, {} as Partial<Record<Criterion, typeof sortedPrograms>>);
    }, [sortedPrograms]);

    if (!processedSupermarketData) {
        return <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">Không có dữ liệu thi đua để hiển thị.</div>
    }
    
    const cardTitle = (
        <div>
            {`PHÂN TÍCH THI ĐUA - ${activeSupermarket === 'Tổng' ? 'TỔNG QUAN' : shortenSupermarketName(activeSupermarket).toUpperCase()}`}
            {updateTimestamp && (
                <span className="block text-xs font-normal text-slate-400 dark:text-slate-500 mt-1">
                    Cập nhật lúc: {updateTimestamp}
                </span>
            )}
        </div>
    );
    
    const controlBar = (
        <CompetitionControlBar 
            viewMode={viewMode}
            setViewMode={setViewMode}
            programFilterSearch={programFilterSearch}
            setProgramFilterSearch={setProgramFilterSearch}
            hiddenPrograms={hiddenPrograms}
            setHiddenPrograms={setHiddenPrograms}
            allProgramNames={allProgramNames}
            filteredProgramNames={filteredProgramNames}
            hiddenColumns={hiddenColumns}
            setHiddenColumns={setHiddenColumns}
            headers={processedSupermarketData.headers}
        />
    );

    return (
        <Card title={cardTitle} actionButton={controlBar} ref={ref}>
            <div className="mt-4">
                <div className="mt-2">
                    {processedSupermarketData && visiblePrograms.length > 0 ? (
                        viewMode === 'grid' ? (
                            <CompetitionGridView 
                                groupedAndSortedPrograms={groupedAndSortedPrograms}
                                headers={processedSupermarketData.headers}
                                hiddenColumns={hiddenColumns}
                                isRealtime={isRealtime}
                            />
                        ) : (
                            <CompetitionListView
                                groupedAndSortedPrograms={groupedAndSortedPrograms}
                                headers={processedSupermarketData.headers}
                                hiddenColumns={hiddenColumns}
                                isRealtime={isRealtime}
                                handleSort={handleSort}
                            />
                        )
                    ) : (
                        <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">Không có chương trình thi đua nào cho siêu thị này, hoặc tất cả đã bị ẩn.</div>
                    )}
                </div>
            </div>
        </Card>
    );
});

export default CompetitionView;
