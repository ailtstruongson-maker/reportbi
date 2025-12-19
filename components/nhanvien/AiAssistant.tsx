
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { SparklesIcon, XIcon, SpinnerIcon, UsersIcon } from '../Icons';
import MarkdownRenderer from '../MarkdownRenderer';

interface AiAssistantProps {
    danhSachData: string;
    thiDuaData: string;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ danhSachData, thiDuaData }) => {
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const handleAiAnalysis = async () => {
        if (!process.env.API_KEY || !aiQuery.trim()) return;
        setIsAiLoading(true);
        setAiResponse('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let context = `Dữ liệu Doanh thu Nhân viên:\n${danhSachData}\n\nDữ liệu Thi đua Nhân viên:\n${thiDuaData}\n\n`;
            const prompt = `Bạn là một chuyên gia phân tích dữ liệu kinh doanh. Dựa vào dữ liệu được cung cấp, hãy trả lời câu hỏi sau một cách chi tiết, chuyên nghiệp và đưa ra các đề xuất hành động cụ thể. Câu hỏi: "${aiQuery}". Phân tích của bạn nên ở định dạng Markdown.`;
            const fullPrompt = context + prompt;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
            });

            setAiResponse(response.text || '');
        } catch (error) {
            console.error("Gemini API error:", error);
            setAiResponse("Đã xảy ra lỗi khi kết nối với AI. Vui lòng thử lại.");
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <>
            <div className="fixed bottom-24 right-6 z-40 no-print">
                <button
                    onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                    className="p-4 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-300 transition-all duration-300 transform hover:scale-110"
                    title="Phân tích với AI"
                >
                    <SparklesIcon className="h-7 w-7" />
                </button>
            </div>
            {isAiPanelOpen && (
                <div className="fixed bottom-0 right-0 z-50 w-full max-w-lg h-3/4 bg-white dark:bg-slate-800 border-t-4 border-primary-500 shadow-2xl rounded-t-2xl flex flex-col transform transition-transform duration-300 ease-in-out translate-y-0 no-print" style={{ transform: isAiPanelOpen ? 'translateY(0)' : 'translateY(100%)' }}>
                     <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                           <SparklesIcon className="h-6 w-6 text-primary-500"/>
                           Trợ lý Phân tích
                        </h3>
                        <button onClick={() => setIsAiPanelOpen(false)} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                            <XIcon className="h-5 w-5 text-slate-500"/>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {aiResponse ? (
                           <MarkdownRenderer content={aiResponse} />
                        ) : isAiLoading ? (
                           <div className="flex flex-col items-center justify-center h-full text-center">
                               <SpinnerIcon className="h-10 w-10 text-primary-500" />
                               <p className="mt-3 text-slate-600 dark:text-slate-300">Đang phân tích dữ liệu...</p>
                           </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <UsersIcon className="h-12 w-12 text-slate-400 dark:text-slate-500"/>
                                <p className="mt-3 text-slate-600 dark:text-slate-300">Đặt câu hỏi về hiệu suất của nhân viên để bắt đầu.</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ví dụ: "Nhân viên nào có hiệu quả quy đổi tốt nhất?"</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                         <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={aiQuery}
                                onChange={(e) => setAiQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAiAnalysis()}
                                placeholder="Đặt câu hỏi cho AI..."
                                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-full focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-slate-700"
                                disabled={isAiLoading}
                            />
                            <button
                                onClick={handleAiAnalysis}
                                className="p-2.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:bg-slate-400"
                                disabled={isAiLoading || !aiQuery.trim()}
                            >
                                {isAiLoading ? <SpinnerIcon className="h-5 w-5" /> : <SparklesIcon className="h-5 w-5"/>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AiAssistant;
