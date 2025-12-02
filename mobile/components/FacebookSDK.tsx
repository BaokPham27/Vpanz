"use client";
import { useEffect } from "react";

export default function FacebookSDK() {
  useEffect(() => {
    if (window.FB) return; // đã load rồi

    // Tạo thẻ script
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      window.FB.init({
        appId: "1501472567745202", // đổi thành App ID của bạn
        cookie: true,
        xfbml: true,
        version: "v17.0",
      });
      console.log("FB SDK loaded");
    };
    document.body.appendChild(script);
  }, []);

  return null;
}
