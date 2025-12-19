
import React from 'react';
import { UsersIcon, DocumentReportIcon, FileTextIcon } from '../Icons';
import { GaugeChart, KpiCard } from './DashboardWidgets';
import { parseNumber, roundUp } from '../../utils/dashboardHelpers';

interface KpiOverviewProps {
    isRealtime: boolean;
    kpiData: Record<string, string>;
    targets: { quyDoi: number; traGop: number };
    supermarketDailyTargets: Record<string, number>;
    activeSupermarket: string;
}

const KpiOverview: React.FC<KpiOverviewProps> = ({ isRealtime, kpiData, targets, supermarketDailyTargets, activeSupermarket }) => {
    
    // --- Parse KPI Data ---
    const dtlk = parseNumber(kpiData.dtlk);
    const dtqd = parseNumber(kpiData.dtqd);
    const hqqd = dtlk > 0 ? ((dtqd / dtlk) - 1) * 100 : 0;
    
    // Realtime specific logic
    let totalVuotTroi = 0;
    let htTargetVuotTroi = 0;
    let htVuotTroiColorClass = 'text-red-600 dark:text-red-400';

    if (isRealtime) {
        totalVuotTroi = supermarketDailyTargets[activeSupermarket];
        if (activeSupermarket === 'Tổng') {
            totalVuotTroi = Object.values(supermarketDailyTargets).reduce<number>((sum, value) => sum + Number(value), 0);
        }
        htTargetVuotTroi = totalVuotTroi > 0 ? (dtqd / totalVuotTroi) * 100 : 0;
        
        if (htTargetVuotTroi >= 120) htVuotTroiColorClass = 'text-green-600 dark:text-green-400';
        else if (htTargetVuotTroi >= 100) htVuotTroiColorClass = 'text-blue-600 dark:text-blue-400';
    }

    // Cumulative specific logic
    const htTargetDuKienQD_c = parseNumber(kpiData.htTargetDuKienQD);
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Revenue KPI */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{isRealtime ? "Doanh thu QĐ" : "Doanh thu QĐ Luỹ Kế"}</h3>
                <div className="p-4 mt-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                    <p className="text-5xl font-bold text-primary-600 dark:text-primary-400 tracking-tight">{roundUp(dtqd).toLocaleString('vi-VN')}</p>
                    <div className="mt-3 grid grid-cols-2 gap-4 text-center border-t border-slate-200 dark:border-slate-700 pt-3">
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{isRealtime ? "DT Thực" : "DT L.Kế"}</p>
                            <p className="text-3xl font-semibold text-[#980000] dark:text-red-400">
                                {roundUp(dtlk).toLocaleString('vi-VN')}
                                {!isRealtime && kpiData.dtckThang && (
                                    <span className={`text-sm font-bold ml-1 ${parseNumber(kpiData.dtckThang) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ({parseNumber(kpiData.dtckThang) >= 0 && '+'}
                                        {roundUp(parseNumber(kpiData.dtckThang))}%)
                                    </span>
                                )}
                            </p>
                        </div>
                        {isRealtime ? (
                            <div className={htVuotTroiColorClass}>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">%HT V.Trội</p>
                                <p className="text-3xl font-semibold">{roundUp(htTargetVuotTroi)}%</p>
                            </div>
                        ) : (
                            <div className={htTargetDuKienQD_c >= 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">%HT Dự kiến</p>
                                <p className="text-3xl font-semibold">
                                    {roundUp(htTargetDuKienQD_c)}%
                                    {kpiData.dtckThangQD && (
                                        <span className={`text-sm font-bold ml-1 ${parseNumber(kpiData.dtckThangQD) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ({parseNumber(kpiData.dtckThangQD) >= 0 && '+'}
                                            {roundUp(parseNumber(kpiData.dtckThangQD))}%)
                                        </span>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Column 2: Efficiency (Gauges) */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Hiệu suất</h3>
                <div className="mt-2 flex items-center justify-around divide-x divide-slate-200 dark:divide-slate-700">
                    <div className="flex-1 flex justify-center px-2 py-3">
                        <GaugeChart value={roundUp(hqqd)} label="Hiệu quả QĐ" target={targets.quyDoi} />
                    </div>
                    <div className="flex-1 flex justify-center px-2 py-3">
                        <GaugeChart value={roundUp(parseNumber(kpiData.tyTrongTraGop))} label="Trả Chậm" target={targets.traGop} />
                    </div>
                </div>
            </div>

            {/* Column 3: Traffic Cards */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Traffic</h3>
                <div className="mt-2 grid grid-cols-2 gap-3">
                    <KpiCard title="Lượt khách" value={roundUp(parseNumber(kpiData.lkhach)).toLocaleString('vi-VN')} color="bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg"><UsersIcon className="h-5 w-5 text-blue-600 dark:text-blue-400"/></div>
                        {!isRealtime && kpiData.luotKhachChange && <p className={`text-xs font-bold ${parseNumber(kpiData.luotKhachChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{parseNumber(kpiData.luotKhachChange) >= 0 && '+'}{roundUp(parseNumber(kpiData.luotKhachChange))}%</p>}
                    </KpiCard>
                    
                    <KpiCard title="TLPV" value={`${roundUp(parseNumber(kpiData.tlpv))}%`} color="bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-800">
                        <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg"><DocumentReportIcon className="h-5 w-5 text-green-600 dark:text-green-400"/></div>
                        {!isRealtime && kpiData.tlpvChange && <p className={`text-xs font-bold ${parseNumber(kpiData.tlpvChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{parseNumber(kpiData.tlpvChange) >= 0 && '+'}{roundUp(parseNumber(kpiData.tlpvChange))}%</p>}
                    </KpiCard>

                    <KpiCard title={isRealtime ? "Bill Bán" : "Trả Chậm"} value={isRealtime ? roundUp(parseNumber(kpiData.lbillBH)).toLocaleString('vi-VN') : `${roundUp(parseNumber(kpiData.tyTrongTraGop))}%`} color="bg-orange-50 dark:bg-orange-900/50 border-orange-200 dark:border-orange-800">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg"><FileTextIcon className="h-5 w-5 text-orange-600 dark:text-orange-400"/></div>
                        {!isRealtime && kpiData.traGopChange && <p className={`text-xs font-bold ${parseNumber(kpiData.traGopChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{parseNumber(kpiData.traGopChange) >= 0 && '+'}{roundUp(parseNumber(kpiData.traGopChange))}%</p>}
                    </KpiCard>

                    <KpiCard title="Bill T.Hộ" value={kpiData.lbillTH ? roundUp(parseNumber(kpiData.lbillTH)).toLocaleString('vi-VN') : 'N/A'} color="bg-indigo-50 dark:bg-indigo-900/50 border-indigo-200 dark:border-indigo-800">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg"><FileTextIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400"/></div>
                    </KpiCard>
                </div>
            </div>
        </div>
    );
};

export default KpiOverview;
