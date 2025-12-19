
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Card from '../Card';
import ExportButton from '../ExportButton';
import { SpinnerIcon, ChevronDownIcon, UsersIcon, UploadIcon, ChevronUpIcon } from '../Icons';
import { RevenueRow, Employee, PerformanceChange } from '../../types/nhanVienTypes';
import { roundUp, getYesterdayDateString } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';

const AvatarUploader: React.FC<{ employeeName: string; supermarketName: string }> = ({ employeeName, supermarketName }) => {
    const dbKey = `avatar-${supermarketName}-${employeeName}`;
    const [avatarSrc, setAvatarSrc] = useIndexedDBState<string | null>(dbKey, null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarSrc(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileSelect = () => fileInputRef.current?.click();

    return (
        <div className="relative group w-10 h-10 flex-shrink-0">
            {avatarSrc ? (
                <img src={avatarSrc} alt={`Avatar for ${employeeName}`} className="w-full h-full rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-700" />
            ) : (
                <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center ring-2 ring-slate-300 dark:ring-slate-600">
                    <UsersIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                </div>
            )}
            <button
                onClick={triggerFileSelect}
                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full transition-opacity duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 no-print"
                aria-label={`Thay đổi ảnh đại diện cho ${employeeName}`}
            >
                <UploadIcon className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
            />
        </div>
    );
};

const PerformanceIndicator: React.FC<{ changeInfo?: PerformanceChange }> = ({ changeInfo }) => {
    if (!changeInfo) return null;
    const isPositive = changeInfo.direction === 'up';
    const icon = isPositive ? null : <ChevronDownIcon className="h-4 w-4 text-red-500" />;
    const percentageText = changeInfo.change !== Infinity ? (
        <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
            {changeInfo.change.toFixed(0)}%
        </span>
    ) : null;
    if (!icon && !percentageText) return null;
    return (
        <div className="flex items-center gap-1 text-xs font-bold shrink-0">
            {icon}
            {percentageText}
        </div>
    );
};

const PlaceholderContent: React.FC<{ title: string; message: string; subMessage?: string }> = ({ title, message, subMessage }) => (
    <Card title={title}>
        <div className="mt-4 text-center py-12">
            <div className="flex justify-center items-center">
                <UsersIcon className="h-16 w-16 text-slate-400" />
            </div>
            <p className="mt-4 text-slate-600 max-w-md mx-auto">
                {message}
            </p>
            {subMessage && <p className="mt-2 text-sm text-slate-500">{subMessage}</p>}
        </div>
    </Card>
);

const RevenueView: React.FC<{
    rows: RevenueRow[];
    supermarketName: string;
    departmentName: string;
    performanceChanges: Map<string, PerformanceChange>;
    onViewTrend: (employee: Employee) => void;
}> = ({ rows, supermarketName, departmentName, performanceChanges, onViewTrend }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ key: keyof RevenueRow | '#'; direction: 'asc' | 'desc' }>({ key: 'dtqd', direction: 'desc' });
    const cardRef = useRef<HTMLDivElement>(null);
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            if (rows.length > 0 || !supermarketName) {
                setIsLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [rows, supermarketName]);

    const departmentThresholds = useMemo(() => {
        const deptValuesMap = new Map<string, { dtlk: number[], dtqd: number[] }>();
        rows.forEach(row => {
            if (row.type === 'employee' && row.department) {
                if (!deptValuesMap.has(row.department)) {
                    deptValuesMap.set(row.department, { dtlk: [], dtqd: [] });
                }
                const values = deptValuesMap.get(row.department)!;
                values.dtlk.push(row.dtlk);
                values.dtqd.push(row.dtqd);
            }
        });
        const thresholds = new Map<string, { dtlk: number, dtqd: number }>();
        deptValuesMap.forEach((values, dept) => {
            let dtlkThreshold = -Infinity;
            if (values.dtlk.length > 3) {
                const sortedDtlk = [...values.dtlk].sort((a, b) => a - b);
                const thresholdIndex = Math.floor(sortedDtlk.length * 0.3);
                dtlkThreshold = sortedDtlk[thresholdIndex];
            }
            let dtqdThreshold = -Infinity;
            if (values.dtqd.length > 3) {
                const sortedDtqd = [...values.dtqd].sort((a, b) => a - b);
                const thresholdIndex = Math.floor(sortedDtqd.length * 0.3);
                dtqdThreshold = sortedDtqd[thresholdIndex];
            }
            thresholds.set(dept, { dtlk: dtlkThreshold, dtqd: dtqdThreshold });
        });
        return thresholds;
    }, [rows]);
    
    const filteredAndSortedRows = useMemo(() => {
        const initialData = departmentName === 'all' 
            ? [...rows] 
            : rows.filter(r => r.type === 'total' || r.department === departmentName || r.name === departmentName);
        
        const totalRow = initialData.find(r => r.type === 'total');
        const data = initialData.filter(r => r.type !== 'total');

        const result: (RevenueRow & { rank?: number })[] = [];
        
        const departments = data.filter(r => r.type === 'department');
        const employees = data.filter(r => r.type === 'employee');

        departments.forEach(dept => {
            let employeeBlock = employees.filter(emp => emp.department === dept.name);

            if (sortConfig.key !== '#') {
                employeeBlock.sort((a, b) => {
                    const valA = sortConfig.key === 'name' ? a.originalName || a.name : a[sortConfig.key];
                    const valB = sortConfig.key === 'name' ? b.originalName || b.name : b[sortConfig.key];
                    
                    const compare = typeof valA === 'string' && typeof valB === 'string' 
                        ? valA.localeCompare(valB) 
                        : (valA as number) - (valB as number);

                    return sortConfig.direction === 'asc' ? compare : -compare;
                });
            }
            
            let rankedBlock = employeeBlock.map((emp, index) => ({...emp, rank: index + 1 }));
            
            if (sortConfig.key === '#') {
                if (sortConfig.direction === 'desc') {
                   rankedBlock.sort((a, b) => (b.rank || 0) - (a.rank || 0));
                } else {
                   rankedBlock.sort((a, b) => (a.rank || 0) - (a.rank || 0));
                }
            }
            
            result.push(dept, ...rankedBlock);
        });
        
        if (totalRow) {
            result.push(totalRow);
        }
        
        return result;
    }, [rows, departmentName, sortConfig]);

    const handleSort = (key: keyof RevenueRow | '#') => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' };
        });
    };

    const handleExportPNG = async () => {
        if (!cardRef.current || !(window as any).html2canvas) return;
        const originalCard = cardRef.current;
        const clone = originalCard.cloneNode(true) as HTMLElement;
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '0';
        clone.style.width = '450px';
        clone.style.maxWidth = '450px';
        clone.style.boxShadow = 'none';
        clone.style.margin = '0';
        if (document.documentElement.classList.contains('dark')) {
            clone.classList.add('dark');
        }
        const exportButtonInClone = clone.querySelector('.export-button-component') as HTMLElement | null;
        if (exportButtonInClone) exportButtonInClone.remove();
        const tableElementInClone = clone.querySelector('table');
        clone.classList.add('export-mode');
        if (tableElementInClone) {
            tableElementInClone.classList.add('compact-export-table');
        }
        document.body.appendChild(clone);
        try {
            await new Promise(resolve => setTimeout(resolve, 50));
            const canvas = await (window as any).html2canvas(clone, { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
            });
            const link = document.createElement('a');
            link.download = `DoanhThu_NhanVien_${supermarketName}_${new Date().toISOString().slice(0,10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Failed to export image:', err);
            alert('Đã xảy ra lỗi khi xuất ảnh.');
        } finally {
            document.body.removeChild(clone);
        }
    };
    
    const exportButton = <ExportButton onExportPNG={handleExportPNG} disabled={filteredAndSortedRows.length === 0} />;
    const cardTitle = `LUỸ KẾ DOANH THU QD ĐẾN NGÀY ${getYesterdayDateString()}`;

    if (!supermarketName) return <PlaceholderContent title="Doanh thu Nhân viên" message="Vui lòng chọn một siêu thị để xem dữ liệu doanh thu." />;
    if (isLoading) return <Card title={cardTitle}><div className="flex items-center justify-center py-20"><SpinnerIcon className="h-12 w-12 text-primary-500" /><span className="ml-4 text-lg text-slate-600 dark:text-slate-300">Đang tải...</span></div></Card>;
    if (rows.length === 0) return <PlaceholderContent title={cardTitle} message="Không có dữ liệu doanh thu để hiển thị." subMessage="Vui lòng dán dữ liệu 'Ngành hàng chính - Danh sách' tại trang Cập nhật." />;

    return (
        <div ref={cardRef}>
            <Card title={cardTitle} actionButton={exportButton}>
                <div className="mt-4 w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <table className="min-w-full w-full table-fixed border-collapse">
                        <thead className="bg-sky-100 dark:bg-sky-900/50">
                            <tr>
                                <th className="px-3 py-3.5 text-center w-16 text-base font-bold text-sky-800 dark:text-sky-200 uppercase tracking-wider">
                                    <button onClick={() => handleSort('#')} className="w-full h-full flex items-center justify-center">#</button>
                                </th>
                                <th className="px-4 py-3.5 text-left w-auto text-base font-bold text-sky-800 dark:text-sky-200 uppercase tracking-wider">
                                    <button onClick={() => handleSort('name')} className="w-full h-full flex items-center">NHÂN VIÊN</button>
                                </th>
                                <th className="px-4 py-3.5 text-right w-1/6 text-base font-bold text-sky-800 dark:text-sky-200 uppercase tracking-wider">
                                    <button onClick={() => handleSort('dtlk')} className="w-full h-full flex items-center justify-end">DT THỰC</button>
                                </th>
                                <th className="px-4 py-3.5 text-right w-1/6 text-base font-bold text-sky-800 dark:text-sky-200 uppercase tracking-wider">
                                    <button onClick={() => handleSort('dtqd')} className="w-full h-full flex items-center justify-end">DTQĐ</button>
                                </th>
                                <th className="px-4 py-3.5 text-center w-1/6 text-base font-bold text-sky-800 dark:text-sky-200 uppercase tracking-wider">
                                    <button onClick={() => handleSort('hieuQuaQD')} className="w-full h-full flex items-center justify-center">HQQĐ</button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredAndSortedRows.map((row: RevenueRow & { rank?: number }, index) => {
                            if (row.type === 'total') return null;
                             if (row.type === 'department') {
                                return (
                                    <tr key={row.name} className="bg-sky-50 dark:bg-sky-900/40">
                                        <td colSpan={2} className="px-4 py-2.5 text-left text-base font-semibold text-sky-800 dark:text-sky-300">{row.name}</td>
                                        <td className="px-4 py-2.5 text-right text-base font-semibold text-sky-800 dark:text-sky-300">{f.format(roundUp(row.dtlk))}</td>
                                        <td className="px-4 py-2.5 text-right text-base font-semibold text-sky-800 dark:text-sky-300">{f.format(roundUp(row.dtqd))}</td>
                                        <td className="px-4 py-2.5 text-center text-base font-semibold text-sky-800 dark:text-sky-300">{`${(row.hieuQuaQD * 100).toFixed(0)}%`}</td>
                                    </tr>
                                )
                            }
                            const hieuQuaPercent = row.hieuQuaQD * 100;
                            let hieuQuaClass = '';
                            if (hieuQuaPercent > 35) hieuQuaClass = 'text-green-600 font-bold';
                            else if (hieuQuaPercent >= 30) hieuQuaClass = 'text-yellow-600 font-bold';
                            else hieuQuaClass = 'text-red-500 font-bold';

                            const deptThres = row.department ? departmentThresholds.get(row.department) : undefined;
                            const isBottomDtlk = deptThres && deptThres.dtlk !== -Infinity ? row.dtlk <= deptThres.dtlk : false;
                            const isBottomDtqd = deptThres && deptThres.dtqd !== -Infinity ? row.dtqd <= deptThres.dtqd : false;

                             return (
                                <tr key={row.originalName} className={`hover:bg-slate-50/70 dark:hover:bg-slate-700/50 ${index % 2 !== 0 ? 'bg-sky-50/40 dark:bg-sky-900/20' : ''}`}>
                                    <td className="px-3 py-3 text-center text-xl text-slate-400 dark:text-slate-500">#{row.rank}</td>
                                    <td className="px-4 py-3 text-left">
                                        <div className="flex items-center gap-3">
                                            <div className="avatar-container">
                                                <AvatarUploader employeeName={row.originalName!} supermarketName={supermarketName} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => onViewTrend(row as Employee)} className="employee-name-button text-left font-semibold text-slate-800 dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-400 hover:underline focus:outline-none rounded truncate text-base">
                                                        {row.name}
                                                    </button>
                                                    <div className="performance-indicator flex-shrink-0">
                                                        <PerformanceIndicator changeInfo={performanceChanges.get(row.originalName!)} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right value-cell">
                                        <div className={`font-semibold text-base ${isBottomDtlk ? 'text-red-500 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>{f.format(roundUp(row.dtlk))}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right value-cell">
                                        <div className={`font-semibold text-base ${isBottomDtqd ? 'text-red-500 font-bold' : 'text-sky-600 dark:text-sky-500'}`}>{f.format(roundUp(row.dtqd))}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-base font-bold ${hieuQuaClass}`}>
                                            {hieuQuaPercent.toFixed(0)}%
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                        </tbody>
                        <tfoot>
                            {(() => {
                                const totalRow = filteredAndSortedRows.find(r => r.type === 'total');
                                if (!totalRow) return null;
                                return (
                                    <tr className="bg-sky-100 dark:bg-sky-900/50 font-extrabold text-sky-900 dark:text-sky-100 border-t-2 border-sky-200 dark:border-sky-800">
                                        <td colSpan={2} className="px-4 py-3 text-left text-base uppercase">Tổng cộng</td>
                                        <td className="px-4 py-3 text-right text-base">{f.format(roundUp(totalRow.dtlk))}</td>
                                        <td className="px-4 py-3 text-right text-base">{f.format(roundUp(totalRow.dtqd))}</td>
                                        <td className="px-4 py-3 text-center text-base">{`${(totalRow.hieuQuaQD * 100).toFixed(0)}%`}</td>
                                    </tr>
                                );
                            })()}
                        </tfoot>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default RevenueView;
