
// --- TYPES ---
export interface SupermarketCompetitionData {
    headers: string[];
    programs: { name: string; data: (string | number)[]; metric: string }[];
}

export type MainTab = 'realtime' | 'cumulative';
export type SubTab = 'revenue' | 'competition';
export type Criterion = 'DTLK' | 'DTQĐ' | 'SLLK';

// --- HELPER FUNCTIONS ---
export const roundUp = (num: number): number => {
    if (num > -1e-9 && num < 0) {
        return 0;
    }
    return Math.ceil(num);
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
        'ĐIỆN THOẠI & TABLET ANDROID TRÊN 7 TRIỆU': 'Android > 7Tr',
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

export const shortenSupermarketName = (name: string): string => {
    if (!name || !name.includes(' - ')) {
        return name;
    }
    let shortName = name.split(' - ').pop()?.trim() || '';
    shortName = shortName.replace(/^(Thửa\s*)?\d+\s*/, '').replace(/Thử/g, '').trim();
    return shortName;
};

export const parseNumber = (str: any): number => {
    if (str === null || str === undefined) return 0;
    if (typeof str === 'number') return str;
    const num = parseFloat(String(str).replace(/,/g, '').replace('%', ''));
    return isNaN(num) ? 0 : num;
};

// --- DATA PARSERS ---

export const parseSummaryData = (text: string) => {
    if (!text) return { kpis: {}, table: { headers: [], rows: [] } };
    const lines = text.split('\n');
    const kpis: Record<string, string> = {};
    
    const kpiRegexes: Record<string, RegExp> = {
        dtlk: /DTLK\s+DTLK\s+([\d,.]+)/,
        dtqd: /Doanh thu quy đổi\s+DTQĐ\s+([\d,.]+)/,
        targetQD: /Target \(QĐ\)\s+([\d,.]+)/,
        htTargetQD: /% HT Target \(QĐ\)\s+([\d,.]+%)/,
        tyTrongTraGop: /Tỷ Trọng Trả Góp\s+([\d,.]+%)/,
        dtDuKien: /DT Dự Kiến\s+([\d,.]+)/,
        dtDuKienQD: /DT Dự Kiến \(QĐ\)\s+([\d,.]+)/,
        htTargetDuKienQD: /% HT Target Dự Kiến \(QĐ\)\s+([\d,.]+%)/,
        lkhach: /Lượt Khách LK\s+([\d,.]+)/,
        lbill: /Lượt bill\s+([\d,.]+)/,
        lbillBH: /Lượt Bill Bán Hàng\s+([\d,.]+)/,
        lbillTH: /Lượt Bill Thu Hộ\s+([\d,.]+)/,
        tlpv: /TLPV Thành công\s+([\d,.]+%)/,
    };

    const textContent = lines.join('\n');
    for(const key in kpiRegexes) {
        const match = textContent.match(kpiRegexes[key]);
        if (match && match[1]) kpis[key] = match[1];
    }
    
    let headerIndex = lines.findIndex(line => line.trim().startsWith('Tên miền	'));
    if (headerIndex === -1) return { kpis, table: { headers: [], rows: [] } };
    
    const headers = lines[headerIndex].trim().split('	');
    const rows: string[][] = [];

    const secondHeaderIndex = lines.findIndex((line, index) => index > headerIndex && line.trim().startsWith('Tên miền	'));
    const endIndex = secondHeaderIndex !== -1 ? secondHeaderIndex : lines.length;

    for (let i = headerIndex + 1; i < endIndex; i++) {
        const line = lines[i].trim();
        if (line.startsWith('Tổng') || line.startsWith('ĐM')) {
            rows.push(line.split('	'));
        } else if(line.startsWith('Hỗ trợ BI')) {
            break;
        }
    }

    return { kpis, table: { headers, rows } };
};

export const parseCompetitionDataBySupermarket = (text: string) => {
    if (!text) return {};
    const supermarketData: Record<string, SupermarketCompetitionData> = {};
    const lines = text.split('\n');
    let currentCompetition: string | null = null;
    let currentHeaders: string[] = [];
    let currentMetric: string = '';
    
    const headerKeywords = ['Target Ngày', '% HT Target Ngày', 'Target', '% HT Target Tháng'];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) { currentCompetition = null; continue; }
        const parts = trimmedLine.split('	');
        const isHeader = headerKeywords.some(kw => trimmedLine.includes(kw)) && parts.length > 2;

        if (isHeader) {
            currentCompetition = parts[0];
            currentHeaders = parts.slice(1);

            const firstHeader = parts[1].trim();
            if (firstHeader.includes('DTQĐ') || firstHeader.includes('DT Realtime (QĐ)')) {
                currentMetric = 'DTQĐ';
            } else if (firstHeader.includes('SLLK') || firstHeader.includes('SL Realtime')) {
                currentMetric = 'SLLK';
            } else if (firstHeader.includes('DTLK') || firstHeader.includes('DT Realtime')) {
                currentMetric = 'DTLK';
            } else {
                currentMetric = '';
            }
        } else if (currentCompetition && (trimmedLine.startsWith('ĐM') || trimmedLine.startsWith('Tổng'))) {
            const supermarketName = parts[0];
            const programData = parts.slice(1);
            if (!supermarketData[supermarketName]) {
                supermarketData[supermarketName] = { headers: [], programs: [] };
            }
            supermarketData[supermarketName].headers = currentHeaders;
            supermarketData[supermarketName].programs.push({ name: currentCompetition, data: programData, metric: currentMetric });
        }
    }
    for (const sm in supermarketData) {
        supermarketData[sm].programs.sort((a, b) => a.name.localeCompare(b.name));
    }
    return supermarketData;
};

export const parseIndustryRealtimeData = (text: string): { headers: string[], rows: string[][] } => {
    if (!text) return { headers: [], rows: [] };
    const lines = text.split('\n');
    const headerIndex = lines.findIndex(line => line.trim().startsWith('Nhóm ngành hàng	SL Realtime'));
    if (headerIndex === -1) return { headers: [], rows: [] };
    
    const headers = lines[headerIndex].trim().split('	');
    const rows = lines.slice(headerIndex + 1)
        .map(l => l.trim())
        .filter(l => l.startsWith('NNH ') || l.startsWith('Tổng'))
        .map(l => l.split('	'));
    return { headers, rows };
};

export const parseIndustryLuyKeData = (text: string) => {
    const result = { kpis: { laiGopQDDuKien: 'N/A', chiPhi: 'N/A', targetLNTT: 'N/A', htTargetDuKienLNTT: 'N/A' }, table: { headers: [] as string[], rows: [] as string[][] } };
    if (!text) return result;
    const lines = text.split('\n');
    
    const kpiBlock = lines.join('\n');
    const laiGopMatch = kpiBlock.match(/Lãi gộp QĐ Dự kiến\s+([\d,.]+)/);
    if(laiGopMatch) result.kpis.laiGopQDDuKien = laiGopMatch[1];
    const chiPhiMatch = kpiBlock.match(/Chi phí\s+([\d,.]+)/);
    if(chiPhiMatch) result.kpis.chiPhi = chiPhiMatch[1];
    const targetLNTTMatch = kpiBlock.match(/Target LNTT\s+([\d,.]+)/);
    if(targetLNTTMatch) result.kpis.targetLNTT = targetLNTTMatch[1];
    const htTargetMatch = kpiBlock.match(/%HT Target Dự kiến \(LNTT\)\s+([\d,.]+%)/);
    if(htTargetMatch) result.kpis.htTargetDuKienLNTT = htTargetMatch[1];


    const headerIndex = lines.findIndex(line => line.trim().startsWith('Nhóm ngành hàng	Số lượng	DTQĐ'));
    if (headerIndex === -1) return result;
    result.table.headers = lines[headerIndex].trim().split('	');
    result.table.rows = lines.slice(headerIndex + 1).map(l => l.trim()).filter(l => l.startsWith('NNH ') || l.startsWith('Tổng')).map(l => l.split('	'));
    return result;
};
