import { router } from 'expo-router';
import {
  ArrowRight, Bell, Book, BookOpen, Crown, Edit2, Layers, LogOut, MessageSquare, Mic2, Moon, PenTool, Search, Sun, X
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions, Image, Modal,
  Platform,
  SafeAreaView, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../../context/AuthContext';
import api from '../../utils/api';
// Avatar an toàn – ưu tiên avatarURL thật, fallback về pravatar (không bao giờ 404)
const getSafeAvatar = (user: { avatarURL?: string; email: string }) => {
  const avatarURL = user.avatarURL && user.avatarURL.trim() !== '' ? user.avatarURL.trim() : null;

  if (avatarURL) {
    // Fix ImgBB không hiện ảnh do thiếu User-Agent
    if (avatarURL.includes('ibb.co') || avatarURL.includes('i.ibb.co')) {
      return {
        uri: avatarURL,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
        }
      };
    }
    return { uri: avatarURL };
  }

  // Fallback về pravatar
  return { uri: `https://i.pravatar.cc/300?u=${encodeURIComponent(user.email)}` };
};
const { width } = Dimensions.get('window');
const SOCKET_URL = 'http://26.94.144.5:5000'; // ← ĐỔI THÀNH IP CỦA BẠN
// Notification realtime


interface User {
  id: string;
  name: string;
  email: string;
  avatarURL?: string;
}

interface ChatItem {
  id: string;
  user: User;
  preview: string;
  time: string; // "Vừa xong", "5 phút trước", "Hôm qua"...
  avatar: { uri: string };
}

const QUICK_ACTIONS = [
  { title: 'Flashcard', icon: Layers, color: '#f472b6', bg: '#f9a8d4' },
  { title: 'Luyện Thi', icon: PenTool, color: '#fb923c', bg: '#fdba74' },
  { title: 'Shadowing', icon: Mic2, color: '#38bdf8', bg: '#7dd3fc' },
  { title: 'Sách Song Ngữ', icon: Book, color: '#8b5cf6', bg: '#c4b5fd' },
];


const flashcards = [
  { id: 1, title: 'Flashcard Ngữ pháp N3' },
  { id: 2, title: 'Flashcard Từ vựng N4' },
  { id: 3, title: 'Flashcard Kanji Sơ cấp' },
];

// Hàm format thời gian đẹp như Facebook
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 172800) return 'Hôm qua';
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  return 'Lâu lắm rồi';
};

export default function VpanDashboard() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessageDropdown, setShowMessageDropdown] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Chat state
  const [recentChats, setRecentChats] = useState<ChatItem[]>([]);
  const [recentChatsLoading, setRecentChatsLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // Search state
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const isDark = theme === 'dark';
useEffect(() => {
  // Nếu đang ở root và chưa có user thì điều hướng theo nền tảng
  if (user) return; // nếu đã login thì không redirect

  // Phân biệt web vs native
  if (Platform.OS === 'web') {
    // thay '/AuthScreen' bằng route web của bạn
    router.replace('/AuthScreen');
  } else {
    // thay '/login' bằng route mobile của bạn
    router.replace('/login');
  }
}, [user]);
  useEffect(() => {
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
  }, [isDark]);

  const handleLogout = () => {
    setAvatarOpen(false);
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    try {
      // 1. Gọi backend logout
      await api.post('/api/logout', {}, {
        headers: { Authorization: `Bearer ${(user as any)?.token}` }
      });
    } catch (err) {
      console.error('Logout lỗi:', err);
    }

    // 2. Xóa token, reset user & role
    logout(); // hàm trong context của bạn
    // Nếu cần cụ thể:
    // setUser(null);
    // setRole(null); 

    // 3. Redirect về AuthScreen
    router.replace('/AuthScreen');
  };

  // ==================== SOCKET CONNECTION ====================
  useEffect(() => {
    if (!user) return;
    const token = (user as any)?.token;
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => console.log('Socket connected:', socket.id));
    socket.on('onlineUsers', (ids: string[]) => setOnlineUsers(ids));

    socket.on('newMessage', (msg: any) => {
      if (msg.sender.id === user.id) return;

      setRecentChats(prev => {
        const filtered = prev.filter(c => c.user.id !== msg.sender.id);
        const newChat: ChatItem = {
          id: msg.chatId || msg._id || Date.now().toString(),
          user: msg.sender,
          preview: msg.message || 'Đã gửi một tin nhắn',
          time: 'Vừa xong',
          avatar: getSafeAvatar(msg.sender),
        };
        return [newChat, ...filtered];
      });
    });
    // THÊM 3 DÒNG NÀY VÀO TRONG useEffect SOCKET
    socket.on('newNotification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      if (!notif.read) setUnreadCount(c => c + 1);
    });

    socket.on('notificationsList', (list) => {
      setNotifications(list);
      setUnreadCount(list.filter((n: any) => !n.read).length);
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // THAY TOÀN BỘ useEffect load recent chats (cái đang lỗi 404) BẰNG ĐOẠN NÀY
  // Load thông báo khi mở dropdown
  useEffect(() => {
    if (showNotifications && socketRef.current?.connected) {
      socketRef.current.emit('getNotifications');
    }
  }, [showNotifications]);
  // THAY TOÀN BỘ useEffect load recent chats BẰNG ĐOẠN NÀY (dán đè vào)
  useEffect(() => {
    if (!showMessageDropdown || !user || !socketRef.current?.connected) {
      setRecentChats([]);
      return;
    }

    socketRef.current.emit('getRecentChats');

    const handleRecentChats = (chats: any[]) => {
      const formatted: ChatItem[] = chats.map(chat => ({
        id: chat.chatId,
        user: chat.user || { id: 'unknown', name: 'Người dùng', email: '', avatarURL: '' },
        preview: chat.preview,
        time: formatTimeAgo(new Date(chat.lastMessageAt)),
        avatar: getSafeAvatar(chat.user),
      }));
      setRecentChats(formatted);
      setRecentChatsLoading(false);
    };

    socketRef.current.on('recentChats', handleRecentChats);
    setRecentChatsLoading(true);

    return () => {
      socketRef.current?.off('recentChats', handleRecentChats);
    };
  }, [showMessageDropdown, user]);

  // ==================== TÌM KIẾM NGƯỜI DÙNG ====================
  useEffect(() => {
    if (!searchMode || !user) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const token = (user as any)?.token;
    if (!token) return;

    const controller = new AbortController();

    const fetchUsers = async () => {
      setSearchLoading(true);
      try {
        const res = await api.get('/api/users/search', {
          params: { q: searchQuery.trim() || undefined },
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        const users: User[] = Array.isArray(res.data) ? res.data : [];
        setSearchResults(users.filter(u => u.id !== user.id));
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Lỗi tìm kiếm:', err);
        }
      } finally {
        setSearchLoading(false);
      }
    };

    const delay = searchQuery ? 300 : 0;
    const timer = setTimeout(fetchUsers, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchMode, searchQuery, user]);

  const openChat = (targetUser: User) => {
    setShowMessageDropdown(false);
    setSearchMode(false);
    setSearchQuery('');
    router.push(`/chat/${targetUser.id}`);
  };

  const closeAll = () => {
    setShowMessageDropdown(false);
    setShowNotifications(false);
    setAvatarOpen(false);
    setSearchMode(false);
    setSearchQuery('');
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b1220', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>Đang chuyển hướng...</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={closeAll}>
      <SafeAreaView style={[styles.safe, isDark ? styles.darkBg : styles.lightBg]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* HEADER */}
        <View style={[styles.header, isDark ? styles.headerDark : styles.headerLight]}>
          <TextInput
            placeholder="Tìm từ, flashcard hoặc bài học..."
            placeholderTextColor={isDark ? '#BDBDBD' : '#777'}
            style={[styles.searchInput, isDark ? styles.inputDark : styles.inputLight]}
          />

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconCircle} onPress={() => setShowMessageDropdown(s => !s)}>
              <MessageSquare color={isDark ? '#fff' : '#2b2b2b'} width={20} height={20} />
            </TouchableOpacity>

            {/* THAY TOÀN BỘ DÒNG NÀY */}
            <TouchableOpacity style={styles.iconCircle} onPress={() => setShowNotifications(s => !s)}>
              <View style={{ position: 'relative' }}>
                <Bell color={isDark ? '#fff' : '#2b2b2b'} width={20} height={20} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconCircle} onPress={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}>
              {isDark ? <Sun color="#ffd166" width={20} height={20} /> : <Moon color="#555" width={20} height={20} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setAvatarOpen(s => !s)} style={styles.avatarBtn}>
              <Image source={getSafeAvatar(user)} style={styles.avatar} />
            </TouchableOpacity>
          </View>
        </View>

        {/* DROPDOWN TIN NHẮN - HOÀN HẢO */}
        {showMessageDropdown && (
          <TouchableWithoutFeedback onPress={() => { }}>
            <View pointerEvents="box-none" style={[styles.messageDropdown, isDark ? styles.menuDark : styles.menuLight]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#444' }}>
                {searchMode ? (
                  <>
                    <TouchableOpacity onPress={() => { setSearchMode(false); setSearchQuery(''); }}>
                      <X color={isDark ? '#fff' : '#000'} size={24} />
                    </TouchableOpacity>
                    <TextInput
                      placeholder="Tìm người để chat..."
                      placeholderTextColor="#888"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoFocus
                      style={{ flex: 1, color: isDark ? '#fff' : '#000', fontSize: 16, marginLeft: 10 }}
                    />
                  </>
                ) : (
                  <>
                    <Search color={isDark ? '#fff' : '#000'} size={22} />
                    <Text style={[styles.dropdownTitle, isDark ? styles.txtLight : styles.txtDark]}>Tin nhắn</Text>
                    <TouchableOpacity onPress={() => setSearchMode(true)}>
                      <Text style={{ color: '#1877f2', fontWeight: '600' }}>Tìm người</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <ScrollView style={styles.dropdownScroll}>
                {searchMode ? (
                  searchLoading ? (
                    <Text style={{ textAlign: 'center', padding: 20, color: '#888' }}>Đang tìm...</Text>
                  ) : searchResults?.length > 0 ? (
                    searchResults.map(u => (
                      <TouchableOpacity key={u.id} style={styles.messageItem} onPress={() => openChat(u)}>
                        <View style={{ position: 'relative' }}>
                          <Image source={getSafeAvatar(u)} style={styles.messageAvatar} />
                          {onlineUsers.includes(u.id) && <View style={styles.onlineDot} />}
                        </View>
                        <View style={styles.messageContent}>
                          <Text style={[styles.messageName, isDark ? styles.txtLight : styles.txtDark]}>{u.name}</Text>
                          <Text style={[styles.messagePreview, isDark ? styles.txtLightDim : styles.txtDarkDim]}>{u.email}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={{ textAlign: 'center', padding: 20, color: '#888' }}>Không tìm thấy</Text>
                  )
                ) : recentChatsLoading ? (
                  <Text style={{ textAlign: 'center', padding: 20, color: '#888' }}>Đang tải tin nhắn...</Text>
                ) : recentChats?.length > 0 ? (
                  recentChats.map(chat => (
                    <TouchableOpacity key={chat.user.id} style={styles.messageItem} onPress={() => openChat(chat.user)}>
                      <View style={{ position: 'relative' }}>
                        <Image source={chat.avatar} style={styles.messageAvatar} />
                        {onlineUsers.includes(chat.user.id) && <View style={styles.onlineDot} />}
                      </View>
                      <View style={styles.messageContent}>
                        <View style={styles.messageHeader}>
                          <Text style={[styles.messageName, isDark ? styles.txtLight : styles.txtDark]} numberOfLines={1}>
                            {chat.user.name}
                          </Text>
                          <Text style={[styles.messageTime, isDark ? styles.txtLightDim : styles.txtDarkDim]}>
                            {chat.time}
                          </Text>
                        </View>
                        <Text style={[styles.messagePreview, isDark ? styles.txtLightDim : styles.txtDarkDim]} numberOfLines={1}>
                          {chat.preview}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={{ textAlign: 'center', padding: 20, color: '#888' }}>Chưa có tin nhắn nào</Text>
                )}
              </ScrollView>

              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>Xem tất cả trong Messenger</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* DROPDOWN THÔNG BÁO */}
        {showNotifications && (
          <View pointerEvents="box-none" style={[styles.notificationDropdown, isDark ? styles.menuDark : styles.menuLight]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10 }}>
              <Text style={[styles.dropdownTitle, isDark ? styles.txtLight : styles.txtDark]}>Thông báo</Text>
              {unreadCount > 0 && <Text style={{ color: '#1877f2', fontSize: 13 }}>{unreadCount} mới</Text>}
            </View>

            <ScrollView style={styles.dropdownScroll}>
              {notifications?.length === 0 ? (
                <Text style={{ textAlign: 'center', padding: 30, color: '#888' }}>Chưa có thông báo</Text>
              ) : (
                notifications.map(notif => (
                  <TouchableOpacity
                    key={notif._id}
                    style={[styles.notificationItem, !notif.read && { backgroundColor: 'rgba(59,130,246,0.15)' }]}
                  >
                    <Bell color="#1877f2" size={20} style={{ marginRight: 12 }} />
                    <View style={styles.notificationContent}>
                      <Text style={[styles.notificationText, isDark ? styles.txtLight : styles.txtDark]}>
                        {notif.message}
                      </Text>
                      <Text style={[styles.messageTime, isDark ? styles.txtLightDim : styles.txtDarkDim]}>
                        {notif.time}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity style={styles.seeAllButton} onPress={() => router.push('/notifications' as any)}>
              <Text style={styles.seeAllText}>Xem tất cả thông báo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AVATAR MENU */}
        {/* AVATAR MENU – ĐÃ THÊM NÚT NÂNG CẤP PREMIER */}
        {avatarOpen && (
          <View pointerEvents="box-none" style={[styles.avatarMenu, isDark ? styles.menuDark : styles.menuLight]}>
            <View style={styles.avatarMenuHeader}>
              <Image source={getSafeAvatar(user)} style={styles.menuAvatar} />
              <View style={{ marginLeft: 10 }}>
                <Text style={[styles.menuName, isDark ? styles.txtLight : styles.txtDark]}>{user.name}</Text>
                <Text style={[styles.menuRole, isDark ? styles.txtLightDim : styles.txtDarkDim]}>{user.email}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/edit')}>
              <Edit2 color={isDark ? '#fff' : '#2b2b2b'} width={18} height={18} />
              <Text style={[styles.menuText, isDark ? styles.txtLight : styles.txtDark]}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setAvatarOpen(false); // đóng menu trước cho mượt
                router.push('/(auth)/(tabs)/MyFlashcardSetsScreen' as any);
              }}
            >
              <BookOpen color={isDark ? '#fff' : '#2b2b2b'} width={18} height={18} />
              <Text style={[styles.menuText, isDark ? styles.txtLight : styles.txtDark]}>
                Quản lý flashcard
              </Text>
            </TouchableOpacity>

            {/* NÚT MỚI – NÂNG CẤP PREMIER */}
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]} // highlight vàng nhẹ
              onPress={() => {
                setAvatarOpen(false); // đóng dropdown trước cho mượt
                router.push('/upgrade' as any); // hoặc '/premium', '/billing'...
              }}>
              <View style={{
                backgroundColor: '#f59e0b',
                padding: 6,
                borderRadius: 8,
                marginRight: 10
              }}>
                <Crown color="#fff" width={16} height={16} /> {/* bạn cần import Crown */}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuText, { color: '#f59e0b', fontWeight: '700' }]}>
                  Nâng cấp Premier
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? '#cbd5e1' : '#64748b' }}>
                  Mở khóa tất cả tính năng
                </Text>
              </View>
              <ArrowRight color="#f59e0b" width={18} height={18} />
            </TouchableOpacity>
            {/* Kết thúc nút mới */}

            <View style={{ height: 1, backgroundColor: isDark ? '#374151' : '#e5e7eb', marginVertical: 6 }} />

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <LogOut color="#e11d48" width={18} height={18} />
              <Text style={[styles.menuText, { color: '#e11d48' }]}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* NỘI DUNG CHÍNH */}
        <ScrollView contentContainerStyle={styles.contentFullWidth}>

          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.actionBtnV2, { backgroundColor: action.bg, shadowColor: action.color }]}
                onPress={() => {
                  if (action.title === 'Sách Song Ngữ') {
                    router.push('/books/list' as any); // Dùng "as any" để bypass tạm thời
                  } else if (action.title === 'Flashcard') {
                    router.push('/FlashSet' as any);
                  } else if (action.title === 'Luyện Thi') {
                    router.push('/(quiz)' as any);
                  } else if (action.title === 'Shadowing') {
                    router.push('/shadowTopic' as any);
                  }
                }}
              >
                <action.icon color={action.color} size={30} />
                <Text style={[styles.actionTextV2, { color: action.color }]}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

       

          <View style={styles.footer}>
            <Text style={[styles.footerText, isDark ? styles.txtLightDim : styles.txtDarkDim]}>
              © {new Date().getFullYear()} Vpan — Học tiếng Nhật mọi lúc mọi nơi.
            </Text>
          </View>
        </ScrollView>

        {/* MODAL ĐĂNG XUẤT */}
        <Modal transparent visible={logoutModalVisible} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, isDark ? styles.modalDark : styles.modalLight]}>
              <Text style={[styles.modalTitle, isDark ? styles.txtLight : styles.txtDark]}>Đăng xuất tài khoản</Text>
              <Text style={[styles.modalMessage, isDark ? styles.txtLightDim : styles.txtDarkDim]}>
                Bạn có chắc muốn thoát khỏi tài khoản này?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setLogoutModalVisible(false)}>
                  <Text style={styles.modalBtnTextCancel}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnConfirm]} onPress={confirmLogout}>
                  <Text style={styles.modalBtnTextConfirm}>Đăng xuất</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

// Styles giữ nguyên 100%
const styles = StyleSheet.create({
  safe: { flex: 1 },
  lightBg: { backgroundColor: '#F3F7FB' },
  darkBg: { backgroundColor: '#0b1220' },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#e11d48',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, zIndex: 100 },
  headerLight: { backgroundColor: 'rgba(255,255,255,0.72)', borderBottomColor: '#e6e6e6', borderBottomWidth: 1 },
  headerDark: { backgroundColor: 'rgba(4,6,11,0.64)', borderBottomColor: 'rgba(255,255,255,0.06)', borderBottomWidth: 1 },
  searchInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, fontSize: 14, borderWidth: 1, height: 42 },
  inputLight: { backgroundColor: '#eef2f6', color: '#111', borderColor: '#eef2f6' },
  inputDark: { backgroundColor: '#1e293b', color: '#e6eef8', borderColor: '#1e293b' },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(200,200,200,0.2)' },

  avatarBtn: { marginLeft: 6, borderRadius: 21, overflow: 'hidden', borderWidth: 2, borderColor: '#3b82f6' },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarMenu: { position: 'absolute', top: 64, right: 14, width: 240, borderRadius: 12, paddingVertical: 8, zIndex: 200, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 18, elevation: 10 },
  menuLight: { backgroundColor: '#fff', borderColor: '#e6e6e6', borderWidth: 1 },
  menuDark: { backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1 },
  avatarMenuHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  menuAvatar: { width: 44, height: 44, borderRadius: 22 },
  menuName: { fontSize: 16, fontWeight: '700' },
  menuRole: { fontSize: 13 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  menuText: { fontSize: 15 },

  messageDropdown: {
    position: 'absolute',
    top: 68,
    right: 12,                     // thêm left để nó co giãn
    maxWidth: 400,
    height: 480,
    alignSelf: 'center',             // quan trọng: căn giữa nếu màn to
    borderRadius: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
  },
  notificationDropdown: { position: 'absolute', top: 64, right: 60, width: 360, height: 450, borderRadius: 12, zIndex: 200, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 10, overflow: 'hidden', paddingTop: 10 },
  dropdownTitle: { fontSize: 20, fontWeight: '800', paddingHorizontal: 15, marginBottom: 5 },
  dropdownScroll: { paddingHorizontal: 8 },
  seeAllButton: { paddingVertical: 10, backgroundColor: '#f0f2f5', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  seeAllText: { color: '#1877f2', fontWeight: '600', fontSize: 15 },

  messageItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8, marginVertical: 2 },
  messageAvatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 10 },
  messageContent: { flex: 1, justifyContent: 'center' },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  messageName: { fontSize: 15, fontWeight: '700' },
  messagePreview: { fontSize: 13 },
  messageTime: { fontSize: 12, marginLeft: 10 },

  notificationItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8, marginVertical: 2, backgroundColor: 'rgba(24,119,242,0.1)' },
  notificationContent: { flex: 1, justifyContent: 'center' },
  notificationText: { fontSize: 14 },

  contentFullWidth: { padding: 16, paddingBottom: 60, flexGrow: 1 },

  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20, marginHorizontal: -4 },
  actionBtnV2: {
    width: '48%',              // luôn khoảng 2 cột
    aspectRatio: 3.5,            // vuông, dễ xếp grid
    borderRadius: 16,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  actionTextV2: { fontSize: 16, fontWeight: '800' },

  card: { borderRadius: 14, marginBottom: 16, overflow: 'hidden', padding: 16 },
  cardLight: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardDark: { backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1 },

  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statColLeft: { flex: 1, alignItems: 'flex-start' },
  statColCenter: { flex: 1, alignItems: 'center' },
  statColRight: { flex: 1, alignItems: 'flex-end' },
  statLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800' },

  txtDark: { color: '#111827' },
  txtLight: { color: '#f8fafc' },
  txtDarkDim: { color: '#6b7280' },
  txtLightDim: { color: '#9ca3af' },

  footer: { paddingVertical: 14, alignItems: 'center' },
  footerText: { fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, backgroundColor: '#4ade80', borderRadius: 7, borderWidth: 3, borderColor: '#0b1220' },
  modalContent: { width: 300, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 20 },
  modalLight: { backgroundColor: '#fff' },
  modalDark: { backgroundColor: '#1e293b' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalMessage: { fontSize: 15, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#e5e7eb' },
  modalBtnConfirm: { backgroundColor: '#e11d48' },
  modalBtnTextCancel: { color: '#374151', fontWeight: '600', fontSize: 16 },
  modalBtnTextConfirm: { color: '#fff', fontWeight: '600', fontSize: 16 },
});