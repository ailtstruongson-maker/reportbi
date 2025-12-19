
import React from 'react';
import { MainTab } from '../../utils/dashboardHelpers';
import { MainTabButton } from './DashboardWidgets';
import { LineChartIcon, ArchiveBoxIcon } from '../Icons';

interface DashboardHeaderProps {
    title: string;
    activeMainTab: MainTab;
    setActiveMainTab: (tab: MainTab) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ title, activeMainTab, setActiveMainTab }) => {
    return (
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
                <h1 id="dashboard-title" className="text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{title}</h1>
            </div>
            <div id="main-tabs-container" className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                <MainTabButton 
                    icon={<LineChartIcon className="h-5 w-5" />} 
                    label="Realtime" 
                    isActive={activeMainTab === 'realtime'} 
                    onClick={() => setActiveMainTab('realtime')} 
                />
                <MainTabButton 
                    icon={<ArchiveBoxIcon className="h-5 w-5" />} 
                    label="Luỹ kế" 
                    isActive={activeMainTab === 'cumulative'} 
                    onClick={() => setActiveMainTab('cumulative')} 
                />
            </div>
        </header>
    );
};

export default DashboardHeader;
