
import React, { useState } from 'react';
import Card from '../Card';
import { XIcon, UsersIcon, ArchiveBoxIcon } from '../Icons';
import { BonusMetrics, Employee } from '../../types/nhanVienTypes';
import { parseNumber } from '../../utils/nhanVienHelpers';

interface BonusDataModalProps {
    employee: Employee;
    onClose: () => void;
    onSave: (employeeOriginalName: string, metrics: BonusMetrics) => void;
}

export const BonusDataModal: React.FC<BonusDataModalProps> = ({ employee, onClose, onSave }) => {
    const [pastedData, setPastedData] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSave = () => {
        setError(null);
        if (!pastedData.trim()) {
            setError('Vui lòng dán dữ liệu vào.');
            return;
        }

        const lines = pastedData.split('\n');
        const totalLine = lines.find(line => line.trim().startsWith('Tổng cộng'));

        if (!totalLine) {
            setError('Không tìm thấy dòng "Tổng cộng" trong dữ liệu.');
            return;
        }

        const parts = totalLine.split('\t');
        const diemTichLuy = parseNumber(parts[1]);
        const diemNhapTra = parseNumber(parts[2]);
        const thuongNong = parseNumber(parts[3]);

        if (isNaN(diemTichLuy) || isNaN(diemNhapTra) || isNaN(thuongNong)) {
             setError('Dữ liệu ở các cột Điểm tích lũy, Điểm nhập trả, hoặc Thưởng nóng không hợp lệ.');
             return;
        }

        const dateRows = lines.filter(line => /^\d{2}\/\d{2}\/\d{4}/.test(line.trim()));
        const soNgayDaQua = dateRows.length;

        if (soNgayDaQua === 0) {
            setError('Không tìm thấy ngày nào trong dữ liệu để tính toán dự kiến.');
            return;
        }
        
        const firstDateStr = dateRows[0].split('\t')[0];
        const dateParts = firstDateStr.split('/');
        const dateObj = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
        const soNgayCuaThang = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate();

        const erp = diemTichLuy - diemNhapTra;
        const tNong = thuongNong;
        const tong = erp + tNong;
        const dKien = soNgayDaQua > 0 ? (tong / soNgayDaQua) * soNgayCuaThang : 0;
        const pNong = erp > 0 ? (tNong / erp) * 100 : 0;

        onSave(employee.originalName, { erp, tNong, tong, dKien, pNong });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Cập nhật thưởng cho: {employee.name}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                        <XIcon className="h-5 w-5 text-slate-500"/>
                    </button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Dán dữ liệu báo cáo chi tiết thưởng theo ngày vào ô bên dưới.</p>
                <textarea
                    value={pastedData}
                    onChange={(e) => setPastedData(e.target.value)}
                    placeholder="Dán dữ liệu từ file excel tại đây..."
                    className="w-full h-64 p-3 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-slate-700 text-sm"
                />
                {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                <div className="mt-4 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">Huỷ</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold rounded-md bg-primary-600 text-white hover:bg-primary-700">Lưu</button>
                </div>
            </div>
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

interface BonusViewProps {
    employees: Employee[];
    bonusData: Record<string, BonusMetrics | null>;
    onEmployeeClick: (employee: Employee) => void;
}

export const BonusView: React.FC<BonusViewProps> = ({ employees, bonusData, onEmployeeClick }) => {
    if (employees.length === 0) {
         return <PlaceholderContent title="Bảng thưởng" message="Không có dữ liệu nhân viên để hiển thị bảng thưởng." />;
    }
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

    return (
        <Card title="Bảng theo dõi thưởng nhân viên">
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-700 dark:bg-slate-800 text-white">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Nhân viên</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">ERP</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">T.NÓNG</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">TỔNG</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">D.KIẾN</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">%NÓNG</th>
                        </tr>
                    </thead>
                     <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {employees.map((emp) => {
                            const data = bonusData[emp.originalName];
                            return (
                                <tr key={emp.originalName} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <button onClick={() => onEmployeeClick(emp)} className="font-semibold text-primary-600 dark:text-primary-400 hover:underline text-left">
                                            {emp.name}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">{data ? f.format(data.erp) : '-'}</td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">{data ? f.format(data.tNong) : '-'}</td>
                                    <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">{data ? f.format(data.tong) : '-'}</td>
                                    <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">{data ? f.format(data.dKien) : '-'}</td>
                                    <td className="px-4 py-3 text-right font-bold text-orange-500">{data ? f.format(data.pNong) + '%' : '-'}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};
