// app/(auth)/(tabs)/upgrade/index.tsx
import { router } from 'expo-router';
import { ArrowLeft, Bitcoin, Check, Crown, Sparkles, Zap } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Linking,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.23;   // ĐÃ SỬA: từ 0.82 → 0.72

const NOWPAYMENTS_API_KEY = 'H1RPCR6-GKZ430V-Q3N3DJ6-H8ZA58E';
const NOWPAYMENTS_URL = 'https://api.nowpayments.io/v1';

interface Plan {
    id: string;
    name: string;
    subtitle: string;
    price: number;
    interval?: string;
    popular?: boolean;
    features: string[];
    color: string;
    gradient: string[];
    icon: any;
}

const PLANS: Plan[] = [
    {
        id: 'pro',
        name: 'Gói Pro',
        subtitle: 'Nâng trình lên N3',
        price: 9.99,
        interval: 'tháng',
        color: '#8b5cf6',
        gradient: ['#a78bfa', '#8b5cf6'],
        icon: Zap,
        features: [
            '+30 Chủ đề Shadowing N3',
            'Mở khóa kho sách song ngữ trung cấp',
            'Luyện thi JLPT N3',
            'Lưu 500 flashcard',
            'Tăng tốc từ nền tảng N5–N4 miễn phí',
        ],
    },
    {
        id: 'premium',
        name: 'Gói Premium',
        subtitle: 'Sẵn sàng chạm tới N2',
        price: 99.99,
        interval: 'năm',
        popular: true,
        color: '#f59e0b',
        gradient: ['#fbbf24', '#f59e0b'],
        icon: Crown,
        features: [
            '+50 Chủ đề Shadowing N2 & Business',
            'Mở khóa kho sách nâng cao + bài báo',
            'Đề thi JLPT N3–N2',
            'Lưu 2.000 flashcard',
            'Học chuyên sâu – hiệu quả dài hạn',
        ],
    },
    {
        id: 'master',
        name: 'Gói Master',
        subtitle: 'Chinh phục N1',
        price: 119.99,
        color: '#06b6d4',
        gradient: ['#22d3ee', '#06b6d4'],
        icon: Sparkles,
        features: [
            '+100 Chủ đề Shadowing N1 nâng cao',
            'Sách học thuật & chuyên ngành',
            'Đề thi JLPT N1 chính thức',
            'Lưu 5.000 flashcard',
            'Dành cho mục tiêu cao nhất',
        ],
    },
    {
        id: 'lifetime',
        name: 'Gói Lifetime',
        subtitle: 'Mở khóa trọn đời',
        price: 159.99,
        color: '#ec4899',
        gradient: ['#f43f5e', '#ec4899'],
        icon: Bitcoin,
        features: [
            'Tất cả nội dung Pro + Premium + Master',
            'Cập nhật mới hàng tháng mãi mãi',
            'Flashcard không giới hạn',
            'Badge VIP + sticker độc quyền',
            'Mua 1 lần – học mãi mãi',
        ],
    },
];

export default function UpgradeScreen() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [paymentModal, setPaymentModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

    const [qrCode, setQrCode] = useState('');
    const [payAddress, setPayAddress] = useState('');
    const [payAmount, setPayAmount] = useState('');
    const [invoiceId, setInvoiceId] = useState('');

    const createPayment = async (plan: Plan) => {
        setLoading(true);
        setErrorMessage('');

        try {
            // Bước 1: Tạo invoice
            const res = await fetch(`${NOWPAYMENTS_URL}/invoice`, {
                method: 'POST',
                headers: {
                    'x-api-key': NOWPAYMENTS_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    price_amount: plan.price,
                    price_currency: 'usd',
                    pay_currency: 'usdttrc20',
                    order_id: `VPAN_${user?.id}_${plan.id}_${Date.now()}`,
                    order_description: `Vpan ${plan.name} - ${user?.email}`,
                    ipn_callback_url: 'https://yourdomain.com/api/webhook/nowpayments',
                    success_url: 'vpan://upgrade/success',
                    cancel_url: 'vpan://upgrade/cancel',
                }),
            });

            if (!res.ok) {
                const err = await res.text();
                setErrorMessage(`Lỗi tạo hóa đơn: ${res.status}\n${err}`);
                Alert.alert('Thanh toán thất bại', err.substring(0, 200));
                return;
            }

            const data = await res.json();

            // Bước 2: Lấy pay_address từ chi tiết
            const detailRes = await fetch(`${NOWPAYMENTS_URL}/invoice/${data.id}`, {
                headers: { 'x-api-key': NOWPAYMENTS_API_KEY },
            });

            const detail = await detailRes.json();

            if (detail.pay_address) {
                setSelectedPlan(plan);
                setInvoiceId(data.id);
                setPayAddress(detail.pay_address);
                setPayAmount(detail.pay_amount || plan.price.toString());
                setQrCode(`https://chart.googleapis.com/chart?chs=340x340&cht=qr&chl=${detail.pay_address}`);
                setPaymentModal(true);
            } else {
                Linking.openURL(data.invoice_url);
                Alert.alert('Đang mở trang thanh toán...', 'Bạn sẽ được chuyển đến trang thanh toán an toàn.');
            }
        } catch (err: any) {
            setErrorMessage(err.message);
            Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ thanh toán.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#0b1220' }}>
            <ScrollView contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 20 }}>
                {/* Header */}
                <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
                    <ArrowLeft color="#fff" size={28} />
                </TouchableOpacity>

                <View style={{ alignItems: 'center', marginBottom: 40 }}>
                    <Crown color="#f59e0b" size={80} />
                    <Text style={{ color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 20 }}>
                        Nâng cấp Vpan
                    </Text>
                    <Text style={{ color: '#94a3b8', fontSize: 18, textAlign: 'center', marginTop: 12 }}>
                        Chọn gói phù hợp – chinh phục tiếng Nhật nhanh hơn bao giờ hết
                    </Text>
                </View>

                {/* GÓI NGANG – NHƯ CHATGPT */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={CARD_WIDTH + 20} snapToAlignment="center" contentContainerStyle={{ paddingHorizontal: 20 }}>
                    {PLANS.map((plan) => {
                        const Icon = plan.icon;
                        return (
                            <TouchableOpacity
                                key={plan.id}
                                onPress={() => createPayment(plan)}
                                style={{
                                    width: CARD_WIDTH,
                                    marginHorizontal: 10,
                                    backgroundColor: '#1e293b',
                                    borderRadius: 24,
                                    padding: 24,
                                    borderWidth: plan.popular ? 4 : 0,
                                    borderColor: plan.popular ? plan.color : 'transparent',
                                    position: 'relative',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 10 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 20,
                                    elevation: 10,
                                }}>
                                {plan.popular && (
                                    <View style={{ position: 'absolute', top: -12, alignSelf: 'center', backgroundColor: plan.color, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 }}>
                                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>TIẾT KIỆM NHẤT</Text>
                                    </View>
                                )}

                                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                    <View style={{ backgroundColor: plan.color + '22', padding: 16, borderRadius: 20, marginBottom: 12 }}>
                                        <Icon color={plan.color} size={36} />
                                    </View>
                                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{plan.name}</Text>
                                    <Text style={{ color: '#94a3b8', fontSize: 16, marginTop: 4 }}>{plan.subtitle}</Text>
                                </View>

                                <View style={{ alignItems: 'center', marginVertical: 16 }}>
                                    <Text style={{ color: '#fff', fontSize: 40, fontWeight: '800' }}>${plan.price}</Text>
                                    {plan.interval && <Text style={{ color: '#64748b' }}>/ {plan.interval}</Text>}
                                    {plan.id === 'lifetime' && <Text style={{ color: '#ec4899', fontWeight: 'bold', marginTop: 8 }}>MỘT LẦN DUY NHẤT</Text>}
                                </View>

                                <View style={{ gap: 12, marginTop: 8 }}>
                                    {plan.features.map((feature, i) => (
                                        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                            <Check color="#4ade80" size={20} style={{ marginTop: 2 }} />
                                            <Text style={{ color: '#e2e8f0', fontSize: 15, flex: 1, lineHeight: 22 }}>{feature}</Text>
                                        </View>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    style={{
                                        backgroundColor: plan.color,
                                        paddingVertical: 16,
                                        borderRadius: 16,
                                        marginTop: 24,
                                        alignItems: 'center',
                                    }}
                                    onPress={() => createPayment(plan)}>
                                    <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 18 }}>
                                        {plan.id === 'lifetime' ? 'Mua trọn đời' : 'Nâng cấp ngay'}
                                    </Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <Text style={{ color: '#64748b', textAlign: 'center', marginVertical: 40, fontSize: 13 }}>
                    Thanh toán an toàn bằng Crypto • USDT, BTC, ETH, SOL... • Không lưu thẻ
                </Text>
            </ScrollView>

            {/* MODAL THANH TOÁN */}
            <Modal visible={paymentModal} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <TouchableOpacity
                        onPress={() => setPaymentModal(false)}
                        style={{ position: 'absolute', top: 50, right: 20, backgroundColor: '#333', padding: 10, borderRadius: 50 }}>
                        <Text style={{ color: '#fff', fontSize: 24 }}>×</Text>
                    </TouchableOpacity>

                    <Text style={{ color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
                        Thanh toán {selectedPlan?.name}
                    </Text>

                    <Image
                        source={{ uri: qrCode }}
                        style={{ width: 300, height: 300, borderRadius: 20, marginVertical: 20 }}
                        resizeMode="contain"
                    />

                    <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 10 }}>
                        Gửi đúng <Text style={{ fontWeight: 'bold', color: '#f59e0b' }}>{payAmount} USDT (TRC20)</Text>
                    </Text>

                    <Text selectable selectionColor="#f59e0b" style={{
                        backgroundColor: '#111',
                        color: '#f59e0b',
                        padding: 16,
                        borderRadius: 12,
                        fontSize: 15,
                        textAlign: 'center',
                        fontFamily: 'monospace',
                    }}>
                        {payAddress}
                    </Text>

                    <TouchableOpacity
                        onPress={() => Linking.openURL(`https://nowpayments.io/payment/?iid=${invoiceId}`)}
                        style={{ marginTop: 20 }}>
                        <Text style={{ color: '#60a5fa' }}>Xem chi tiết thanh toán →</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* LOADING */}
            {loading && (
                <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 999,
                }}>
                    <View style={{ backgroundColor: '#1e293b', padding: 32, borderRadius: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#f59e0b" />
                        <Text style={{ color: '#fff', marginTop: 20, fontSize: 18, fontWeight: '600' }}>
                            Đang tạo hóa đơn...
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}