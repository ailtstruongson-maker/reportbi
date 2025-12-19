
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '../Card';
import ExportButton from '../ExportButton';
import { FilterIcon, CogIcon } from '../Icons';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { parseIndustryRealtimeData, parseIndustryLuyKeData, parseNumber, roundUp } from '../../utils/dashboardHelpers';
import { Switch, ProgressBar } from './DashboardWidgets';

interface IndustryViewProps {
    realtimeData: ReturnType<typeof parseIndustryRealtimeData>;
    luykeData: ReturnType<typeof parseIndustryLuyKeData>;
    isRealtime: boolean;
}

const IndustryView = React.forwardRef<HTMLDivElement, IndustryViewProps>((props, ref) => {
    const { realtimeData, luykeData, isRealtime } = props;
    
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);
    const [userHiddenColumns, setUserHiddenColumns] = useIndexedDBState<string[]>(`hidden-cols-industry-${isRealtime ? 'realtime' : 'luyke'}`, []);

    const [isIndustryFilterOpen, setIsIndustryFilterOpen] = useState(false);
    const industryFilterRef = useRef<HTMLDivElement>(null);
    const [hiddenIndustries, setHiddenIndustries] = useIndexedDBState<string[]>(`hidden-industries-${isRealtime ? 'realtime' : 'luyke'}`, []);
    const [industryFilterSearch, setIndustryFilterSearch] = useState('');

    const handleExportPNG = async () => {
        const cardElement = (ref as React.RefObject<HTMLDivElement>).current;
        if (!cardElement || !(window as any).html2canvas) return;
        
        const controls = cardElement.querySelector<HTMLElement>('.industry-view-controls');
        if (controls) controls.style.display = 'none';

        const table = cardElement.querySelector<HTMLTableElement>('table');
        const originalTableFontSize = table ? table.style.fontSize : '';
        if(table) table.style.fontSize = '12px';

        cardElement.classList.add('printable-area');
        try {
            const canvas = await (window as any).html2canvas(cardElement, { scale: 2, useCORS: true, backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff' });
            const link = document.createElement('a');
            link.download = `DoanhThu_NganhHang_${isRealtime ? 'Realtime' : 'LuyKe'}_${new Date().toISOString().slice(0,10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Failed to export image', err);
        } finally {
            if (controls) controls.style.display = 'flex';
            cardElement.classList.remove('printable-area');
             if(table) table.style.fontSize = originalTableFontSize;
        }
    };
    
    const data = isRealtime ? realtimeData : luykeData.table;
    const kpis = luykeData.kpis;
    const { headers, rows } = data;

    const allIndustries = useMemo(() => {
        const sourceRows = isRealtime ? realtimeData.rows : luykeData.table.rows;
        return (sourceRows || [])
            .map(row => row[0])
            .filter(name => name && name !== 'Tổng');
    }, [realtimeData.rows, luykeData.table.rows, isRealtime]);

    const processedTable = useMemo(() => {
        if (!headers || headers.length === 0 || !rows || rows.length === 0) {
            return { headers: [], rows: [] };
        }
        
        let totalRow = rows.find(r => r[0] === 'Tổng');
        let otherRows = rows.filter(r => r[0] !== 'Tổng');

        const hiddenIndustriesSet = new Set(hiddenIndustries);
        otherRows = otherRows.filter(row => 
            row[0] && !hiddenIndustriesSet.has(row[0])
        );

        const htTargetIndex = headers.indexOf(isRealtime ? '% HT Target Ngày (QĐ)' : '% HT Target (QĐ)');
        if (htTargetIndex !== -1) {
            otherRows.sort((a, b) => parseNumber(b[htTargetIndex]) - parseNumber(a[htTargetIndex]));
        }
        
        const finalRows = totalRow ? [...otherRows, totalRow] : otherRows;

        return { headers, rows: finalRows };
    }, [rows, headers, isRealtime, hiddenIndustries]);
    
    const visibleColumns = useMemo(() => {
        const hiddenSet = new Set(userHiddenColumns);
        return new Set(processedTable.headers.filter(h => !hiddenSet.has(h)));
    }, [processedTable.headers, userHiddenColumns]);
    
    const filteredIndustriesForChecklist = useMemo(() => {
        if (!industryFilterSearch) return allIndustries;
        return allIndustries.filter(name => name.toLowerCase().includes(industryFilterSearch.toLowerCase()));
    }, [allIndustries, industryFilterSearch]);

    const toggleIndustryVisibility = (industryName: string) => {
        setHiddenIndustries(prev => {
            const newSet = new Set(prev);
            if (newSet.has(industryName)) {
                newSet.delete(industryName);
            } else {
                newSet.add(industryName);
            }
            return Array.from(newSet);
        });
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
                setIsColumnSelectorOpen(false);
            }
            if (industryFilterRef.current && !industryFilterRef.current.contains(event.target as Node)) {
                setIsIndustryFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleColumn = (header: string) => {
        setUserHiddenColumns(prev => {
            const newHidden = new Set(prev);
            if (newHidden.has(header)) {
                newHidden.delete(header);
            } else {
                newHidden.add(header);
            }
            return Array.from(newHidden);
        });
    };

    const headerMapping: Record<string, string> = {
        'Nhóm ngành hàng': 'Ngành hàng',
        'SL Realtime': 'Số lượng',
        'DT Realtime (QĐ)': 'DTQĐ',
        'Target Ngày (QĐ)': 'Target QĐ',
        '% HT Target Ngày (QĐ)': '%HT Target QĐ',
        'DT Trả Góp': 'DT Trả chậm',
        'Tỷ Trọng Trả Góp': '%Trả Chậm',
    };
    
    const actionButton = (
        <div className="industry-view-controls flex items-center gap-2">
             <div className="relative" ref={industryFilterRef}>
                <button
                    onClick={() => setIsIndustryFilterOpen(prev => !prev)}
                    className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-slate-800 transition-colors"
                    title="Lọc ngành hàng"
                >
                    <FilterIcon className="h-5 w-5" />
                </button>
                {isIndustryFilterOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-lg border dark:border-slate-700 z-20 p-2 flex flex-col max-h-96">
                        <input
                            type="text"
                            value={industryFilterSearch}
                            onChange={(e) => setIndustryFilterSearch(e.target.value)}
                            placeholder="Tìm kiếm ngành hàng..."
                            className="w-full px-3 py-1.5 mb-2 text-sm border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                            {filteredIndustriesForChecklist.map(industry => (
                                <label key={industry} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!hiddenIndustries.includes(industry)}
                                        onChange={() => toggleIndustryVisibility(industry)}
                                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500 bg-white dark:bg-slate-900"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-200">{industry.replace('NNH ', '')}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <ExportButton onExportPNG={handleExportPNG} />
            <div className="relative" ref={selectorRef}>
                <button
                    onClick={() => setIsColumnSelectorOpen(prev => !prev)}
                    className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-slate-800 transition-colors"
                >
                    <CogIcon className="h-5 w-5" />
                </button>
                {isColumnSelectorOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border dark:border-slate-700 z-20 p-2 max-h-80 overflow-y-auto">
                        <div className="grid grid-cols-1 gap-1">
                            {processedTable.headers.map(header => (
                                <div key={header} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                                    <label htmlFor={`col-toggle-industry-${header}`} className="text-sm text-slate-700 dark:text-slate-200 flex-grow cursor-pointer select-none">
                                        {headerMapping[header] || header}
                                    </label>
                                    <Switch
                                        id={`col-toggle-industry-${header}`}
                                        checked={visibleColumns.has(header)}
                                        onChange={() => toggleColumn(header)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (!headers || headers.length === 0 || !rows || rows.length === 0) {
        return (
            <Card title={isRealtime ? "DOANH THU NGÀNH HÀNG - REALTIME" : "DOANH THU NGÀNH HÀNG - LUỸ KẾ"}>
                <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400 mt-4">Không có dữ liệu ngành hàng cho siêu thị này.</div>
            </Card>
        );
    }
    
    const dtRealtimeQdIndex = headers.indexOf('DT Realtime (QĐ)');
    const targetNgayQdIndex = headers.indexOf('Target Ngày (QĐ)');
    const tyTrongTraGopIndex = headers.indexOf('Tỷ Trọng Trả Góp');

    return (
        <Card ref={ref} title={isRealtime ? "DOANH THU NGÀNH HÀNG - REALTIME" : "DOANH THU NGÀNH HÀNG - LUỸ KẾ"} actionButton={actionButton}>
            {!isRealtime && (
                <div className="my-6 grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">LG QĐ Dự kiến</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{kpis.laiGopQDDuKien}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">%HT LNTT</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{kpis.htTargetDuKienLNTT}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Target LNTT</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{kpis.targetLNTT}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Chi phí</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{kpis.chiPhi}</p>
                    </div>
                </div>
            )}
            <div className="mt-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-sky-600 dark:bg-sky-700">
                            <tr>
                                {processedTable.headers.map((h, i) => (visibleColumns.has(h) ? (
                                    <th key={i} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white dark:text-slate-100 border-r border-sky-500 dark:border-sky-600 last:border-r-0 ${i > 0 ? 'text-center' : 'text-left'}`}>{headerMapping[h] || h}</th>
                                ) : null))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {processedTable.rows.map((row, rIdx) => {
                                const isTotalRow = row[0] === 'Tổng';
                                const htTargetIndex = headers.indexOf(isRealtime ? '% HT Target Ngày (QĐ)' : '% HT Target (QĐ)');
                                const htValue = htTargetIndex !== -1 ? parseNumber(row[htTargetIndex]) : 0;
                                return (
                                    <tr key={rIdx} className={isTotalRow ? 'bg-slate-200 dark:bg-slate-700/80 font-bold text-slate-900 dark:text-slate-100' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}>
                                        {row.map((cell, cIdx) => (visibleColumns.has(processedTable.headers[cIdx]) ? (
                                            <td key={cIdx} className={`px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 last:border-r-0 ${cIdx > 0 ? 'text-center' : 'text-left'}`}>
                                                {(() => {
                                                    if (cIdx === htTargetIndex) {
                                                        let colorClass = 'text-red-600 dark:text-red-400';
                                                        if(htValue >= 100) colorClass = 'text-green-600 dark:text-green-400';
                                                        else if(htValue >= 85) colorClass = 'text-yellow-600 dark:text-yellow-400';

                                                        return (
                                                            <div className="flex items-center gap-2 justify-center">
                                                                <span className={colorClass}>{cell}</span>
                                                                <div className="w-16">
                                                                    <ProgressBar value={htValue} />
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    if (cIdx === tyTrongTraGopIndex && isRealtime) {
                                                        return `${roundUp(parseNumber(cell))}%`;
                                                    }
                                                    if (cIdx === 0 && typeof cell === 'string') {
                                                        return cell.replace('NNH ', '');
                                                    }
                                                    if ((cIdx === dtRealtimeQdIndex || cIdx === targetNgayQdIndex) && isRealtime) {
                                                        return roundUp(parseNumber(cell)).toLocaleString('vi-VN');
                                                    }
                                                    return cell;
                                                })()}
                                            </td>
                                        ) : null))}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </Card>
    )
});

export default IndustryView;
