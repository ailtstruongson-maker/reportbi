
import React from 'react';
import { SpinnerIcon, CameraIcon } from '../Icons';
import { shortenSupermarketName } from '../../utils/dashboardHelpers';

export const Switch: React.FC<{ checked: boolean; onChange: () => void; id?: string }> = ({ checked, onChange, id }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={onChange}
      className={`${
        checked ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
    >
      <span
        aria-hidden="true"
        className={`${
          checked ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  );

export const GaugeChart: React.FC<{ value: number; label: string; target: number; size?: number; strokeWidth?: number }> = ({ value, label, target, size = 120, strokeWidth = 12 }) => {
    const safeValue = Math.max(0, Math.min(value, 200));
    const displayPercentage = Math.min(safeValue, 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = Math.PI * radius;
    const offset = circumference - (displayPercentage / 100) * circumference;

    let colorClass = 'text-primary-500';
    if (value >= target) colorClass = 'text-green-500';
    else if (value >= target * 0.9) colorClass = 'text-blue-500';
    else colorClass = 'text-red-500';

    return (
        <div className="flex flex-col items-center w-full">
            <div className="relative w-full max-w-[150px]">
                <svg className="w-full" viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`} style={{ overflow: 'visible' }}>
                    <path
                        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                        className="text-slate-200 dark:text-slate-700"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    <path
                        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                        className={`transition-all duration-1000 ease-out ${colorClass}`}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        fill="transparent"
                        style={{
                            strokeDasharray: circumference,
                            strokeDashoffset: offset,
                        }}
                    />
                    <g transform={`rotate(${Math.min(target, 100) * 1.8 - 90} ${size/2} ${size/2})`}>
                       <line x1={size/2} y1={strokeWidth/2 - 2} x2={size/2} y2={-strokeWidth/2 + 2} stroke="currentColor" strokeWidth="2" className="text-slate-400 dark:text-slate-500" />
                    </g>
                </svg>
                <div className="absolute bottom-0 left-0 right-0 text-center">
                    <div className={`font-bold text-2xl ${colorClass}`}>
                        {value.toFixed(0)}<span className="text-lg">%</span>
                    </div>
                </div>
            </div>
            <p className="mt-1 font-semibold text-sm text-slate-700 dark:text-slate-200">{label}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Mục tiêu: {target}%</p>
        </div>
    );
};

export const KpiCard: React.FC<{ title: string; value: string; color: string; children?: React.ReactNode }> = ({ title, value, color, children }) => (
    <div className={`p-3 rounded-lg border flex items-center gap-3 ${color}`}>
        {children}
        <div className="flex-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{title}</p>
            <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);

export const MainTabButton: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; }> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 ${
            isActive
                ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

export const SubTabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; icon?: React.ReactNode; }> = ({ label, isActive, onClick, icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${isActive ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:border-slate-300 dark:text-slate-400 dark:hover:border-slate-600'}`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

export const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
    const percentage = Math.min(Math.max(value, 0), 200);
    const displayPercentage = Math.min(percentage, 100);

    let colorClass = 'bg-primary-500';
    if (value >= 100) colorClass = 'bg-green-500';
    else if (value < 85) colorClass = 'bg-yellow-500';
    if (value < 50) colorClass = 'bg-red-500';

    return (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 my-1 relative overflow-hidden">
            <div
                className={`${colorClass} h-full rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${displayPercentage}%` }}
            ></div>
             {percentage > 100 && (
                <div 
                    className="absolute top-0 left-0 h-full bg-green-300 rounded-full"
                    style={{ width: `${Math.min(percentage - 100, 100)}%` }}
                ></div>
             )}
        </div>
    );
};

export const SupermarketNavBar: React.FC<{
    supermarkets: string[];
    activeSupermarket: string;
    setActiveSupermarket: (sm: string) => void;
    onBatchExport: () => void;
    isBatchExporting: boolean;
}> = ({ supermarkets, activeSupermarket, setActiveSupermarket, onBatchExport, isBatchExporting }) => {
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap mt-6 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 w-full sm:w-auto">
                {['Tổng', ...supermarkets].map(sm => (
                    <button
                        key={sm}
                        onClick={() => setActiveSupermarket(sm)}
                        className={`shrink-0 px-4 py-1.5 text-sm font-semibold rounded-full transition-colors duration-200 ${
                            activeSupermarket === sm
                                ? 'bg-primary-600 text-white shadow'
                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
                        }`}
                    >
                        {sm === 'Tổng' ? 'Tổng Quan' : shortenSupermarketName(sm)}
                    </button>
                ))}
            </div>
            <button
                onClick={onBatchExport}
                disabled={isBatchExporting}
                className="flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-500/10 hover:bg-primary-200 dark:hover:bg-primary-500/20 transition-all duration-200 px-4 py-2 rounded-full disabled:opacity-50 disabled:cursor-wait ml-auto sm:ml-0"
                title="Xuất hàng loạt ảnh cho tất cả siêu thị"
            >
                {isBatchExporting ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : <CameraIcon className="h-5 w-5" />}
                <span>{isBatchExporting ? 'Đang xuất...' : 'Xuất tất cả'}</span>
            </button>
        </div>
    );
};
