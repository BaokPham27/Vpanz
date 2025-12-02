// components/admin/DashboardCharts.tsx
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';

interface ChartDataset {
    data: number[];
    label?: string;
}

interface Stats {
    totalBooks: number;
    totalFlashcards: number;
    totalUsers: number;
    chartData: {
        labels: string[];
        datasets: ChartDataset[];
        // Giả sử bạn sẽ có thêm dataset cho flashcard trong tương lai
        // datasets[1] = flashcard creations per day
    };
}

interface DashboardChartsProps {
    stats: Stats | null;
    isLoading?: boolean;
}

export default function DashboardCharts({ stats, isLoading = false }: DashboardChartsProps) {
    const { width: windowWidth } = useWindowDimensions();

    const isMobile = windowWidth < 720;
    const isTablet = windowWidth >= 720 && windowWidth < 1100;
    const isDesktop = windowWidth >= 1100;

    const getChartWidth = () => {
        if (isMobile) return windowWidth - 64;
        if (isTablet) return (windowWidth - 100) / 2;
        return Math.min(500, windowWidth * 0.45);
    };

    const chartWidth = getChartWidth();
    const [range, setRange] = useState<7 | 14 | 30>(7);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6b46c1" />
                <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
            </View>
        );
    }

    if (!stats) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Chưa có dữ liệu để hiển thị</Text>
            </View>
        );
    }

    const { chartData } = stats;

    // Dữ liệu người dùng mới (dataset[0])
    const userGrowthData = useMemo(() => {
        const labels = chartData.labels.slice(-range);
        const data = (chartData.datasets?.[0]?.data || []).slice(-range);
        return { labels, data };
    }, [chartData, range]);

    // Dữ liệu Flashcard được tạo theo ngày
    // Ưu tiên: nếu backend trả về dataset[1] → dùng thật
    // Dự phòng: giả lập từ totalFlashcards (như trước)
    const flashcardCreationData = useMemo(() => {
        const labels = chartData.labels.slice(-range);

        // Ưu tiên dùng dataset[1] → giờ backend đã trả thật!
        if (chartData.datasets?.[1]?.data) {
            const data = chartData.datasets[1].data.slice(-range);
            return { labels, data };
        }

        // Fallback (sẽ không bao giờ chạy nữa)
        return { labels, data: labels.map(() => 0) };
    }, [chartData, range]);

    const lineData = {
        labels: userGrowthData.labels,
        datasets: [{ data: userGrowthData.data }],
    };

    const barDataFlashcards = {
        labels: flashcardCreationData.labels,
        datasets: [{ data: flashcardCreationData.data }],
    };

    const total = stats.totalBooks + stats.totalFlashcards + stats.totalUsers || 1;

    const pieData = [
        { name: 'Sách', population: stats.totalBooks, color: '#8b5cf6' },
        { name: 'Flashcard', population: stats.totalFlashcards, color: '#06b6d4' },
        { name: 'Người dùng', population: stats.totalUsers, color: '#f59e0b' },
    ];

    const chartConfig = {
        backgroundGradientFrom: '#ffffff',
        backgroundGradientTo: '#ffffff',
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(107, 70, 193, ${opacity})`,
        labelColor: () => '#64748b',
        style: { borderRadius: 20 },
        propsForDots: { r: '6', strokeWidth: '3', stroke: '#8b5cf6' },
        propsForBackgroundLines: { stroke: '#e2e8f0' },
        propsForLabels: { fontSize: 11, fontWeight: '600' },
    };

    const ChartCard = ({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) => (
        <LinearGradient
            colors={['#ffffff', '#f8f9ff']}
            style={[
                styles.card,
                isMobile && styles.cardMobile,
                { width: isMobile ? '100%' : chartWidth + 40 },
            ]}
        >
            <View>
                <Text style={styles.cardTitle}>{title}</Text>
                {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
            </View>
            {children}
        </LinearGradient>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.pageTitle}>Thống kê hệ thống</Text>
                    <Text style={styles.pageSubtitle}>Cập nhật theo thời gian thực</Text>
                </View>
                <View style={styles.rangeSelector}>
                    {[7, 10, 14].map((days) => (
                        <TouchableOpacity
                            key={days}
                            onPress={() => setRange(days as any)}
                            style={[styles.rangeBtn, range === days && styles.rangeBtnActive]}
                        >
                            <Text style={[styles.rangeBtnText, range === days && styles.rangeBtnTextActive]}>
                                {days === 10 ? '10 ngày' : `${days} ngày`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Row 1 */}
            <View style={[styles.row, isMobile && styles.column]}>
                {/* Tăng trưởng người dùng */}
                <ChartCard title="Tăng trưởng người dùng" subtitle="Người dùng đăng ký mới">
                    <LineChart
                        data={lineData}
                        width={chartWidth}
                        height={isMobile ? 240 : 280}
                        chartConfig={chartConfig}
                        bezier
                        style={styles.chart}
                        fromZero
                        segments={5}
                    />
                </ChartCard>

                {/* Flashcard được tạo */}
                <ChartCard title="Flashcard được tạo" subtitle={`${range} ngày gần nhất`}>
                    <BarChart
                        data={barDataFlashcards}
                        width={chartWidth}
                        height={isMobile ? 240 : 280}
                        chartConfig={{
                            ...chartConfig,
                            color: (opacity = 1) => `rgba(6, 182, 212, ${opacity})`, // màu cyan đẹp
                        }}
                        fromZero
                        showValuesOnTopOfBars
                        style={styles.chart}
                        yAxisLabel=""
                        yAxisSuffix=""
                    />
                </ChartCard>
            </View>

            {/* Row 2 */}
            <View style={[styles.row, isMobile && styles.column]}>
                {/* Tỷ lệ phân bổ */}
                <ChartCard title="Tỷ lệ phân bổ">
                    <PieChart
                        data={pieData}
                        width={chartWidth}
                        height={isMobile ? 300 : 320}
                        chartConfig={chartConfig}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="0"
                        absolute
                        style={{ borderRadius: 20 }}
                    />
                    <View style={styles.pieLegend}>
                        {pieData.map((item) => (
                            <View key={item.name} style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                <Text style={styles.legendText}>{item.name}</Text>
                                <Text style={styles.legendValue}>
                                    {Math.round((item.population / total) * 100)}%
                                </Text>
                            </View>
                        ))}
                    </View>
                </ChartCard>

                {/* Người dùng mới (chi tiết) */}
                <ChartCard title={`Người dùng mới (${range} ngày)`}>
                    <LineChart
                        data={lineData}
                        width={chartWidth}
                        height={isMobile ? 240 : 280}
                        chartConfig={{
                            ...chartConfig,
                            color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                            propsForDots: { r: '7', strokeWidth: '3', stroke: '#8b5cf6' },
                        }}
                        style={styles.chart}
                        fromZero
                        bezier
                    />
                </ChartCard>
            </View>
        </View>
    );
}

// === STYLES ĐẸP NHẤT 2025 ===
const styles = StyleSheet.create({
    container: {
        padding: 24,
        gap: 32,
        backgroundColor: '#f8fafc',
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    pageTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1e293b',
    },
    pageSubtitle: {
        fontSize: 15,
        color: '#64748b',
        marginTop: 4,
    },
    rangeSelector: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    rangeBtn: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
    },
    rangeBtnActive: {
        backgroundColor: '#6b46c1',
        shadowColor: '#6b46c1',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    rangeBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
    },
    rangeBtnTextActive: {
        color: '#ffffff',
        fontWeight: '700',
    },
    row: {
        flexDirection: 'row',
        gap: 28,
        justifyContent: 'center',
    },
    column: {
        flexDirection: 'column',
    },
    card: {
        borderRadius: 28,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 25,
        elevation: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
    },
    cardMobile: {
        padding: 20,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1e293b',
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 6,
        fontWeight: '500',
    },
    chart: {
        borderRadius: 20,
        marginVertical: 12,
    },
    pieLegend: {
        marginTop: 24,
        gap: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    legendDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    legendText: {
        fontSize: 15,
        color: '#475569',
        fontWeight: '600',
        flex: 1,
    },
    legendValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1e293b',
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
    loadingText: { fontSize: 16, color: '#64748b' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 18, color: '#94a3b8', textAlign: 'center' },
});