
import React, { useRef, useState, useMemo } from 'react';
import { ChevronDownIcon, ChevronUpIcon, CameraIcon } from '../Icons';
import { CompetitionHeader, Employee } from '../../types/nhanVienTypes';
import { roundUp } from '../../utils/nhanVienHelpers';

interface CompetitionGroupCardProps {
    header: CompetitionHeader;
    sortedEmployees: Employee[];
    employeeDataMap: Map<string, { name: string; department: string; values: Record<string, number | null> }>;
    employeeCompetitionTargets: Map<string, Map<string, number>>;
    colorScheme: { main: string; light: string; text: string; hover: string; zebra: string; footer: string };
    highlightColorMap: Record<string, string>;
}

export const CompetitionGroupCard: React.FC<CompetitionGroupCardProps> = ({
    header,
    sortedEmployees,
    employeeDataMap,
    employeeCompetitionTargets,
    colorScheme,
    highlightColorMap,
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    type SortKey = 'name' | 'target' | 'actual' | 'completion' | 'remaining';
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'remaining', direction: 'desc' });

    const handleCardSort = (key: SortKey) => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' };
        });
    };

    const getSortIcon = (key: SortKey) => {
        if (sortConfig?.key !== key) return <ChevronDownIcon className="h-4 w-4 ml-1 text-transparent group-hover:text-slate-400" />;
        return sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4 ml-1" /> : <ChevronDownIcon className="h-4 w-4 ml-1" />;
    };
    
    const handleExportPNG = async () => {
        if (!cardRef.current || !(window as any).html2canvas) {
            alert("Thư viện xuất ảnh chưa sẵn sàng. Vui lòng thử lại sau.");
            return;
        }
        
        try {
            const originalCard = cardRef.current;
            const clone = originalCard.cloneNode(true) as HTMLElement;
            
            // Thiết lập clone để đo đạc chiều rộng thực tế dựa trên nội dung
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.width = 'max-content';
            clone.style.minWidth = 'max-content';
            clone.style.maxWidth = 'none';
            clone.style.height = 'auto';
            clone.style.boxShadow = 'none';
            clone.style.margin = '0';
            clone.style.borderRadius = '0';
            clone.style.display = 'inline-block';
            
            if (document.documentElement.classList.contains('dark')) clone.classList.add('dark');
            clone.classList.add('export-mode');
            
            // Loại bỏ nút xuất ảnh trong bản clone
            const exportButton = clone.querySelector('.export-button-component') as HTMLElement | null;
            if (exportButton) exportButton.remove();
            
            // Ép bảng và container của nó hiển thị đầy đủ, không cuộn
            const tableContainer = clone.querySelector('.overflow-x-auto') as HTMLElement | null;
            if (tableContainer) {
                tableContainer.style.overflow = 'visible';
                tableContainer.style.width = 'max-content';
            }

            const tableInClone = clone.querySelector('table') as HTMLElement | null;
            if (tableInClone) {
                tableInClone.style.width = 'max-content';
                tableInClone.style.minWidth = '100%';
            }

            document.body.appendChild(clone);
            
            // Chờ trình duyệt render layout của clone
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // Tính toán width cuối cùng sau khi bảng đã co giãn
            const finalWidth = clone.offsetWidth;
            
            // Đồng bộ tiêu đề với chiều rộng thực tế của bảng
            const headerDiv = clone.querySelector('div:first-child') as HTMLElement;
            if (headerDiv) {
                headerDiv.style.width = '100%';
                headerDiv.style.boxSizing = 'border-box';
                const h4 = headerDiv.querySelector('h4');
                if (h4) {
                    h4.style.paddingLeft = '15px';
                    h4.style.paddingRight = '15px';
                    h4.style.width = '100%';
                }
            }

            const canvas = await (window as any).html2canvas(clone, {
                scale: 2,
                useCORS: true,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
                width: finalWidth,
                windowWidth: finalWidth,
                logging: false
            });

            canvas.toBlob((blob) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `${header.originalTitle.replace(/[\s/]/g, '_')}.png`;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 100);
            }, 'image/png');
            
            document.body.removeChild(clone);
        } catch (err) {
            console.error('Failed to export image', err);
            alert('Đã xảy ra lỗi khi xuất ảnh. Vui lòng thử lại.');
        }
    };
    
    const sortedEmployeesForCard = useMemo(() => {
        const employeesForThisComp = sortedEmployees.filter(emp => {
            const actual = employeeDataMap.get(emp.name)?.values[header.title];
            const target = employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName);
            return actual !== undefined || target !== undefined;
        });

        return [...employeesForThisComp].sort((empA, empB) => {
            const targetA = employeeCompetitionTargets.get(header.originalTitle)?.get(empA.originalName) ?? 0;
            const actualA = employeeDataMap.get(empA.name)?.values[header.title] ?? 0;
            const completionA = targetA > 0 ? (actualA / targetA) * 100 : 0;
            const remainingA = actualA - targetA;

            const targetB = employeeCompetitionTargets.get(header.originalTitle)?.get(empB.originalName) ?? 0;
            const actualB = employeeDataMap.get(empB.name)?.values[header.title] ?? 0;
            const completionB = targetB > 0 ? (actualB / targetB) * 100 : 0;
            const remainingB = actualB - targetB;
            
            let valA, valB;
            switch (sortConfig.key) {
                case 'name':
                    const compare = empA.name.localeCompare(empB.name);
                    return sortConfig.direction === 'asc' ? compare : -compare;
                case 'target': valA = targetA; valB = targetB; break;
                case 'actual': valA = actualA; valB = actualB; break;
                case 'completion': valA = completionA; valB = completionB; break;
                case 'remaining': valA = remainingA; valB = remainingB; break;
                default: return 0;
            }
            const diff = valA - valB;
            return sortConfig.direction === 'asc' ? diff : -diff;
        });
    }, [sortedEmployees, sortConfig, employeeCompetitionTargets, employeeDataMap, header]);

    const formatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
    const employeesByDept = useMemo(() => {
        return sortedEmployeesForCard.reduce((acc, emp) => {
            if (!acc[emp.department]) acc[emp.department] = [];
            acc[emp.department].push(emp);
            return acc;
        }, {} as Record<string, Employee[]>);
    }, [sortedEmployeesForCard]);

    const departmentNames = Object.keys(employeesByDept).sort((a,b) => a.localeCompare(b));
    
    let grandTotalTarget = 0;
    let grandTotalActual = 0;
    sortedEmployeesForCard.forEach(emp => {
        grandTotalTarget += employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
        grandTotalActual += employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
    });
    const grandTotalRemaining = grandTotalActual - grandTotalTarget;
    const grandTotalCompletion = grandTotalTarget > 0 ? (grandTotalActual / grandTotalTarget) * 100 : 0;
    const grandTotalRemainingColor = 'text-white';

    return (
        <div 
            ref={cardRef} 
            className="competition-group-card bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col h-full transition-all"
        >
            <div className={`p-3 ${colorScheme.main} flex justify-center items-center relative rounded-t-lg min-h-[56px]`}>
                <h4 className="text-xl font-bold text-white uppercase text-center whitespace-normal px-10" title={header.originalTitle}>{header.title}</h4>
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <button
                        type="button"
                        onClick={handleExportPNG}
                        className="export-button-component p-2 rounded-full text-white/90 hover:text-white bg-white/20 hover:bg-white/30 focus:outline-none transition-colors shadow-sm backdrop-blur-sm cursor-pointer"
                        title="Xuất ảnh báo cáo (PNG)"
                    >
                        <CameraIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                    <thead>
                        <tr className={`${colorScheme.light} dark:bg-slate-700 ${colorScheme.text} dark:text-slate-300 text-sm font-bold uppercase`}>
                            <th className="text-left px-3 py-2">
                                <button onClick={() => handleCardSort('name')} className="flex items-center w-full group">NHÂN VIÊN{getSortIcon('name')}</button>
                            </th>
                            <th className="text-center px-3 py-2 whitespace-nowrap">
                                <button onClick={() => handleCardSort('target')} className="flex items-center justify-center w-full group">TARGET{getSortIcon('target')}</button>
                            </th>
                            <th className="text-center px-3 py-2 whitespace-nowrap">
                                <button onClick={() => handleCardSort('actual')} className="flex items-center justify-center w-full group">T.HIỆN{getSortIcon('actual')}</button>
                            </th>
                            <th className="text-center px-3 py-2 whitespace-nowrap">
                                <button onClick={() => handleCardSort('completion')} className="flex items-center justify-center w-full group">% HT{getSortIcon('completion')}</button>
                            </th>
                            <th className="text-center px-3 py-2 whitespace-nowrap">
                                <button onClick={() => handleCardSort('remaining')} className="flex items-center justify-center w-full group">CÒN LẠI{getSortIcon('remaining')}</button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {departmentNames.map(deptName => {
                            const employeesInDept = employeesByDept[deptName];
                            const actualValues = employeesInDept.map(emp => {
                                return employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                            }).filter(val => val > 0);
                            actualValues.sort((a, b) => a - b);
                            const bottom30Index = Math.floor(actualValues.length * 0.3);
                            const bottom30Threshold = actualValues.length > 0 ? actualValues[bottom30Index] : -Infinity;

                            let totalTarget = 0;
                            let totalActual = 0;
                            employeesInDept.forEach(emp => {
                                totalTarget += employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
                                totalActual += employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                            });
                            const totalRemaining = totalActual - totalTarget;
                            const totalCompletion = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
                            const totalRemainingColor = totalRemaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                            
                            return (
                                <React.Fragment key={deptName}>
                                    <tr className="bg-slate-100 dark:bg-slate-700">
                                        <td colSpan={5} className="px-3 py-1.5 font-bold text-slate-700 dark:text-slate-200 text-left">
                                            {deptName}
                                        </td>
                                    </tr>
                                    {employeesInDept.map((employee, index) => {
                                        const target = employeeCompetitionTargets.get(header.originalTitle)?.get(employee.originalName) ?? 0;
                                        const actual = employeeDataMap.get(employee.name)?.values[header.title] ?? 0;
                                        const completion = target > 0 ? (actual / target) * 100 : 0;
                                        const remaining = actual - target;
                                        const remainingColor = remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                        const isBottom30 = actual <= bottom30Threshold;
                                        const now = new Date();
                                        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                                        const dayOfMonth = now.getDate();
                                        const timeProgressPercent = ((dayOfMonth - 1) / daysInMonth) * 100;
                                        const completionVal = roundUp(completion);
                                        let percentHighlightClass = '';
                                        if (isBottom30 || completionVal < timeProgressPercent) {
                                            percentHighlightClass = 'text-red-600 font-bold';
                                        } else if (completionVal >= timeProgressPercent * 1.3) {
                                            percentHighlightClass = 'text-green-600 dark:text-green-400 font-bold';
                                        } else {
                                            percentHighlightClass = 'text-yellow-600 dark:text-yellow-400 font-bold';
                                        }
                                        const actualHighlightClass = percentHighlightClass;
                                        const highlightClass = highlightColorMap[employee.originalName] || '';

                                        return (
                                            <tr key={employee.originalName} className={`
                                                ${highlightClass 
                                                    ? `${highlightClass} font-bold border-b border-slate-100 dark:border-slate-700` 
                                                    : `border-b border-slate-100 dark:border-slate-700 ${index % 2 === 0 ? 'bg-white dark:bg-slate-800' : `${colorScheme.zebra} dark:bg-slate-800/50`}`
                                                } 
                                                ${colorScheme.hover} dark:hover:bg-slate-700 transition-colors last:border-b-0`}>
                                                <td className="px-3 py-2 whitespace-normal text-slate-800 dark:text-slate-100 text-left">
                                                    <span>{employee.name}</span>
                                                </td>
                                                <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatter.format(roundUp(target))}</td>
                                                <td className={`px-3 py-2 text-center font-medium whitespace-nowrap ${actualHighlightClass}`}>
                                                    {(!actual || actual === 0) ? '-' : formatter.format(roundUp(actual))}
                                                </td>
                                                <td className={`px-3 py-2 text-center font-bold whitespace-nowrap ${percentHighlightClass}`}>
                                                    {(!actual || actual === 0) ? '-' : `${roundUp(completion).toFixed(0)}%`}
                                                </td>
                                                <td className={`px-3 py-2 text-center font-medium whitespace-nowrap ${remainingColor}`}>{formatter.format(roundUp(remaining))}</td>
                                            </tr>
                                        );
                                    })}
                                    <tr className={`${colorScheme.light} dark:bg-slate-700 font-bold ${colorScheme.text} dark:text-slate-300`}>
                                        <td className="px-3 py-2 text-left">Tổng Nhóm</td>
                                        <td className="px-3 py-2 text-center whitespace-nowrap">{formatter.format(roundUp(totalTarget))}</td>
                                        <td className="px-3 py-2 text-center whitespace-nowrap">{formatter.format(roundUp(totalActual))}</td>
                                        <td className="px-3 py-2 text-center font-bold whitespace-nowrap">{roundUp(totalCompletion).toFixed(0)}%</td>
                                        <td className={`px-3 py-2 text-center whitespace-nowrap ${totalRemainingColor}`}>{formatter.format(roundUp(totalRemaining))}</td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                        <tr className={`${colorScheme.footer} text-white font-bold`}>
                             <td className="px-3 py-2 text-left uppercase border-t border-white/20">TỔNG CỘNG</td>
                             <td className="px-3 py-2 text-center whitespace-nowrap border-t border-white/20">{formatter.format(roundUp(grandTotalTarget))}</td>
                             <td className="px-3 py-2 text-center whitespace-nowrap border-t border-white/20">{formatter.format(roundUp(grandTotalActual))}</td>
                             <td className="px-3 py-2 text-center whitespace-nowrap border-t border-white/20">{roundUp(grandTotalCompletion).toFixed(0)}%</td>
                             <td className={`px-3 py-2 text-center whitespace-nowrap border-t border-white/20 ${grandTotalRemainingColor}`}>{formatter.format(roundUp(grandTotalRemaining))}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
