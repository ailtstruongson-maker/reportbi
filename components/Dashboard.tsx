
import React, { useRef } from 'react';
import Card from './Card';
import { UploadIcon } from './Icons';
import { useDashboardLogic } from '../hooks/useDashboardLogic';
import SummaryTableView from './dashboard/SummaryTableView';
import CompetitionView from './dashboard/CompetitionView';
import IndustryView from './dashboard/IndustryView';
import DashboardHeader from './dashboard/DashboardHeader';
import DashboardToolbar from './dashboard/DashboardToolbar';
import KpiOverview from './dashboard/KpiOverview';
import { SupermarketNavBar } from './dashboard/DashboardWidgets';
import * as db from '../utils/db';

interface DashboardProps {
    onNavigateToUpdater: () => void;
}

const EmptyState: React.FC<{ onNavigate: () => void; onRestore: () => void; message?: string }> = ({ onNavigate, onRestore, message }) => (
    <Card title="Chưa có dữ liệu">
        <div className="mt-4 text-center py-10">
            <UploadIcon className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="mt-4 text-slate-600 dark:text-slate-300">{message || "Hãy bắt đầu bằng cách cập nhật báo cáo mới nhất."}</p>
            
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                    onClick={onNavigate} 
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-transparent text-sm font-semibold rounded-full shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
                >
                    <UploadIcon className="h-5 w-5" />
                    <span>Đi đến trang cập nhật</span>
                </button>
                <button 
                    onClick={onRestore}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-300 dark:border-slate-600 text-sm font-semibold rounded-full shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
                >
                    <UploadIcon className="h-5 w-5" />
                    <span>Khôi phục từ File</span>
                </button>
            </div>
        </div>
    </Card>
);

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToUpdater }) => {
    const {
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
        hasRealtimeData,
        hasCumulativeData
    } = useDashboardLogic();

    const printableRef = useRef<HTMLDivElement>(null);
    const summaryTableRef = useRef<HTMLDivElement>(null);
    const industryTableRef = useRef<HTMLDivElement>(null);
    const competitionViewRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Restore Logic ---
    const handleRestoreClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result;
                if (typeof content !== 'string') throw new Error('Định dạng file không hợp lệ.');
                
                const parsedContent = JSON.parse(content);
                let dataToRestore: { key: string; value: any }[] = [];

                if (Array.isArray(parsedContent)) {
                    dataToRestore = parsedContent;
                } else if (parsedContent.data && Array.isArray(parsedContent.data)) {
                    dataToRestore = parsedContent.data;
                } else {
                    throw new Error('Cấu trúc file backup không hợp lệ.');
                }

                if (dataToRestore.length === 0) throw new Error('File backup rỗng.');

                await db.clearStore();
                await db.setMany(dataToRestore);

                const navState = {
                    'main-active-view': 'dashboard',
                    'dashboard-main-tab': 'realtime',
                    'dashboard-sub-tab': 'revenue',
                    'dashboard-active-supermarket': 'Tổng'
                };
                for (const [key, value] of Object.entries(navState)) {
                    await db.set(key, value);
                }

                const keysToNotify = [
                    ...Object.keys(navState),
                    'summary-realtime',
                    'summary-luy-ke',
                    'competition-realtime',
                    'competition-luy-ke',
                    'supermarket-list'
                ];
                keysToNotify.forEach(key => {
                    window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key } }));
                });

                alert('✅ Khôi phục dữ liệu thành công!');
            } catch (error) {
                console.error('Restore failed:', error);
                alert(`❌ Khôi phục thất bại: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    // --- Export Logic (Cải tiến cho Google Sites) ---
    const handleExportPNG = async (targetRef: React.RefObject<HTMLDivElement>, filenamePart: string, isCompetition = false) => {
        const cardElement = targetRef.current;
        if (!cardElement || !(window as any).html2canvas) return;
        
        const controls = cardElement.querySelector<HTMLElement>('.column-customizer, .industry-view-controls, #competition-view-controls');
        const originalControlsDisplay = controls ? controls.style.display : '';
        if (controls) controls.style.display = 'none';

        const tableEl = cardElement.querySelector<HTMLTableElement>('table');
        const originalTableCssText = tableEl ? tableEl.style.cssText : '';
        
        // Fix: Explicitly cast headers and their properties to resolve 'unknown' errors
        const headers: HTMLTableCellElement[] = tableEl ? Array.from(tableEl.querySelectorAll('thead th')) as HTMLTableCellElement[] : [];
        const originalHeaders = headers.map(h => ({ el: h, html: h.innerHTML, cssText: h.style.cssText }));

        try {
            if (isCompetition && tableEl) {
                (tableEl as HTMLElement).style.width = 'auto';
                (tableEl as HTMLElement).style.tableLayout = 'auto';
                // Fix: th is now correctly typed as HTMLTableCellElement
                headers.forEach(th => { th.style.width = 'auto'; th.style.minWidth = 'auto'; th.style.whiteSpace = 'nowrap'; });
                await new Promise(resolve => requestAnimationFrame(resolve));
            }

            cardElement.classList.add('printable-area');
            const canvas = await (window as any).html2canvas(cardElement, { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
                logging: false,
                onclone: (clonedDoc) => {
                    // Đảm bảo fonts được load trong bản clone
                }
            });

            // Sử dụng Blob thay vì Base64 để tránh giới hạn kích thước URL trong iframe
            canvas.toBlob((blob) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const safeName = filenamePart.replace(/[^a-zA-Z0-9]/g, '_');
                link.download = `Dashboard_${safeName}_${new Date().toISOString().slice(0,10)}.png`;
                link.href = url;
                
                // Quan trọng: Gắn vào DOM để link hoạt động ổn định trong iframe sandboxed
                document.body.appendChild(link);
                link.click();
                
                // Dọn dẹp sau khi click
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 100);
            }, 'image/png');

        } catch (err) {
            console.error('Export error', err);
            alert('Lỗi xuất ảnh. Vui lòng thử lại.');
        } finally {
            if (controls) controls.style.display = originalControlsDisplay;
            if (tableEl) (tableEl as HTMLElement).style.cssText = originalTableCssText;
            if (isCompetition) {
                 originalHeaders.forEach(h => { (h.el as HTMLElement).innerHTML = h.html; (h.el as HTMLElement).style.cssText = h.cssText; });
            }
            cardElement.classList.remove('printable-area');
        }
    };

    const runBatchExport = async (mode: 'realtime' | 'cumulative' | 'competition') => {
        const setExporting = mode === 'competition' ? setIsBatchExportingCompetition : (mode === 'realtime' ? setIsBatchExporting : setIsBatchExportingCumulative);
        setExporting(true);
        const originalSm = activeSupermarket;
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
        
        const controlsId = mode === 'competition' ? '' : (mode === 'realtime' ? 'realtime-controls' : 'cumulative-controls');
        const controls = controlsId ? document.getElementById(controlsId) : null;
        const mainTabs = document.getElementById('main-tabs-container');
        const originalDisplay = controls ? controls.style.display : '';
        const originalMainTabsDisplay = mainTabs ? mainTabs.style.display : '';
        
        if (controls) controls.style.display = 'none';
        if (mainTabs) mainTabs.style.display = 'none';

        try {
            for (const sm of ['Tổng', ...supermarkets]) {
                setActiveSupermarket(sm);
                await sleep(1500);
                const targetRef = mode === 'competition' ? competitionViewRef : printableRef;
                const prefix = mode === 'competition' ? `ThiDua_${activeMainTab}` : (mode === 'realtime' ? 'DoanhThu' : 'DoanhThu_LuyKe');
                await handleExportPNG(targetRef, `${prefix}_${sm}`, mode === 'competition');
            }
            alert('Đã hoàn tất xuất hàng loạt!');
        } catch (e) {
            console.error(e);
            alert('Lỗi xuất hàng loạt.');
        } finally {
            if (controls) controls.style.display = originalDisplay;
            if (mainTabs) mainTabs.style.display = originalMainTabsDisplay;
            setActiveSupermarket(originalSm);
            setExporting(false);
        }
    };

    if (!hasRealtimeData && !hasCumulativeData) {
        return (
            <>
                <EmptyState onNavigate={onNavigateToUpdater} onRestore={handleRestoreClick} />
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            </>
        );
    }

    const isRealtimeView = activeMainTab === 'realtime';
    const hasData = isRealtimeView ? hasRealtimeData : hasCumulativeData;
    const currentKpiData = getKpiData(isRealtimeView);
    const activeTargets = supermarketTargets[activeSupermarket] || { quyDoi: 40, traGop: 45 };

    if (!hasData) {
        return (
            <div className="space-y-6">
                <DashboardHeader title="Tổng quan Siêu thị" activeMainTab={activeMainTab} setActiveMainTab={setActiveMainTab} />
                <EmptyState 
                    onNavigate={onNavigateToUpdater} 
                    onRestore={handleRestoreClick}
                    message={`Không có dữ liệu ${isRealtimeView ? 'Realtime' : 'Luỹ kế'}. Vui lòng cập nhật.`} 
                />
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <DashboardHeader title="Tổng quan Siêu thị" activeMainTab={activeMainTab} setActiveMainTab={setActiveMainTab} />
            
            <div className="mt-6">
                <DashboardToolbar 
                    id={isRealtimeView ? "realtime-controls" : "cumulative-controls"}
                    activeSubTab={activeSubTab}
                    setActiveSubTab={setActiveSubTab}
                />
                
                <SupermarketNavBar 
                    supermarkets={supermarkets}
                    activeSupermarket={activeSupermarket}
                    setActiveSupermarket={setActiveSupermarket}
                    onBatchExport={() => {
                        if (activeSubTab === 'competition') runBatchExport('competition');
                        else runBatchExport(isRealtimeView ? 'realtime' : 'cumulative');
                    }}
                    isBatchExporting={isBatchExporting || isBatchExportingCumulative || isBatchExportingCompetition}
                />

                <div className="mt-6">
                    {activeSubTab === 'revenue' && (
                        <div ref={printableRef} className="space-y-6">
                            <SummaryTableView 
                                ref={summaryTableRef}
                                data={isRealtimeView ? summaryRealtimeParsed.table : summaryLuyKeParsed.table} 
                                isCumulative={!isRealtimeView}
                                supermarketDailyTargets={supermarketDailyTargets} 
                                supermarketMonthlyTargets={supermarketMonthlyTargets}
                                activeSupermarket={activeSupermarket}
                                onExport={() => handleExportPNG(summaryTableRef, `BangDoanhThu${!isRealtimeView ? 'LuyKe' : ''}_${activeSupermarket}`)}
                                updateTimestamp={isRealtimeView ? summaryRealtimeTs : null}
                                supermarketTargets={supermarketTargets}
                            />
                            
                            <KpiOverview 
                                isRealtime={isRealtimeView}
                                kpiData={currentKpiData}
                                targets={activeTargets}
                                supermarketDailyTargets={supermarketDailyTargets}
                                activeSupermarket={activeSupermarket}
                            />

                            {activeSupermarket !== 'Tổng' && (
                                <IndustryView 
                                    ref={industryTableRef}
                                    isRealtime={isRealtimeView} 
                                    realtimeData={industryRealtimeParsed} 
                                    luykeData={industryLuyKeParsed} 
                                />
                            )}
                        </div>
                    )}

                    {activeSubTab === 'competition' && (
                        <CompetitionView
                            ref={competitionViewRef}
                            data={isRealtimeView ? augmentedRealtimeData : augmentedLuyKeData}
                            isRealtime={isRealtimeView}
                            activeSupermarket={activeSupermarket}
                            setActiveSupermarket={setActiveSupermarket}
                            onBatchExport={() => runBatchExport('competition')}
                            isBatchExporting={isBatchExportingCompetition}
                            updateTimestamp={isRealtimeView ? competitionRealtimeTs : competitionLuyKeTs}
                        />
                    )}
                </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
        </div>
    );
};

export default Dashboard;
