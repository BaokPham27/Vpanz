import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';


export const ConfirmModal = ({ visible, title = 'Xác nhận', message = '', onCancel = () => {}, onConfirm = () => {}, confirmText = 'Xác nhận', cancelText = 'Hủy' }: any) => (
<Modal visible={visible} transparent animationType="fade">
<View style={modalStyles.overlay}>
<View style={modalStyles.content}>
<Text style={modalStyles.title}>{title}</Text>
<Text style={modalStyles.message}>{message}</Text>
<View style={modalStyles.actions}>
<TouchableOpacity onPress={onCancel} style={modalStyles.cancelBtn}><Text style={modalStyles.cancelText}>{cancelText}</Text></TouchableOpacity>
<TouchableOpacity onPress={onConfirm} style={modalStyles.confirmBtn}><Text style={modalStyles.confirmText}>{confirmText}</Text></TouchableOpacity>
</View>
</View>
</View>
</Modal>
);


export const MessageModal = ({ visible, title = 'Thông báo', message = '', onClose = () => {} }: any) => (
<Modal visible={visible} transparent animationType="fade">
<View style={modalStyles.overlay}>
<View style={modalStyles.content}>
<Text style={modalStyles.title}>{title}</Text>
<Text style={modalStyles.message}>{message}</Text>
<TouchableOpacity onPress={onClose} style={modalStyles.okBtn}><Text style={modalStyles.confirmText}>OK</Text></TouchableOpacity>
</View>
</View>
</Modal>
);


const modalStyles = StyleSheet.create({
overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
content: { width: '90%', maxWidth: 480, backgroundColor: '#fff', borderRadius: 14, padding: 20 },
title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
message: { fontSize: 15, color: '#444', marginBottom: 18 },
actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
cancelBtn: { paddingHorizontal: 14, paddingVertical: 10 },
cancelText: { color: '#666' },
confirmBtn: { backgroundColor: '#e91e63', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
confirmText: { color: '#fff', fontWeight: '700' },
okBtn: { backgroundColor: '#4a00e0', padding: 12, borderRadius: 10, alignItems: 'center' },
});