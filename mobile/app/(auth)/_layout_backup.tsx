// app/(auth)/_layout.tsx  ← TẠO MỚI FILE NÀY
import { Redirect, Slot } from 'expo-router';
import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // hoặc loading spinner
  }

  if (!user) {
    return <Redirect href="/AuthScreen" />;
  }

  return <Slot />; // Cho phép vào (tabs)
}