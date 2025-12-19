interface CsvHeader {
    key: string;
    label: string;
}

export const exportToCsv = (filename: string, headers: CsvHeader[], data: Record<string, any>[]) => {
    // Function to handle values, ensuring null/undefined become empty strings
    const replacer = (key: string, value: any) => value === null || value === undefined ? '' : value;

    const headerKeys = headers.map(h => h.key);
    
    // Create header row, escaping commas in labels
    const csvHeader = headers.map(h => JSON.stringify(h.label, replacer)).join(',');

    // Create data rows
    const csvRows = data.map(row =>
        headerKeys.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(',')
    );

    // Combine header and rows with a Byte Order Mark (BOM) for UTF-8 compatibility in Excel
    const BOM = "\uFEFF";
    const csvString = BOM + [csvHeader, ...csvRows].join('\r\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
