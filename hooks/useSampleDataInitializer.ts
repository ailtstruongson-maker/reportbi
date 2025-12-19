
import { useState, useEffect } from 'react';

// Hook này trước đây dùng để nạp dữ liệu mẫu. 
// Hiện tại đã được vô hiệu hóa để ứng dụng bắt đầu với dữ liệu trống.
export const useSampleDataInitializer = () => {
    // Trả về true ngay lập tức để App.tsx không hiển thị màn hình loading "Khởi tạo ứng dụng..."
    return true;
};
