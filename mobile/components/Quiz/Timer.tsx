// components/Quiz/Timer.tsx
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedProps,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  seconds: number;        // số giây còn lại
  size?: number;          // kích thước (mặc định 80)
  strokeWidth?: number;   // độ dày vòng tròn
  initialSeconds?: number;// tổng thời gian ban đầu (để tính % còn lại)
};

export default function Timer({ 
  seconds, 
  size = 80, 
  strokeWidth = 8,
  initialSeconds = 600 
}: Props) {
  const [prevSeconds, setPrevSeconds] = useState(seconds);
  const progress = useSharedValue(1);

  // Cập nhật animation khi seconds thay đổi
  useEffect(() => {
    if (seconds < prevSeconds) {
      progress.value = withTiming(seconds / initialSeconds, { duration: 800 });
      setPrevSeconds(seconds);

      // Rung khi còn 10 giây
      if (seconds === 10) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      if (seconds <= 5 && seconds > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }
  }, [seconds]);

  const animatedProps = useAnimatedProps(() => {
    const circumference = 2 * Math.PI * (size / 2 - strokeWidth / 2);
    const strokeOffset = interpolate(
      progress.value,
      [0, 1],
      [circumference, 0],
      Extrapolate.CLAMP
    );
    return { strokeDashoffset: strokeOffset };
  });

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isLowTime = seconds <= 30;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Vòng nền xám */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - strokeWidth / 2}
          stroke="#334155"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Vòng tiến độ màu đỏ → cam → xanh */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - strokeWidth / 2}
          stroke={isLowTime ? '#ef4444' : '#22c55e'}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${2 * Math.PI * (size / 2 - strokeWidth / 2)}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <View style={styles.textContainer}>
        <Text style={[
          styles.timeText,
          isLowTime && styles.lowTime,
          seconds <= 10 && styles.urgent
        ]}>
          {formatTime(seconds)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  lowTime: {
    color: '#fb923c',
  },
  urgent: {
    color: '#ef4444',
    fontSize: 22,
  },
});