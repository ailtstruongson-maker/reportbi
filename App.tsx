
import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import DataUpdater from './components/DataUpdater';
import NhanVien from './components/NhanVien';
import Settings from './components/Settings';
import { ChartPieIcon, UploadIcon, DocumentReportIcon, UsersIcon, CogIcon } from './components/Icons';
import { useSampleDataInitializer } from './hooks/useSampleDataInitializer';
import ThemeToggle from './components/ThemeToggle';
import { useIndexedDBState } from './hooks/useIndexedDBState';

// --- Reusable NavLink Components ---
interface NavLinkProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  isExpanded?: boolean; // Optional for MobileNavLink
}

// NavLink for the new vertical sidebar
const SidebarNavLink: React.FC<NavLinkProps> = ({ isActive, onClick, icon, children, isExpanded }) => (
    <button
      onClick={onClick}
      className={`flex items-center w-full text-sm font-medium rounded-lg transition-colors duration-200 py-2.5 ${
        isExpanded ? 'px-3' : 'justify-center'
      } ${
        isActive
          ? 'text-primary-600 dark:text-primary-400' // Luôn áp dụng màu cho mục đang active
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
      } ${
        isActive && isExpanded ? 'bg-primary-100 dark:bg-primary-500/20' : '' // Chỉ áp dụng nền khi active và mở rộng
      }`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'w-full ml-3' : 'w-0'}`}>
        <span className="whitespace-nowrap">{children}</span>
      </div>
    </button>
  );

// NavLink for the mobile horizontal top bar
const MobileNavLink: React.FC<NavLinkProps> = ({ isActive, onClick, icon, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center flex-1 flex-col gap-1 px-2 py-2 text-xs font-medium rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
  >
    {icon}
    <span>{children}</span>
  </button>
);


const App: React.FC = () => {
  const [activeView, setActiveView] = useIndexedDBState<'dashboard' | 'employee' | 'updater' | 'settings'>('main-active-view', 'dashboard');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const isDataInitialized = useSampleDataInitializer();

  // Loading screen while data is being initialized
  if (!isDataInitialized) {
    return (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 flex items-center justify-center z-50">
            <div className="text-center p-6">
                <DocumentReportIcon className="h-16 w-16 text-primary-400 mx-auto animate-pulse" />
                <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">Khởi tạo ứng dụng...</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải dữ liệu mẫu, vui lòng chờ trong giây lát.</p>
            </div>
        </div>
    );
  }

  const navigationLinks = [
    { id: 'dashboard', icon: <ChartPieIcon className="h-5 w-5" />, label: 'Tổng quan Siêu thị' },
    { id: 'employee', icon: <UsersIcon className="h-5 w-5" />, label: 'Phân tích Nhân viên' },
    { id: 'updater', icon: <UploadIcon className="h-5 w-5" />, label: 'Cập Nhật Dữ Liệu' },
    { id: 'settings', icon: <CogIcon className="h-5 w-5" />, label: 'Cài đặt & Sao lưu' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
        {/* --- Sidebar for Desktop --- */}
        <aside 
            className={`fixed inset-y-0 left-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col hidden md:flex transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'w-64' : 'w-20'}`}
            onMouseEnter={() => setIsSidebarExpanded(true)}
            onMouseLeave={() => setIsSidebarExpanded(false)}
        >
            {/* Logo */}
            <div className="flex items-center h-16 px-6 shrink-0 overflow-hidden">
                <DocumentReportIcon className="h-8 w-8 text-primary-500 flex-shrink-0" />
                <h1 className={`ml-3 text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight whitespace-nowrap transition-opacity duration-200 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0'}`}>
                BI Dashboard
                </h1>
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-2">
            {navigationLinks.map(link => (
                <SidebarNavLink
                key={link.id}
                isActive={activeView === link.id}
                onClick={() => setActiveView(link.id as any)}
                icon={link.icon}
                isExpanded={isSidebarExpanded}
                >
                {link.label}
                </SidebarNavLink>
            ))}
            </nav>
            
            {/* Footer */}
            <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800">
                <div className={`flex items-center transition-all duration-200 ${isSidebarExpanded ? 'justify-between' : 'justify-center'}`}>
                   <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isSidebarExpanded ? 'w-auto' : 'w-0'}`}>
                        <div className="text-xs text-slate-400 whitespace-nowrap">© 2024 - v1.0</div>
                   </div>
                   <ThemeToggle />
                </div>
            </div>
        </aside>

        {/* --- Main Content Area (including mobile header) --- */}
        <div className={`md:transition-all md:duration-300 md:ease-in-out ${isSidebarExpanded ? 'md:ml-64' : 'md:ml-20'} flex flex-col min-h-screen`}>
            {/* --- Mobile Header --- */}
            <header className="md:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between h-16 px-4">
                    <div className="flex items-center gap-3">
                        <DocumentReportIcon className="h-8 w-8 text-primary-500" />
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                            BI Dashboard
                        </h1>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            {/* --- Page Content --- */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
                <div style={{ display: activeView === 'dashboard' ? 'block' : 'none' }}>
                    <Dashboard onNavigateToUpdater={() => setActiveView('updater')} />
                </div>
                <div style={{ display: activeView === 'employee' ? 'block' : 'none' }}>
                    <NhanVien />
                </div>
                <div style={{ display: activeView === 'updater' ? 'block' : 'none' }}>
                    <DataUpdater />
                </div>
                <div style={{ display: activeView === 'settings' ? 'block' : 'none' }}>
                    <Settings />
                </div>
            </main>
             {/* --- Mobile Footer Navigation --- */}
            <nav className="md:hidden bg-white dark:bg-slate-900 p-2 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 z-30">
                <div className="flex items-center justify-around gap-1">
                    {navigationLinks.map(link => (
                    <MobileNavLink
                        key={link.id}
                        isActive={activeView === link.id}
                        onClick={() => setActiveView(link.id as any)}
                        icon={link.icon}
                    >
                        {link.label.split(' ')[0]}
                    </MobileNavLink>
                    ))}
                </div>
            </nav>
        </div>
    </div>
  );
};

export default App;
