
import React from 'react';
import { SubTab } from '../../utils/dashboardHelpers';
import { SubTabButton } from './DashboardWidgets';
import { ChartBarIcon, UsersIcon } from '../Icons';

interface DashboardToolbarProps {
    id: string;
    activeSubTab: SubTab;
    setActiveSubTab: (tab: SubTab) => void;
}

const DashboardToolbar: React.FC<DashboardToolbarProps> = ({ 
    id,
    activeSubTab, 
    setActiveSubTab, 
}) => {
    return (
        <div id={id} className="border-b border-slate-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <SubTabButton 
                    icon={<ChartBarIcon className="h-5 w-5"/>} 
                    label="Doanh thu" 
                    isActive={activeSubTab === 'revenue'} 
                    onClick={() => setActiveSubTab('revenue')} 
                />
                <SubTabButton 
                    icon={<UsersIcon className="h-5 w-5"/>} 
                    label="Thi đua" 
                    isActive={activeSubTab === 'competition'} 
                    onClick={() => setActiveSubTab('competition')} 
                />
            </nav>
        </div>
    );
};

export default DashboardToolbar;
