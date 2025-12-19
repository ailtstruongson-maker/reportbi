import React, { useState } from 'react';
import { CameraIcon, SpinnerIcon } from './Icons';

interface ExportButtonProps {
  onExportPNG: () => Promise<void>;
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ onExportPNG, disabled = false }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    if (disabled || isLoading) return;
    setIsLoading(true);
    await onExportPNG();
    setIsLoading(false);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || isLoading}
      className="export-button-component p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Xuất ảnh báo cáo"
      title="Xuất ảnh báo cáo (PNG)"
    >
      {isLoading ? (
        <SpinnerIcon className="h-5 w-5" />
      ) : (
        <CameraIcon className="h-5 w-5" />
      )}
    </button>
  );
};

export default ExportButton;
