import React, { useMemo } from 'react';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import { ChevronDownIcon } from './Icons';
import Slider from './Slider';

type UpdateCategory = 'BC Tổng hợp' | 'Thi Đua Cụm' | 'Thiết lập và cập nhật dữ liệu cho siêu thị';

interface TargetHeroProps {
    supermarketName: string;
    addUpdate: (id: string, message: string, category: UpdateCategory) => void;
    departments: { name: string; employeeCount: number }[];
    summaryLuyKeData: string;
}

const TargetHero: React.FC<TargetHeroProps> = ({ supermarketName, addUpdate, departments, summaryLuyKeData }) => {
    const [isExpanded, setIsExpanded] = useIndexedDBState<boolean>(`targethero-${supermarketName}-isExpanded`, true);
    
    const [traGop, setTraGop] = useIndexedDBState<number>(`targethero-${supermarketName}-tragop`, 45);
    const [quyDoi, setQuyDoi] = useIndexedDBState<number>(`targethero-${supermarketName}-quydoi`, 40);
    const [totalTarget, setTotalTarget] = useIndexedDBState<number>(`targethero-${supermarketName}-total`, 100);
    
    const [departmentWeights, setDepartmentWeights] = useIndexedDBState<Record<string, number>>(`targethero-${supermarketName}-departmentweights`, {});
    
    const baseTargetQuyDoi = useMemo(() => {
        if (!summaryLuyKeData) return null;

        const lines = String(summaryLuyKeData).split('\n');
        const supermarketLine = lines.find(line => line.trim().startsWith(supermarketName));

        if (!supermarketLine) return null;

        const columns = supermarketLine.split('\t');
        const dtDuKienQdIndex = 5;
        const htTargetIndex = 6;

        if (columns.length <= Math.max(dtDuKienQdIndex, htTargetIndex)) return null;

        const dtDuKienQdStr = columns[dtDuKienQdIndex]?.replace(/,/g, '') || '0';
        const htTargetStr = columns[htTargetIndex]?.replace('%', '') || '0';

        const dtDuKienQd = parseFloat(dtDuKienQdStr);
        const htTargetPercent = parseFloat(htTargetStr);

        if (isNaN(dtDuKienQd) || isNaN(htTargetPercent) || htTargetPercent === 0) {
            return null;
        }

        return dtDuKienQd / (htTargetPercent / 100);
    }, [summaryLuyKeData, supermarketName]);

    const adjustedTarget = useMemo(() => {
        if (baseTargetQuyDoi === null) return null;
        return baseTargetQuyDoi * (totalTarget / 100);
    }, [baseTargetQuyDoi, totalTarget]);

    const effectiveWeights = useMemo(() => {
        if (!departments || departments.length === 0) {
            return {};
        }
        const hasStoredWeights = departmentWeights && Object.keys(departmentWeights).length > 0;
    
        if (hasStoredWeights) {
            const storedDeptNames = Object.keys(departmentWeights).sort();
            const currentDeptNames = departments.map(d => d.name).sort();
            if (JSON.stringify(storedDeptNames) === JSON.stringify(currentDeptNames)) {
                return departmentWeights;
            }
        }
    
        const equalShare = 100 / departments.length;
        const defaultWeights: Record<string, number> = {};
        departments.forEach(dept => {
            defaultWeights[dept.name] = equalShare;
        });
        return defaultWeights;
    }, [departmentWeights, departments]);


    const resetDepartmentWeights = () => {
        if (departments.length === 0) return;
        const equalShare = 100 / departments.length;
        const newWeights: Record<string, number> = {};
        departments.forEach(dept => {
            newWeights[dept.name] = equalShare;
        });
        setDepartmentWeights(newWeights);
        addUpdate(`targethero-${supermarketName}-dept-reset`, `Reset Phân bổ - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
    };

    const handleDepartmentSliderChange = (departmentName: string) => (newValue: number) => {
        const oldWeights = effectiveWeights || {};
        const oldValue = Number(oldWeights[departmentName]) || 0;
    
        const diff = newValue - oldValue;
        const newWeights: Record<string, number> = { ...oldWeights, [departmentName]: newValue };
        
        const otherDepts = departments.filter(d => d.name !== departmentName);
        if (otherDepts.length > 0) {
            const totalOtherWeight = otherDepts.reduce((sum: number, d) => sum + (Number((oldWeights as any)[d.name]) || 0), 0);

            if (totalOtherWeight > 0.01) { 
                otherDepts.forEach(d => {
                    const currentWeight = Number((oldWeights as any)[d.name]) || 0;
                    const adjustment = diff * (currentWeight / totalOtherWeight);
                    newWeights[d.name] = Math.max(0, currentWeight - adjustment);
                });
            } else {
                const equalShare = -diff / otherDepts.length;
                otherDepts.forEach(d => {
                    newWeights[d.name] = Math.max(0, (Number((oldWeights as any)[d.name]) || 0) + equalShare);
                });
            }
        }
        
        const totalWeight = Object.values(newWeights).reduce((sum, weight) => sum + Number(weight), 0);
        if (totalWeight > 0) {
            for (const name in newWeights) {
                newWeights[name] = (Number(newWeights[name]) / totalWeight) * 100;
            }
        }
        
        setDepartmentWeights(newWeights);
        addUpdate(`targethero-${supermarketName}-dept-${departmentName.replace(/\s/g, '')}`, `Phân bổ (${departmentName}) - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
    };
    
    const totalTargetDisplay = useMemo(() => {
        const percentageChange = totalTarget - 100;

        return (
            <div>
                <span className="font-bold text-primary-600 dark:text-primary-400">
                    {totalTarget.toFixed(0)}%
                    {adjustedTarget !== null && (
                        <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-400">
                            ({new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(adjustedTarget)} tr)
                        </span>
                    )}
                </span>
                {baseTargetQuyDoi !== null && (
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        <span>
                            Gốc: {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(baseTargetQuyDoi)} tr
                        </span>
                        <span className={`ml-2 font-medium ${percentageChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            ({percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(0)}%)
                        </span>
                    </div>
                )}
            </div>
        );
    }, [totalTarget, adjustedTarget, baseTargetQuyDoi]);


    return (
        <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cập Nhật Target Doanh Thu QĐ</h2>
            
            <div id="target-hero-content" className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {/* Cột 1: Điều chỉnh Target */}
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Điều chỉnh Target</h3>
                     <div className="space-y-6">
                        <Slider 
                            label="%Target"
                            value={totalTarget}
                            onChange={(value) => {
                                setTotalTarget(value);
                                addUpdate(`targethero-${supermarketName}-total`, `Target Doanh Thu QĐ (% Target) - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                            }}
                            onReset={() => {
                                setTotalTarget(100);
                                addUpdate(`targethero-${supermarketName}-total-reset`, `Reset Target Doanh Thu QĐ (% Target) - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                            }}
                            min={0}
                            max={300}
                            step={1}
                            unit="%"
                            displayValue={totalTargetDisplay}
                        />
                        <Slider 
                            label="% Trả góp"
                            value={traGop}
                            onChange={(value) => {
                                setTraGop(value);
                                addUpdate(`targethero-${supermarketName}-tragop`, `Target Doanh Thu QĐ (% Trả góp) - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                            }}
                            onReset={() => {
                                setTraGop(45);
                                addUpdate(`targethero-${supermarketName}-tragop-reset`, `Reset Target Doanh Thu QĐ (% Trả góp) - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                            }}
                            min={0}
                            max={100}
                            step={1}
                            unit="%"
                        />
                        <Slider 
                            label="% Quy đổi"
                            value={quyDoi}
                            onChange={(value) => {
                                setQuyDoi(value);
                                addUpdate(`targethero-${supermarketName}-quydoi`, `Target Doanh Thu QĐ (% Quy đổi) - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                            }}
                            onReset={() => {
                                setQuyDoi(40);
                                addUpdate(`targethero-${supermarketName}-quydoi-reset`, `Reset Target Doanh Thu QĐ (% Quy đổi) - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                            }}
                            min={0}
                            max={100}
                            step={1}
                            unit="%"
                        />
                     </div>
                </div>

                {/* Cột 2: Phân bổ Target */}
                <div className="space-y-4 md:pl-8 md:border-l md:border-slate-200 dark:md:border-slate-700">
                     <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Phân bổ Target theo Tỷ trọng</h3>
                     <div className="space-y-6">
                        {departments && departments.length > 0 ? (
                            departments.map(dept => {
                                const weight = (effectiveWeights as any)[dept.name] ?? 0;
                                const allocatedTarget = adjustedTarget !== null ? adjustedTarget * (weight / 100) : null;
                                const targetPerEmployee = (allocatedTarget !== null && dept.employeeCount > 0)
                                    ? allocatedTarget / dept.employeeCount
                                    : null;

                                const displayContent = (
                                    <div>
                                        <span className="font-bold text-primary-600 dark:text-primary-400">
                                            {weight.toFixed(1)}%
                                        </span>
                                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                            {allocatedTarget !== null && (
                                                <div>Phân bổ: {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(allocatedTarget)} tr</div>
                                            )}
                                            {targetPerEmployee !== null && (
                                                <div>Mục tiêu/bạn: {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(targetPerEmployee)} tr</div>
                                            )}
                                        </div>
                                    </div>
                                );

                                return (
                                    <Slider 
                                        key={dept.name}
                                        label={`${dept.name} (${dept.employeeCount} bạn)`}
                                        value={weight}
                                        onChange={handleDepartmentSliderChange(dept.name)}
                                        onReset={resetDepartmentWeights}
                                        displayValue={displayContent}
                                        max={100}
                                        step={0.1}
                                        unit="%"
                                    />
                                );
                            })
                        ) : (
                            <div className="text-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Dán dữ liệu vào ô "Ngành hàng chính - Danh sách" để hiển thị các bộ phận cần phân bổ.
                                </p>
                            </div>
                        )}
                     </div>
                </div>
            </div>
        </section>
    );
};

export default TargetHero;