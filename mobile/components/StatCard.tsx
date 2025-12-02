import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';


interface Props {
iconName: React.ComponentProps<typeof MaterialIcons>['name'];
title: string;
value: string | number;
color?: string;
}


export default function StatCard({ iconName, title, value, color = '#4a00e0' }: Props) {
return (
<View style={localStyles.card}>
<MaterialIcons name={iconName} size={36} color={color} />
<Text style={localStyles.value}>{value}</Text>
<Text style={localStyles.title}>{title}</Text>
</View>
);
}


const localStyles = StyleSheet.create({
card: {
backgroundColor: '#fff',
padding: 20,
borderRadius: 16,
alignItems: 'center',
width: 260,
elevation: 6,
shadowColor: '#000',
shadowOpacity: 0.12,
shadowRadius: 8,
},
value: { fontSize: 28, fontWeight: '700', color: '#111', marginVertical: 8 },
title: { fontSize: 14, color: '#666' },
});