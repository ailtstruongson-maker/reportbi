
import React from 'react';
import { Criterion, shortenName, parseNumber } from '../../../utils/dashboardHelpers';
import { ProgressBar } from '../DashboardWidgets';

interface CompetitionListViewProps {
    groupedAndSortedPrograms: Partial<Record<Criterion, any[]>>;
    headers: string[];
    hiddenColumns: string[];
    isRealtime: boolean;
    handleSort: (col: any) => void;
}

const CompetitionListView: React.FC<CompetitionListViewProps> = ({ groupedAndSortedPrograms, headers, hiddenColumns, isRealtime, handleSort }) => {
    return (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-sm">
                <thead className="bg-sky-600 dark:bg-sky-700">
                    <tr>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-white dark:text-slate-100 uppercase tracking-wider border-r border-sky-500 dark:border-sky-600">STT</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white dark:text-slate-100 uppercase tracking-wider cursor-pointer border-r border-sky-500 dark:border-sky-600" onClick={() => handleSort(-1)}>NHÓM THI ĐUA</th>
                        {headers.map((header, index) => {
                            if (hiddenColumns.includes(header) || header === 'Còn Lại') return null;
                            return (
                                <th 
                                    key={index} 
                                    onClick={() => handleSort(index)}
                                    className="px-4 py-3 text-center text-xs font-semibold text-white dark:text-slate-100 uppercase tracking-wider whitespace-nowrap cursor-pointer group border-r border-sky-500 dark:border-sky-600 last:border-r-0"
                                >
                                    {header}
                                </th>
                            )
                        })}
                            
                        { !hiddenColumns.includes('Còn Lại') && (
                                <th 
                                onClick={() => handleSort('conLai')}
                                className="px-4 py-3 text-center text-xs font-semibold text-white dark:text-slate-100 uppercase tracking-wider whitespace-nowrap cursor-pointer group border-r border-sky-500 dark:border-sky-600 last:border-r-0"
                            >
                                Còn Lại
                            </th>
                        )}
                    </tr>
                </thead>
                {(['DTLK', 'DTQĐ', 'SLLK'] as const).map(criterion => {
                    const programs = groupedAndSortedPrograms[criterion];
                    if (!programs || programs.length === 0) return null;
        
                    return (
                        <tbody key={criterion} className="divide-y divide-slate-200 dark:divide-slate-700">
                            <tr className="bg-slate-100 dark:bg-slate-900/50">
                                <th colSpan={100} className="px-4 py-2 text-left text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {`Tiêu chí: ${criterion}`}
                                </th>
                            </tr>
                            {programs.map((program: any, index: number) => {
                                const conLai = program.conLai;
                                const numericHeadersToRound = new Set(['Realtime', 'Realtime (QĐ)', 'Target', 'Target V.Trội', 'L.Kế', 'L.Kế (QĐ)', 'Còn Lại']);
                                const percentHeadersToRound = new Set(['%HT', '%HTDK', '%HT V.Trội', '%HTDK V.Trội']);

                                return (
                                    <tr key={program.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{index + 1}</td>
                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap border-r border-slate-200 dark:border-slate-700">
                                            <div>{shortenName(program.name)}</div>
                                        </td>
                                        {program.data.map((cell: any, cIdx: number) => {
                                            const header = headers[cIdx];
                                            if (hiddenColumns.includes(header) || header === 'Còn Lại') return null;

                                            const isNumericToRound = numericHeadersToRound.has(header);
                                            const isPercentToRound = percentHeadersToRound.has(header);
                                            
                                            let cellDisplayValue: string | number | React.ReactNode = cell;
                                            
                                            if (isNumericToRound) {
                                                const rawNum = parseNumber(cellDisplayValue);
                                                if (header === 'Target V.Trội' || header === 'Target(QĐ) V.Trội') {
                                                    cellDisplayValue = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(rawNum);
                                                } else {
                                                    cellDisplayValue = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.ceil(rawNum));
                                                }
                                            } else if (isPercentToRound) {
                                                cellDisplayValue = `${Math.ceil(parseNumber(cellDisplayValue))}%`;
                                            }


                                            const cellContent = () => {
                                                const headerKey = headers[cIdx];
                                                const isProgressBarColumn = headerKey === (isRealtime ? '%HT' : '%HTDK') || headerKey === '%HT V.Trội' || headerKey === '%HTDK V.Trội';
                                                
                                                if (isProgressBarColumn) {
                                                    const htValue = parseNumber(cell);
                                                    return (
                                                        <div className="flex items-center justify-center gap-3">
                                                            <span className='font-semibold'>{`${Math.ceil(htValue)}%`}</span>
                                                            <div className="w-24"> <ProgressBar value={htValue} /> </div>
                                                        </div>
                                                    );
                                                }
                                                return cellDisplayValue;
                                            };

                                            return (
                                                <td key={cIdx} className="px-4 py-3 text-center text-slate-600 dark:text-slate-300 whitespace-nowrap border-r border-slate-200 dark:border-slate-700 last:border-r-0">
                                                    {cellContent()}
                                                </td>
                                            )
                                        })}
                                        
                                        { !hiddenColumns.includes('Còn Lại') && (
                                            <td className={`px-4 py-3 text-center font-bold whitespace-nowrap border-r border-slate-200 dark:border-slate-700 last:border-r-0 ${conLai === null ? '' : (conLai >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400')}`}>
                                                {conLai !== null ? new Intl.NumberFormat('vi-VN').format(Math.ceil(conLai)) : '-'}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    );
                })}
            </table>
        </div>
    );
};

export default CompetitionListView;
