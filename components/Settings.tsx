
import React, { useState, useRef, useEffect } from 'react';
import Card from './Card';
import { DownloadIcon, UploadIcon, AlertTriangleIcon, SpinnerIcon, TrashIcon, CheckCircleIcon, SaveIcon } from './Icons';
import * as db from '../utils/db';

interface SnapshotMetadata {
    id: string;
    name: string;
    date: string;
}

interface BackupMetadata {
    appName: string;
    version: string;
    timestamp: string;
    deviceInfo: string;
    stats: {
        totalItems: number;
        snapshots: number;
        targets: number; 
        configs: number; 
        reports: number; 
    };
}

interface BackupFileContent {
    metadata?: BackupMetadata;
    data: { key: string; value: any }[];
}

const Settings: React.FC = () => {
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [allSnapshots, setAllSnapshots] = useState<Record<string, SnapshotMetadata[]>>({});
    const [restoreLogs, setRestoreLogs] = useState<string[]>([]);

    useEffect(() => {
        const fetchSnapshots = async () => {
            setIsLoading('snapshots');
            try {
                const allData = await db.getAll();
                const snapshotMetadata = allData.filter(item => item.key.startsWith('snapshots-'));
                
                const groupedSnapshots: Record<string, SnapshotMetadata[]> = {};
                snapshotMetadata.forEach(item => {
                    const supermarketName = item.key.replace('snapshots-', '');
                    if (Array.isArray(item.value)) {
                        groupedSnapshots[supermarketName] = item.value.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    }
                });
                setAllSnapshots(groupedSnapshots);
            } catch (error) {
                console.error("Failed to fetch snapshots", error);
            } finally {
                setIsLoading(null);
            }
        };
        fetchSnapshots();
    }, []);

    const addLog = (message: string) => {
        const time = new Date().toLocaleTimeString();
        setRestoreLogs(prev => [`[${time}] ${message}`, ...prev]);
    };

    const handleBackup = async () => {
        setIsLoading('backup');
        try {
            // 1. Get ALL data from IndexedDB
            const allData = await db.getAll();
            
            // 2. Statistics for metadata
            const stats = {
                totalItems: allData.length,
                snapshots: allData.filter(i => i.key.includes('snapshot')).length,
                targets: allData.filter(i => i.key.startsWith('targethero-') || i.key.startsWith('comptarget-')).length,
                reports: allData.filter(i => i.key.startsWith('summary-') || i.key.startsWith('competition-') || i.key.startsWith('config-')).length,
                configs: allData.filter(i => 
                    !i.key.includes('snapshot') && 
                    !i.key.startsWith('targethero-') && 
                    !i.key.startsWith('comptarget-') && 
                    !i.key.startsWith('summary-') && 
                    !i.key.startsWith('competition-') &&
                    !i.key.startsWith('config-')
                ).length
            };

            const backupPayload: BackupFileContent = {
                metadata: {
                    appName: "eportBI_tools",
                    version: "1.5",
                    timestamp: new Date().toISOString(),
                    deviceInfo: navigator.userAgent,
                    stats: stats
                },
                data: allData
            };

            // 3. Create download file
            const jsonString = JSON.stringify(backupPayload, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            a.download = `eportBI_FullBackup_${dateStr}.json`;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert(`✅ SAO LƯU THÀNH CÔNG!\n\nFile chứa đầy đủ dữ liệu để chuyển sang máy khác:\n\n- 🎯 Cấu hình Target: ${stats.targets} mục\n- 📸 Snapshots lịch sử: ${stats.snapshots} mục\n- 📊 Báo cáo đã nhập: ${stats.reports} mục\n- ⚙️ Cài đặt khác: ${stats.configs} mục`);

        } catch (error) {
            console.error('Backup failed:', error);
            alert('Sao lưu thất bại. Vui lòng thử lại.');
        } finally {
            setIsLoading(null);
        }
    };

    const handleRestore = () => {
        setRestoreLogs([]); // Clear previous logs
        addLog("Bắt đầu quy trình khôi phục...");
        // Reset input value to ensure onChange fires even if the same file is selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            addLog("Người dùng hủy chọn file.");
            return;
        }

        // Bỏ qua xác nhận, thực hiện luôn
        setIsLoading('restore');
        addLog(`Đang đọc file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)...`);
        
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const content = e.target?.result;
                if (typeof content !== 'string') throw new Error('Không thể đọc nội dung file (định dạng không hợp lệ).');
                
                addLog("Đọc file thành công. Đang phân tích JSON...");
                
                let parsedContent;
                try {
                    parsedContent = JSON.parse(content);
                } catch (jsonError) {
                    throw new Error('File không đúng định dạng JSON. Vui lòng kiểm tra lại file backup.');
                }

                let dataToRestore: { key: string; value: any }[] = [];
                let restoreInfo = "";

                // Determine backup format version
                if (Array.isArray(parsedContent)) {
                    // Legacy format (Root is an array)
                    dataToRestore = parsedContent;
                    restoreInfo = "File backup phiên bản cũ (Legacy).";
                    addLog(`Phát hiện định dạng cũ. Số lượng mục: ${dataToRestore.length}`);
                } else if (parsedContent.data && Array.isArray(parsedContent.data)) {
                    // New format (Root object with metadata)
                    dataToRestore = parsedContent.data;
                    const meta = parsedContent.metadata;
                    if (meta) {
                        restoreInfo = `Backup lúc: ${new Date(meta.timestamp).toLocaleString('vi-VN')}\nPhiên bản App: ${meta.version || 'Unknown'}`;
                        addLog(`Phát hiện định dạng v${meta.version || '?'}. Số lượng mục: ${dataToRestore.length}`);
                        if (meta.stats) {
                            addLog(`Thông tin backup: ${meta.stats.targets} targets, ${meta.stats.snapshots} snapshots.`);
                        }
                    }
                } else {
                    throw new Error('Cấu trúc file backup không hợp lệ (Thiếu trường data).');
                }

                if (dataToRestore.length === 0) {
                    throw new Error('File backup không chứa dữ liệu nào.');
                }

                addLog("Đang xóa dữ liệu cũ trong IndexedDB...");
                await db.clearStore();
                addLog("Đã xóa dữ liệu cũ.");
                
                addLog(`Đang ghi ${dataToRestore.length} mục vào cơ sở dữ liệu (Bulk Insert)...`);
                
                // Use db.setMany for efficient transaction handling
                await db.setMany(dataToRestore);
                
                addLog("Ghi dữ liệu thành công!");
                
                // --- SOFT NAVIGATION RELOAD STRATEGY ---
                // Thay vì reload trang (gây lỗi file not found), ta cập nhật state DB và bắn event
                
                const navState = {
                    'main-active-view': 'dashboard',
                    'dashboard-main-tab': 'realtime',
                    'dashboard-sub-tab': 'revenue',
                    'dashboard-active-supermarket': 'Tổng'
                };

                // 1. Cập nhật các key điều hướng trong DB
                for (const [key, value] of Object.entries(navState)) {
                    await db.set(key, value);
                }
                
                addLog("Đã thiết lập trạng thái chuyển hướng.");

                // 2. Bắn tín hiệu sự kiện (CustomEvent) để các Hook useIndexedDBState ở App.tsx và Dashboard.tsx tự cập nhật
                // Chúng ta cần bắn event cho cả keys điều hướng và keys dữ liệu quan trọng để Dashboard render lại
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

                addLog("Đã gửi tín hiệu cập nhật giao diện (Soft Reload).");

                alert(`✅ KHÔI PHỤC THÀNH CÔNG!\n\n${restoreInfo}\n\nỨng dụng sẽ tự động chuyển về màn hình chính.`);
                
                // Không dùng window.location.reload() nữa để tránh lỗi mất file context

            } catch (error) {
                console.error('Restore failed:', error);
                const errorMsg = error instanceof Error ? error.message : 'Lỗi không xác định';
                addLog(`❌ LỖI: ${errorMsg}`);
                alert(`Khôi phục thất bại:\n${errorMsg}`);
                setIsLoading(null);
            } finally {
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        
        reader.onerror = () => {
            addLog("Lỗi trình duyệt khi đọc file.");
            alert('Lỗi khi đọc file từ hệ thống.');
            setIsLoading(null);
        };
        
        reader.readAsText(file);
    };

    const handleDeleteSnapshot = async (supermarket: string, snapshotId: string) => {
        if (!confirm('Bạn có chắc chắn muốn xoá snapshot này không?')) {
            return;
        }

        try {
            const metadataKey = `snapshots-${supermarket}`;
            const dataKey = `snapshot-data-${supermarket}-${snapshotId}`;
            
            const currentMetadata: SnapshotMetadata[] = await db.get(metadataKey) || [];
            const updatedMetadata = currentMetadata.filter(meta => meta.id !== snapshotId);

            await db.set(metadataKey, updatedMetadata);
            await db.deleteEntry(dataKey);
            
            setAllSnapshots(prev => ({
                ...prev,
                [supermarket]: updatedMetadata
            }));

        } catch (error) {
            console.error("Failed to delete snapshot", error);
            alert("Xoá snapshot thất bại.");
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Cài đặt & Quản lý</h1>
            </header>

            <Card title="Sao lưu & Khôi phục (Chuyển thiết bị)">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                    Tính năng này giúp bạn chuyển toàn bộ dữ liệu làm việc sang máy tính khác hoặc lưu trữ an toàn. 
                    File backup bao gồm: <span className="font-bold text-slate-700 dark:text-slate-300">Tất cả Báo cáo, Snapshot lịch sử, và các Cấu hình Target Doanh thu/Thi đua</span> bạn đã thiết lập.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={handleBackup}
                        disabled={!!isLoading}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-semibold rounded-lg shadow-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isLoading === 'backup' ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : <SaveIcon className="h-5 w-5" />}
                        <span>Sao lưu Toàn bộ (.json)</span>
                    </button>
                    <button
                        onClick={handleRestore}
                        disabled={!!isLoading}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 dark:border-slate-600 text-base font-semibold rounded-lg shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isLoading === 'restore' ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : <UploadIcon className="h-5 w-5" />}
                        <span>Khôi phục từ File</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-600 rounded-r-lg">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <CheckCircleIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-bold text-blue-800 dark:text-blue-200">Hướng dẫn chuyển thiết bị</h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                1. Trên máy cũ: Nhấn nút <strong>Sao lưu Toàn bộ</strong> để tải file về.<br/>
                                2. Gửi file đó sang máy mới (qua Zalo, Email, USB...).<br/>
                                3. Trên máy mới: Vào mục Cài đặt -> Nhấn <strong>Khôi phục từ File</strong> và chọn file vừa tải.
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* LOG VIEWER: Useful for debugging restore issues or showing progress for large backups */}
            {restoreLogs.length > 0 && (
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs overflow-hidden shadow-lg border border-slate-700 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-700">
                        <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${isLoading ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></div>
                            <span className="text-slate-300 font-bold uppercase tracking-wider">Nhật ký hệ thống</span>
                        </div>
                        <button 
                            onClick={() => setRestoreLogs([])} 
                            className="text-slate-500 hover:text-slate-300 transition-colors text-xs uppercase"
                        >
                            Xóa log
                        </button>
                    </div>
                    <div className="h-48 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        {restoreLogs.map((log, index) => (
                            <div key={index} className={`${log.includes('LỖI') ? 'text-red-400' : (log.includes('thành công') ? 'text-green-400' : 'text-slate-300')}`}>
                                <span className="opacity-50 mr-2">{index + 1}.</span> {log}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Card title="Quản lý Snapshots (Lịch sử lưu)">
                <div className="mt-4 space-y-6">
                    {isLoading === 'snapshots' ? (
                        <div className="flex justify-center items-center py-8">
                            <SpinnerIcon className="h-8 w-8 text-primary-500 animate-spin" />
                            <span className="ml-2 text-slate-500">Đang tải snapshot...</span>
                        </div>
                    ) : Object.keys(allSnapshots).length > 0 ? (
                        Object.entries(allSnapshots).map(([supermarket, snapshots]) => (
                            Array.isArray(snapshots) && snapshots.length > 0 && (
                                <div key={supermarket} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-600 pb-2 mb-3">
                                        <div className="p-1 bg-green-100 dark:bg-green-900/50 rounded text-green-600 dark:text-green-400">
                                            <CheckCircleIcon className="h-4 w-4"/>
                                        </div>
                                        <h3 className="text-md font-bold text-slate-700 dark:text-slate-200">{supermarket}</h3>
                                        <span className="text-xs font-medium px-2 py-0.5 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-full text-slate-600 dark:text-slate-300 ml-auto">{snapshots.length} bản lưu</span>
                                    </div>
                                    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {snapshots.map(snapshot => (
                                            <li key={snapshot.id} className="py-3 flex items-center justify-between group hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded px-2 -mx-2 transition-colors">
                                                <div>
                                                    <p className="font-medium text-slate-800 dark:text-slate-100 text-sm">{snapshot.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Lưu lúc: {new Date(snapshot.date).toLocaleString('vi-VN')}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteSnapshot(supermarket, snapshot.id)}
                                                    className="p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    title="Xoá snapshot này"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )
                        ))
                    ) : (
                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có snapshot nào được lưu.</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Sử dụng nút "Lưu Snapshot" tại màn hình Phân tích Nhân viên để tạo điểm khôi phục.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Settings;
