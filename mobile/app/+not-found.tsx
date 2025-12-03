// app/(not-found)/_not-found.tsx  (hoặc đường dẫn file hiện tại của bạn)
import * as Clipboard from "expo-clipboard";
import { Link, Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Nếu bạn dùng TSX strict, cho type nhẹ:
type LogItem = {
  id: string;
  level: "error" | "warn" | "log" | "info" | "exception" | "reject";
  message: string;
  stack?: string;
  time: string;
};

const timeNow = () => new Date().toISOString();

export default function NotFoundScreen() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const maxLogs = 200;
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // ---------- Save original methods ----------
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;
    const originalConsoleInfo = console.info;

    // Helper push
    const pushLog = (item: LogItem) => {
      if (!mountedRef.current) return;
      setLogs((prev) => {
        const next = [item, ...prev];
        if (next.length > maxLogs) next.length = maxLogs;
        return next;
      });
    };

    // Override console methods
    console.error = (...args: any[]) => {
      try {
        pushLog({
          id: `${Date.now()}-error`,
          level: "error",
          message: args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" "),
          stack: args.find(a => a && a.stack)?.stack,
          time: timeNow(),
        });
      } catch (e) {}
      originalConsoleError.apply(console, args);
    };
    console.warn = (...args: any[]) => {
      try {
        pushLog({
          id: `${Date.now()}-warn`,
          level: "warn",
          message: args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" "),
          time: timeNow(),
        });
      } catch (e) {}
      originalConsoleWarn.apply(console, args);
    };
    console.log = (...args: any[]) => {
      try {
        pushLog({
          id: `${Date.now()}-log`,
          level: "log",
          message: args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" "),
          time: timeNow(),
        });
      } catch (e) {}
      originalConsoleLog.apply(console, args);
    };
    console.info = (...args: any[]) => {
      try {
        pushLog({
          id: `${Date.now()}-info`,
          level: "info",
          message: args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" "),
          time: timeNow(),
        });
      } catch (e) {}
      originalConsoleInfo.apply(console, args);
    };

    // ---------- Global error handler (React Native) ----------
    // ErrorUtils exists in RN to set global handler
    const ErrorUtilsAny: any = (global as any).ErrorUtils;
    let previousHandler: any = null;
    if (ErrorUtilsAny && typeof ErrorUtilsAny.getGlobalHandler === "function") {
      try {
        previousHandler = ErrorUtilsAny.getGlobalHandler();
      } catch (e) {
        previousHandler = null;
      }

      const newHandler = (error: any, isFatal?: boolean) => {
        try {
          pushLog({
            id: `${Date.now()}-exception`,
            level: "exception",
            message: error?.message || String(error),
            stack: error?.stack || String(error),
            time: timeNow(),
          });
        } catch (e) {}
        // call previous to preserve default behavior
        if (previousHandler) {
          try { previousHandler(error, isFatal); } catch (_) {}
        }
      };

      try {
        ErrorUtilsAny.setGlobalHandler(newHandler);
      } catch (e) {
        // ignore if not supported
      }
    }

    // ---------- Unhandled promise rejections ----------
    const onUnhandledRejection = (evt: any) => {
      try {
        const reason = evt?.reason ?? evt;
        pushLog({
          id: `${Date.now()}-reject`,
          level: "reject",
          message: reason?.message || (typeof reason === "string" ? reason : JSON.stringify(reason)),
          stack: reason?.stack,
          time: timeNow(),
        });
      } catch (e) {}
    };

    if (typeof (global as any).addEventListener === "function") {
      try {
        (global as any).addEventListener("unhandledrejection", onUnhandledRejection);
      } catch (e) {}
    } else if (typeof (global as any).onunhandledrejection === "function") {
      // unlikely, but try
      try { (global as any).onunhandledrejection = onUnhandledRejection; } catch (e) {}
    }

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      // restore console
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.log = originalConsoleLog;
      console.info = originalConsoleInfo;
      // restore ErrorUtils
      try {
        if (ErrorUtilsAny && typeof ErrorUtilsAny.setGlobalHandler === "function" && previousHandler) {
          ErrorUtilsAny.setGlobalHandler(previousHandler);
        }
      } catch (e) {}
      // remove unhandled rejection
      try {
        if (typeof (global as any).removeEventListener === "function") {
          (global as any).removeEventListener("unhandledrejection", onUnhandledRejection);
        } else if ((global as any).onunhandledrejection === onUnhandledRejection) {
          (global as any).onunhandledrejection = undefined;
        }
      } catch (e) {}
    };
  }, []);

  // Copy logs to clipboard
  const copyAll = async () => {
    try {
      const text = logs
        .map(
          (l) =>
            `[${l.time}] ${l.level.toUpperCase()}: ${l.message}${l.stack ? `\nSTACK:\n${l.stack}` : ""}`
        )
        .reverse()
        .join("\n\n----\n\n");
      await Clipboard.setStringAsync(text);
      // brief feedback by adding a marker log
      setLogs(prev => [{ id: `copied-${Date.now()}`, level: "info", message: "Đã copy log vào clipboard", time: timeNow() }, ...prev]);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  // Clear logs
  const clear = () => setLogs([]);

  // Small helpers to show device info
  const platformInfo = `Platform: ${Platform.OS} / ${Platform.Version}`;

  return (
    <>
      <Stack.Screen options={{ title: "Debug — Logs" }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Màn Debug (NotFound)</Text>
          <Text style={styles.sub}>{platformInfo}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btn} onPress={copyAll}>
              <Text style={styles.btnText}>Copy logs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: "#ef4444" }]} onPress={clear}>
              <Text style={styles.btnText}>Clear</Text>
            </TouchableOpacity>
            <Link href="/AuthScreen" style={[styles.btn, { backgroundColor: "#3b82f6" }]}>
              <Text style={styles.btnText}>Home</Text>
            </Link>
          </View>
        </View>

        <ScrollView style={styles.logContainer} contentContainerStyle={{ padding: 12 }}>
          {logs.length === 0 ? (
            <Text style={styles.empty}>Chưa có logs - recreate error hoặc chờ log mới.</Text>
          ) : (
            logs.map((l) => (
              <View key={l.id} style={styles.logItem}>
                <Text style={styles.logTime}>{l.time} — {l.level.toUpperCase()}</Text>
                <Text style={styles.logMessage}>{l.message}</Text>
                {l.stack ? <Text style={styles.logStack}>{l.stack}</Text> : null}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  header: { padding: 12, backgroundColor: "#0b1220", borderBottomWidth: 1, borderBottomColor: "#1f2937" },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 6 },
  sub: { color: "#9ca3af", marginBottom: 8 },
  actions: { flexDirection: "row", gap: 8, alignItems: "center" },
  btn: { backgroundColor: "#111827", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 },
  btnText: { color: "#fff", fontWeight: "700" },
  logContainer: { flex: 1, backgroundColor: "#fff", borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  empty: { padding: 20, color: "#6b7280", textAlign: "center" },
  logItem: { marginBottom: 12, padding: 8, backgroundColor: "#f8fafc", borderRadius: 8 },
  logTime: { fontSize: 12, color: "#374151", marginBottom: 4, fontWeight: "700" },
  logMessage: { color: "#111827" },
  logStack: { marginTop: 6, color: "#6b7280", fontSize: 12, fontFamily: Platform.OS === "ios" ? "Courier" : undefined },
});
