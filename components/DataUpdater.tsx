import React, { useState, useRef, useEffect } from 'react';
import Card from './Card';
import { CheckCircleIcon, DownloadIcon, XIcon, AlertTriangleIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';
import SupermarketConfig from './SupermarketConfig';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import * as db from '../utils/db';

// --- Validation ---
const SUMMARY_REALTIME_REPORT_HEADER = 'Tên miền	DTLK	DTQĐ	Target (QĐ)	% HT Target (QĐ)';
const SUMMARY_LUYKE_REPORT_HEADER = 'Tên miền	DT Hôm Qua	DTLK	DT Dự Kiến	DTQĐ';
const COMPETITION_REALTIME_REPORT_HEADER = 'Target Ngày	% HT Target Ngày	Xếp hạng trong miền';
const COMPETITION_LUYKE_REPORT_HEADER = 'Target	% HT Target Tháng	% HT Dự Kiến	Xếp hạng trong miền';


const validateSummaryRealtimeReport = (data: string): boolean => {
    return data.includes(SUMMARY_REALTIME_REPORT_HEADER);
};

const validateSummaryLuyKeReport = (data: string): boolean => {
    return data.includes(SUMMARY_LUYKE_REPORT_HEADER);
};

const validateCompetitionRealtimeReport = (data: string): boolean => {
    return data.includes(COMPETITION_REALTIME_REPORT_HEADER);
};

const validateCompetitionLuyKeReport = (data: string): boolean => {
    return data.includes(COMPETITION_LUYKE_REPORT_HEADER);
};


type UpdateCategory = 'BC Tổng hợp' | 'Thi Đua Cụm' | 'Thiết lập và cập nhật dữ liệu cho siêu thị';

interface Update {
    id: string;
    message: string;
    timestamp: string;
    category: UpdateCategory;
}

const NotificationBanner: React.FC<{ updates: Update[] }> = ({ updates }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (updates.length === 0) {
        return null;
    }

    const displayedUpdates = isExpanded ? updates : updates.slice(0, 5);

    const groupedUpdates = displayedUpdates.reduce((acc, update) => {
        if (!acc[update.category]) {
            acc[update.category] = [];
        }
        acc[update.category].push(update);
        return acc;
    }, {} as Record<UpdateCategory, Update[]>);

    const categories = Object.keys(groupedUpdates) as Array<keyof typeof groupedUpdates>;

    return (
        <div className="bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500 dark:border-green-600 text-green-800 dark:text-green-200 p-4 rounded-lg shadow-sm flex items-start space-x-3 mb-8">
            <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
                <p className="font-bold dark:text-green-100">Dữ liệu đã được Cập nhật:</p>
                <div className="mt-2 text-sm space-y-3">
                    {categories.map(category => (
                         <div key={category}>
                            <h4 className="font-semibold text-green-900 dark:text-green-200">{category}:</h4>
                            <ul role="list" className="list-disc pl-5 mt-1 space-y-1">
                                {groupedUpdates[category].map((update) => (
                                    <li key={update.id}>
                                        {update.message} <span className="text-slate-500 dark:text-slate-400 font-normal text-xs">({update.timestamp})</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                {updates.length > 5 && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="mt-4 text-sm font-semibold text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-2 py-1 transition-colors"
                    >
                        {isExpanded ? 'Thu gọn' : `Xem thêm ${updates.length - 5} mục...`}
                    </button>
                )}
            </div>
        </div>
    );
};

const ValidationError: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex items-center text-sm text-red-600 dark:text-red-400 mt-2">
        <AlertTriangleIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
        <span>{message}</span>
    </div>
);


const ReportSection: React.FC<{ 
    title: string; 
    lastUpdated: string | null; 
    placeholder: string; 
    value: string; 
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onClear: () => void;
    error?: string | null;
}> = ({ title, lastUpdated, placeholder, value, onChange, onClear, error }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleClear = () => {
        onClear();
        textareaRef.current?.focus();
    };

    const showOverlay = value && value.length > 0 && lastUpdated && !error;
    
    return (
        <div>
            <div className="mb-2">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</h3>
            </div>
            <div className="relative w-full">
                {showOverlay && (
                    <div className="absolute inset-0 z-10 bg-slate-700/90 rounded-lg flex flex-col items-center justify-center text-white transition-opacity duration-300 ease-in-out">
                        <div className="flex items-center gap-2">
                            <CheckCircleIcon className="h-8 w-8" />
                            <span className="text-lg font-semibold">Đã cập nhật</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-200">
                           Thời gian: {lastUpdated}
                        </p>
                    </div>
                )}
                <textarea
                    ref={textareaRef}
                    className={`
                        w-full h-20 p-3 pr-10 bg-white dark:bg-slate-700 border rounded-lg transition duration-200 resize-none placeholder-slate-400 dark:placeholder-slate-500 text-sm dark:text-slate-200
                        ${error 
                            ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-transparent' 
                            : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-primary dark:focus:ring-primary-400 focus:border-transparent'}
                    `}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${title.toLowerCase().replace(/\s/g, '-')}-error` : undefined}
                ></textarea>
                {value && value.length > 0 && (
                    <button
                        type="button"
                        onClick={handleClear}
                        aria-label="Xoá nội dung"
                        className="absolute top-2 right-2 z-20 p-1 text-slate-400 dark:text-slate-300 rounded-full hover:bg-red-100 dark:hover:bg-red-800/50 hover:text-red-700 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                )}
            </div>
            {error && <ValidationError message={error} />}
        </div>
    );
};


const DataUpdater: React.FC = () => {
    const [summaryRealtime, setSummaryRealtime] = useIndexedDBState('summary-realtime', '');
    const [summaryLuyKe, setSummaryLuyKe] = useIndexedDBState('summary-luy-ke', '');
    const [competitionRealtime, setCompetitionRealtime] = useIndexedDBState('competition-realtime', '');
    const [competitionLuyKe, setCompetitionLuyKe] = useIndexedDBState('competition-luy-ke', '');

    const [summaryRealtimeTs, setSummaryRealtimeTs] = useIndexedDBState<string | null>('summary-realtime-ts', null);
    const [summaryLuyKeTs, setSummaryLuyKeTs] = useIndexedDBState<string | null>('summary-luy-ke-ts', null);
    const [competitionRealtimeTs, setCompetitionRealtimeTs] = useIndexedDBState<string | null>('competition-realtime-ts', null);
    const [competitionLuyKeTs, setCompetitionLuyKeTs] = useIndexedDBState<string | null>('competition-luy-ke-ts', null);

    const [lastUpdates, setLastUpdates] = useIndexedDBState<Update[]>('last-updates-list', []);
    
    const [errors, setErrors] = useState<Record<string, string | null>>({});
    const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);

    const addUpdate = (id: string, message: string, category: UpdateCategory) => {
        const timestamp = new Date().toLocaleString('vi-VN');
        const newUpdate: Update = { id, message, timestamp, category };
        setLastUpdates(prevUpdates => {
            const filteredUpdates = prevUpdates.filter(u => u.id !== id);
            const newUpdates = [newUpdate, ...filteredUpdates];
            return newUpdates.slice(0, 10);
        });
    };
    
    const removeUpdate = (id: string) => {
        setLastUpdates(prevUpdates => prevUpdates.filter(u => u.id !== id));
    };

    const handleThiDuaDataChange = async (supermarketName: string | null, newData: string) => {
        if (!supermarketName) return;
        
        const key = `config-${supermarketName}-thidua`;
        const prevKey = `previous-${key}`;

        const currentData = await db.get(key);
        if (currentData && currentData !== newData) {
            await db.set(prevKey, currentData);
        }
    };


    const [supermarkets, setSupermarkets] = useIndexedDBState<string[]>('supermarket-list', []);
    const [activeSupermarket, setActiveSupermarket] = useState<string | null>(null);

    useEffect(() => {
        if (!summaryLuyKe || !validateSummaryLuyKeReport(summaryLuyKe)) {
            if (supermarkets.length > 0) setSupermarkets([]);
            return;
        }

        const lines = summaryLuyKe.split('\n');
        const extractedNames = lines
            .map(line => (line.split('\t')[0] ?? '').trim())
            .filter(name => name.startsWith('ĐM') && name.includes(' - '));

        const uniqueNames = Array.from(new Set(extractedNames));

        if (uniqueNames.length > 0 && JSON.stringify(uniqueNames.sort()) !== JSON.stringify(supermarkets.sort())) {
             setSupermarkets(uniqueNames);
             setIsConfigCollapsed(false);
        }
    }, [summaryLuyKe, supermarkets, setSupermarkets]);

    useEffect(() => {
        if (supermarkets.length > 0 && (!activeSupermarket || !supermarkets.includes(activeSupermarket))) {
            setActiveSupermarket(supermarkets[0]);
        } else if (supermarkets.length === 0) {
            setActiveSupermarket(null);
        }
    }, [supermarkets, activeSupermarket]);


    const summaryReportButton = (
      <a 
        href="https://bi.thegioididong.com/khoi-ban-hang-sub/-1" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-500/10 hover:bg-primary-200 dark:hover:bg-primary-500/20 transition-all duration-200 px-4 py-2 rounded-full">
        <DownloadIcon className="h-4 w-4" />
        <span>Tải BC Tổng Hợp</span>
      </a>
    );

    const competitionButtons = (
        <div className="flex items-center gap-3">
            <a 
              href="https://bi.thegioididong.com/thi-dua?id=-1&tab=1&rt=1&dm=2&mt=2"
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-500/10 hover:bg-primary-200 dark:hover:bg-primary-500/20 transition-all duration-200 px-4 py-2 rounded-full">
              <DownloadIcon className="h-4 w-4" />
              <span>Tải Realtime</span>
            </a>
            <a 
              href="https://bi.thegioididong.com/thi-dua?id=-1&tab=1&rt=2&dm=2&mt=2"
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-500/10 hover:bg-primary-200 dark:hover:bg-primary-500/20 transition-all duration-200 px-4 py-2 rounded-full">
              <DownloadIcon className="h-4 w-4" />
              <span>Tải Luỹ kế</span>
            </a>
        </div>
      );
      
    const configCardTitle = "Cấu hình Siêu thị & Nhân viên";
    
    const configToggleButton = (
        <button 
            onClick={() => setIsConfigCollapsed(!isConfigCollapsed)} 
            className="p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            aria-label={isConfigCollapsed ? "Mở rộng cấu hình" : "Thu gọn cấu hình"}
        >
            {isConfigCollapsed ? <ChevronDownIcon className="h-5 w-5"/> : <ChevronUpIcon className="h-5 w-5"/>}
        </button>
    );


  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          Cập nhật dữ liệu từ <span className="text-primary-600 dark:text-primary-400">Report BI</span>
        </h1>
      </header>
      
      <div className="space-y-8">
        <NotificationBanner updates={lastUpdates} />

        <Card title="BC Tổng hợp" actionButton={summaryReportButton}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <ReportSection 
                  title="Realtime" 
                  lastUpdated={summaryRealtimeTs}
                  placeholder="Dán dữ liệu realtime tại đây..."
                  value={summaryRealtime}
                  error={errors.summaryRealtime}
                  onChange={(e) => {
                      const val = e.target.value;
                      const isValid = validateSummaryRealtimeReport(val);
                      if (val === '') {
                          setErrors(prev => ({...prev, summaryRealtime: null}));
                          setSummaryRealtime('');
                          setSummaryRealtimeTs(null);
                      } else if (isValid) {
                          setErrors(prev => ({...prev, summaryRealtime: null}));
                          setSummaryRealtime(val);
                          setSummaryRealtimeTs(new Date().toLocaleString('vi-VN'));
                          addUpdate('summary-realtime', 'Realtime', 'BC Tổng hợp');
                      } else {
                           setErrors(prev => ({...prev, summaryRealtime: 'Dữ liệu không đúng định dạng. Vui lòng kiểm tra lại.'}));
                           setSummaryRealtime(val); // show invalid value but don't process it
                           setSummaryRealtimeTs(null);
                           removeUpdate('summary-realtime');
                      }
                  }}
                  onClear={() => {
                      setSummaryRealtime('');
                      setSummaryRealtimeTs(null);
                      removeUpdate('summary-realtime');
                      setErrors(prev => ({...prev, summaryRealtime: null}));
                  }}
              />
              <ReportSection 
                  title="Luỹ kế tháng" 
                  lastUpdated={summaryLuyKeTs}
                  placeholder="Dán dữ liệu luỹ kế tháng tại đây để tạo danh sách siêu thị & bộ phận..."
                  value={summaryLuyKe}
                  error={errors.summaryLuyKe}
                  onChange={(e) => {
                      const val = e.target.value;
                      const isValid = validateSummaryLuyKeReport(val);
                       if (val === '') {
                          setErrors(prev => ({...prev, summaryLuyKe: null}));
                          setSummaryLuyKe('');
                          setSummaryLuyKeTs(null);
                      } else if (isValid) {
                          setErrors(prev => ({...prev, summaryLuyKe: null}));
                          setSummaryLuyKe(val);
                          setSummaryLuyKeTs(new Date().toLocaleString('vi-VN'));
                          addUpdate('summary-luy-ke', 'Luỹ kế tháng', 'BC Tổng hợp');
                      } else {
                           setErrors(prev => ({...prev, summaryLuyKe: 'Dữ liệu không đúng định dạng. Vui lòng kiểm tra lại.'}));
                           setSummaryLuyKe(val);
                           setSummaryLuyKeTs(null);
                           removeUpdate('summary-luy-ke');
                      }
                  }}
                  onClear={() => {
                      setSummaryLuyKe('');
                      setSummaryLuyKeTs(null);
                      removeUpdate('summary-luy-ke');
                      setSupermarkets([]);
                      setErrors(prev => ({...prev, summaryLuyKe: null}));
                  }}
              />
          </div>
        </Card>

        <Card title="Thi Đua Cụm" actionButton={competitionButtons}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <ReportSection 
                  title="Realtime" 
                  lastUpdated={competitionRealtimeTs}
                  placeholder="Dán dữ liệu thi đua realtime tại đây..."
                  value={competitionRealtime}
                  error={errors.competitionRealtime}
                  onChange={(e) => {
                      const val = e.target.value;
                      const isValid = validateCompetitionRealtimeReport(val);
                      if (val === '') {
                          setErrors(prev => ({...prev, competitionRealtime: null}));
                          setCompetitionRealtime('');
                          setCompetitionRealtimeTs(null);
                          removeUpdate('competition-realtime');
                      } else if (isValid) {
                          setErrors(prev => ({...prev, competitionRealtime: null}));
                          setCompetitionRealtime(val);
                          setCompetitionRealtimeTs(new Date().toLocaleString('vi-VN'));
                          addUpdate('competition-realtime', 'Realtime', 'Thi Đua Cụm');
                      } else {
                           setErrors(prev => ({...prev, competitionRealtime: 'Dữ liệu không đúng định dạng. Vui lòng kiểm tra lại.'}));
                           setCompetitionRealtime(val);
                           setCompetitionRealtimeTs(null);
                           removeUpdate('competition-realtime');
                      }
                  }}
                  onClear={() => {
                      setCompetitionRealtime('');
                      setCompetitionRealtimeTs(null);
                      removeUpdate('competition-realtime');
                      setErrors(prev => ({...prev, competitionRealtime: null}));
                  }}
              />
              <ReportSection 
                  title="Luỹ kế tháng" 
                  lastUpdated={competitionLuyKeTs}
                  placeholder="Dán dữ liệu thi đua luỹ kế tháng tại đây..."
                  value={competitionLuyKe}
                  error={errors.competitionLuyKe}
                  onChange={(e) => {
                      const val = e.target.value;
                      const isValid = validateCompetitionLuyKeReport(val);
                      if (val === '') {
                          setErrors(prev => ({...prev, competitionLuyKe: null}));
                          setCompetitionLuyKe('');
                          setCompetitionLuyKeTs(null);
                          removeUpdate('competition-luy-ke');
                      } else if (isValid) {
                          setErrors(prev => ({...prev, competitionLuyKe: null}));
                          setCompetitionLuyKe(val);
                          setCompetitionLuyKeTs(new Date().toLocaleString('vi-VN'));
                          addUpdate('competition-luy-ke', 'Luỹ kế tháng', 'Thi Đua Cụm');
                      } else {
                           setErrors(prev => ({...prev, competitionLuyKe: 'Dữ liệu không đúng định dạng. Vui lòng kiểm tra lại.'}));
                           setCompetitionLuyKe(val);
                           setCompetitionLuyKeTs(null);
                           removeUpdate('competition-luy-ke');
                      }
                  }}
                  onClear={() => {
                      setCompetitionLuyKe('');
                      setCompetitionLuyKeTs(null);
                      removeUpdate('competition-luy-ke');
                      setErrors(prev => ({...prev, competitionLuyKe: null}));
                  }}
              />
          </div>
        </Card>
        
        <Card title={configCardTitle} actionButton={configToggleButton}>
            {!isConfigCollapsed && (
                <div className="mt-4">
                     {supermarkets.length > 0 ? (
                        <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                            <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Supermarkets">
                                {supermarkets.map((supermarket) => (
                                    <button
                                        key={supermarket}
                                        onClick={() => setActiveSupermarket(supermarket)}
                                        className={`shrink-0 ${
                                            activeSupermarket === supermarket
                                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400`}
                                        aria-current={activeSupermarket === supermarket ? 'page' : undefined}
                                    >
                                        {supermarket.replace(/_/g, ' ')}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    ) : (
                        <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Dán dữ liệu từ "BC Tổng hợp - Luỹ kế tháng" vào ô bên trên để tự động tạo danh sách siêu thị.
                            </p>
                        </div>
                    )}
                    <SupermarketConfig
                        supermarketName={activeSupermarket}
                        addUpdate={addUpdate}
                        removeUpdate={removeUpdate}
                        competitionLuyKeData={competitionLuyKe}
                        summaryLuyKeData={summaryLuyKe}
                        onThiDuaDataChange={handleThiDuaDataChange}
                    />
                </div>
            )}
        </Card>
      </div>
    </div>
  );
};

export default DataUpdater;
