// components/GoogleProvider.tsx
import React from "react";
import { Platform } from "react-native";

const GOOGLE_CLIENT_ID =
  "582700007947-ctcgquqcumoj8gdkongl17h7ssrd8ipn.apps.googleusercontent.com";

type Props = { children: React.ReactNode };

export default function GoogleProvider({ children }: Props) {
  // Nếu không phải web, không mount GoogleOAuthProvider (tránh lỗi `document`)
  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  // Chỉ require() trên web — tránh import trên native để không chạy code dùng `document`
  let GoogleOAuthProvider: any;
  try {
    // require đồng bộ ở runtime — bundler của expo/web sẽ xử lý tốt cho web
    GoogleOAuthProvider = require("@react-oauth/google").GoogleOAuthProvider;
  } catch (err) {
    console.error("Không thể load @react-oauth/google:", err);
    // fallback: chỉ trả về children để app không crash
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
}
