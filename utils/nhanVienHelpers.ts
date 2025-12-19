
import { RevenueRow, CompetitionHeader, Criterion, CompetitionDataForCriterion } from '../types/nhanVienTypes';

export const roundUp = (num: number): number => Math.ceil(num);

export const parseNumber = (str: string | undefined): number => {
    if (!str) return 0;
    return parseFloat(String(str).replace(/,/g, '')) || 0;
};

export const shortenName = (name: string): string => {
    const rules: { [key: string]: string } = {
        'Thi đua Iphone 17 series': 'IPHONE 17',
        'BÁN HÀNG PANASONIC': 'Panasonic',
        'Tủ lạnh, tủ đông, tủ mát': 'Tủ lạnh/đông/mát',
        'BÁN HÀNG ĐIỆN TỬ & ĐIỆN LẠNH HÃNG SAMSUNG': 'Samsung ĐT/ĐL',
        'NH MÁY GIẶT, SẤY': 'Máy giặt/sấy',
        'TRẢ CHẬM FECREDIT, TPBANK EVO': 'FE/TPB',
        'PHỤ KIỆN - ĐỒNG HỒ': 'PK - Đồng hồ',
        'ĐIỆN THΟẠI & TABLET ANDROID TRÊN 7 TRIỆU': 'Android > 7Tr',
        'NẠP RÚT TIỀN TÀI KHOẢN NGÂN HÀNG': 'Nạp/Rút NH',
        'Thi đua Vivo': 'Vivo',
        'Thi đua Realme': 'Realme',
        'Đồng hồ thời trang': 'ĐH thời trang',
        'VÍ TRẢ SAU': 'Ví',
        'HOMECREDIT': 'HC',
        'TIỀN MẶT CAKE': 'Cake',
    };
    if (rules[name]) return rules[name];
    if (name.startsWith('BÁN HÀNG ')) {
        return name.replace('BÁN HÀNG ', '').split(' ')[0];
    }
    return name;
};

export const formatEmployeeName = (fullName: string): string => {
    const nameParts = fullName.split(' - ');
    if (nameParts.length < 2) {
        return fullName; // Return original if format is not "Name - ID"
    }
    
    const name = nameParts[0];
    const id = nameParts[1];
    
    const nameWords = name.split(' ').filter(w => w);
    if (nameWords.length < 2) {
        return `${id} - ${name}`; // Handle single-word names
    }
    
    const lastName = nameWords[nameWords.length - 1];
    const middleWords = nameWords.slice(1, nameWords.length - 1);
    
    let initial = '';
    if (middleWords.length > 0) {
        // Use the initial of the last middle name.
        initial = middleWords[middleWords.length - 1].charAt(0).toUpperCase();
    } else {
        // If no middle name, use the initial of the first name.
        initial = nameWords[0].charAt(0).toUpperCase();
    }
        
    return `${id} - ${initial}.${lastName}`;
};

export const getYesterdayDateString = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const day = yesterday.getDate();
    const month = yesterday.getMonth() + 1;
    return `${day}/${month}`;
};

export const parseRevenueData = (danhSachData: string): RevenueRow[] => {
    if (!danhSachData) return [];

    const rows: RevenueRow[] = [];
    let currentDeptDS = '';
    for (const line of String(danhSachData).split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        const parts = trimmed.split('\t');
        const name = parts[0]?.trim() || '';

        if (name === 'Tổng') {
            rows.push({
                type: 'total',
                name: name,
                dtlk: parseNumber(parts[1]),
                dtqd: parseNumber(parts[2]),
                hieuQuaQD: parseNumber(parts[3]),
            });
        } else if (trimmed.startsWith('BP ') && parts.length > 1 && !isNaN(parseNumber(parts[1]))) {
            currentDeptDS = name;
            rows.push({
                type: 'department',
                name: name,
                dtlk: parseNumber(parts[1]),
                dtqd: parseNumber(parts[2]),
                hieuQuaQD: parseNumber(parts[3]),
            });
        } else if (currentDeptDS && name.includes(' - ') && parts.length > 3) {
            rows.push({
                type: 'employee',
                name: formatEmployeeName(name),
                originalName: name,
                department: currentDeptDS,
                dtlk: parseNumber(parts[1]),
                dtqd: parseNumber(parts[2]),
                hieuQuaQD: parseNumber(parts[3]),
            });
        }
    }
    return rows;
};

export const parseCompetitionData = (
    thiDuaData: string,
    employeeDepartmentMap: Map<string, string>
): Record<Criterion, { headers: CompetitionHeader[], employees: { name: string; originalName: string; department: string; values: (number | null)[] }[] }> => {
    const emptyResult: ReturnType<typeof parseCompetitionData> = { DTLK: { headers: [], employees: [] }, DTQĐ: { headers: [], employees: [] }, SLLK: { headers: [], employees: [] } };
    
    if (typeof thiDuaData !== 'string' || !thiDuaData || employeeDepartmentMap.size === 0) {
        return emptyResult;
    }

    const lines = thiDuaData.split('\n').filter(line => line.trim() !== '');
    
    // Tìm dòng chỉ số (Metrics) thông minh hơn: Dòng có tỷ lệ lớn các cột là DTLK/DTQĐ/SLLK
    const metricsRowIndex = lines.findIndex(l => {
        const parts = l.split('\t').map(p => p.trim().toUpperCase());
        const validMetrics = ['DTLK', 'DTQĐ', 'SLLK', 'SL REALTIME'];
        const metricParts = parts.filter(p => validMetrics.includes(p));
        return metricParts.length > 0 && metricParts.length >= parts.length * 0.5;
    });

    if (metricsRowIndex === -1) return emptyResult;
    
    // Tìm dòng Phòng ban thông minh hơn (không phân biệt hoa thường)
    const phongBanIndex = lines.findIndex(l => l.toLowerCase().includes('phòng ban'));
    if (phongBanIndex === -1 || phongBanIndex >= metricsRowIndex) return emptyResult;
    
    const titles = lines.slice(phongBanIndex + 1, metricsRowIndex).map(t => t.trim());
    const metrics = lines[metricsRowIndex].trim().split('\t');
    
    const allHeaders: CompetitionHeader[] = [];
    const count = Math.min(titles.length, metrics.length);
    for (let i = 0; i < count; i++) {
        const metricRaw = metrics[i]?.trim().toUpperCase();
        // Chuẩn hóa metric về đúng Criterion
        let metric = '';
        if (metricRaw === 'DTLK') metric = 'DTLK';
        else if (metricRaw === 'DTQĐ') metric = 'DTQĐ';
        else if (metricRaw === 'SLLK' || metricRaw === 'SL REALTIME') metric = 'SLLK';

        if (metric) {
            const originalTitle = titles[i] || `Unnamed ${i}`;
            allHeaders.push({ title: shortenName(originalTitle), originalTitle, metric });
        }
    }
    
    const result: Record<Criterion, { headers: CompetitionHeader[], employees: any[] }> = {
        DTLK: { headers: allHeaders.filter(h => h.metric === 'DTLK'), employees: [] },
        DTQĐ: { headers: allHeaders.filter(h => h.metric === 'DTQĐ'), employees: [] },
        SLLK: { headers: allHeaders.filter(h => h.metric === 'SLLK'), employees: [] },
    };
    
    const employeeData = new Map<string, { [key in Criterion]: (number | null)[] }>();

    // Phân tích dữ liệu từng nhân viên
    for (const line of lines.slice(metricsRowIndex + 1)) {
        const parts = line.split('\t');
        const namePart = parts[0]?.trim();
        if (!namePart) continue;

        const department = employeeDepartmentMap.get(namePart);
        // Chỉ xử lý nếu tên có trong danh sách nhân viên của siêu thị (có BP) hoặc là dòng 'Tổng'
        if (!department && namePart !== 'Tổng' && !namePart.startsWith('BP ')) continue;
        
        const formattedName = namePart === 'Tổng' ? 'Tổng' : formatEmployeeName(namePart);
        if (!employeeData.has(formattedName)) {
            employeeData.set(formattedName, { DTLK: [], DTQĐ: [], SLLK: [] });
        }
        
        const employeeRecord = employeeData.get(formattedName)!;

        allHeaders.forEach((header, index) => {
            const value = parseNumber(parts[index + 1]);
            employeeRecord[header.metric as Criterion].push(value > 0 ? value : null);
        });
    }

    employeeData.forEach((values, name) => {
        // Tìm tên gốc (full name) để lấy đúng phòng ban
        const originalName = [...employeeDepartmentMap.keys()].find(key => formatEmployeeName(key) === name) || name;
        const department = employeeDepartmentMap.get(originalName) || 'Unknown';

        Object.keys(result).forEach(key => {
            const criterion = key as Criterion;
            result[criterion].employees.push({
                name,
                originalName,
                department,
                values: values[criterion]
            });
        });
    });

    return result;
};

// Type guard to check if an object is a valid Version
export const isVersion = (v: any): v is { name: string, selectedCompetitions: string[] } => {
    return v &&
        typeof v === 'object' &&
        typeof v.name === 'string' &&
        Array.isArray(v.selectedCompetitions) &&
        v.selectedCompetitions.every((c: unknown): c is string => typeof c === 'string');
};
