
import React from 'react';
import { Criterion, shortenName, parseNumber } from '../../../utils/dashboardHelpers';

interface CompetitionGridViewProps {
    groupedAndSortedPrograms: Partial<Record<Criterion, any[]>>;
    headers: string[];
    hiddenColumns: string[];
    isRealtime: boolean;
}

const CompetitionGridView: React.FC<CompetitionGridViewProps> = ({ groupedAndSortedPrograms, headers, hiddenColumns, isRealtime }) => {
    
    // Identifies keys for columns
    const getColumnKey = (possibleKeys: string[]) => headers.find(h => possibleKeys.includes(h));

    // Keys mapping
    const targetKey = getColumnKey(['Target', 'Target Ngày', 'Target V.Trội']);
    const actualKey = getColumnKey(['L.Kế', 'L.Kế (QĐ)', 'Realtime', 'Realtime (QĐ)']);
    const percentKey = isRealtime 
        ? getColumnKey(['%HT V.Trội', '%HT']) 
        : getColumnKey(['%HTDK V.Trội', '%HTDK', '%HT']);
    
    const targetIndex = targetKey ? headers.indexOf(targetKey) : -1;
    const actualIndex = actualKey ? headers.indexOf(actualKey) : -1;
    const percentIndex = percentKey ? headers.indexOf(percentKey) : -1;

    const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(Math.ceil(num));

    return (
        <div className="space-y-8">
            {(['DTLK', 'DTQĐ', 'SLLK'] as const).map(criterion => {
                const programs = groupedAndSortedPrograms[criterion];
                if (!programs || programs.length === 0) return null;
    
                return (
                    <div key={criterion}>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4 flex items-center">
                            <span className="bg-primary-600 w-1 h-5 mr-2 rounded-sm"></span>
                            {`Tiêu chí: ${criterion}`}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {programs.map((program, idx) => {
                                const conLai = program.conLai ?? 0;
                                const target = targetIndex !== -1 ? parseNumber(program.data[targetIndex]) : 0;
                                const actual = actualIndex !== -1 ? parseNumber(program.data[actualIndex]) : 0;
                                const percent = percentIndex !== -1 ? parseNumber(program.data[percentIndex]) : 0;

                                let progressColor = 'bg-primary-500';
                                if (percent >= 100) progressColor = 'bg-green-500';
                                else if (percent < 85) progressColor = 'bg-yellow-500';
                                if (percent < 50) progressColor = 'bg-red-500';

                                const remainingColor = conLai >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                const percentColor = percent >= 100 ? 'text-green-600 dark:text-green-400' : (percent < 85 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400');

                                return (
                                <div key={program.name} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
                                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate" title={program.name}>
                                            {shortenName(program.name)}
                                        </h4>
                                    </div>
                                    
                                    <div className="p-4 flex-1 flex flex-col justify-between">
                                        <div className="mb-4">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Tiến độ</span>
                                                <span className={`text-2xl font-bold ${percentColor}`}>{Math.ceil(percent)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${progressColor} transition-all duration-500`} 
                                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 text-center text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 uppercase font-semibold">Target</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-300 truncate" title={formatNumber(target)}>{formatNumber(target)}</span>
                                            </div>
                                            <div className="flex flex-col border-l border-r border-slate-100 dark:border-slate-700">
                                                <span className="text-[10px] text-slate-400 uppercase font-semibold">Thực hiện</span>
                                                <span className="font-bold text-blue-600 dark:text-blue-400 truncate" title={formatNumber(actual)}>{formatNumber(actual)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 uppercase font-semibold">Còn lại</span>
                                                <span className={`font-bold truncate ${remainingColor}`} title={formatNumber(conLai)}>{formatNumber(conLai)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                )
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CompetitionGridView;
