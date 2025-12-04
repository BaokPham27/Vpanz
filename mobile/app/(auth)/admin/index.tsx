// app/(admin)/index.tsx – PHIÊN BẢN GỘP HOÀN CHỈNH 2025 (Dashboard + Modal đẹp + Thông báo)
import { useAuth } from '@/context/AuthContext';
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

// Component tái sử dụng (giả sử bạn đã tách ra folder components)
import AdminTable from "@/components/AdminTable";
import DashboardCharts from "@/components/DashBoardCharts";
import { ConfirmModal, MessageModal } from "@/components/Modals";
import StatsRow from "@/components/StatsRow";

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = 280;
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://vpanz-api.onrender.com/api";

// ==================== INTERFACES ====================
interface Book {
  _id?: string;
  title: string;
  author: string;
  level?: string;
  coverImage?: string;
  chapters?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatarURL?: string | null;
}

interface FlashcardSet {
  _id: string;
  title: string;
  description?: string;
  owner?: { _id: string; name: string; email: string };
  flashcardsCount?: number;
  isPublic?: boolean;
  level?: string;
  tags?: string[];
}

interface ShadowTopic {
  _id: string;
  title: string;
  description?: string;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  createdAt: string;
}

interface Stats {
  totalBooks: number;
  totalFlashcards: number;
  totalUsers: number;
  chartData: { labels: string[]; datasets: [{ data: number[] }] };
}

// ==================== MENU ====================
const menuItems = [
  { key: "dashboard", label: "Thống kê", icon: "chart-pie" },
  { key: "books", label: "Sách", icon: "book" },
  { key: "chapters", label: "Chương", icon: "file-alt" },
  { key: "flashcards", label: "Flashcard", icon: "clone" },
  { key: "users", label: "Người dùng", icon: "users" },
  { key: "shadowing", label: "Shadowing", icon: "microphone" },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const { user, token, logout } = useAuth();
  const router = useRouter();

  // Data states
  const [books, setBooks] = useState<Book[]>([]);
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [shadowTopics, setShadowTopics] = useState<ShadowTopic[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [bookModal, setBookModal] = useState(false);
  const [currentBook, setCurrentBook] = useState<Book>({ title: "", author: "", level: "N5", coverImage: "" });

  const [userModal, setUserModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [flashcardModal, setFlashcardModal] = useState(false);
  const [currentFlashcardSet, setCurrentFlashcardSet] = useState<FlashcardSet | null>(null);

  const [flashcardPreviewModal, setFlashcardPreviewModal] = useState(false);
  const [selectedSetFlashcards, setSelectedSetFlashcards] = useState<any[]>([]);
  const [selectedSetTitle, setSelectedSetTitle] = useState("");

  const [notifModal, setNotifModal] = useState(false);
  const [newNotifTitle, setNewNotifTitle] = useState("");
  const [newNotifMessage, setNewNotifMessage] = useState("");

  // Custom modals
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title?: string;
    message?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
  }>({ visible: false });

  const [messageModal, setMessageModal] = useState<{ visible: boolean; title?: string; message?: string }>({
    visible: false,
  });

  // ==================== FETCH DATA ====================
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.log("Stats error:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotifications(await res.json());
    } catch { /* ignore */ }
  };

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    await Promise.all([fetchStats(), fetchNotifications()]);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === "books") {
        const res = await fetch(`${API_URL}/books`, { headers });
        const data = await res.json();
        setBooks(data || []);
      }

      if (activeTab === "users") {
        const res = await fetch(`${API_URL}/users/search`, { headers });
        const data = await res.json();
        setUsers(data || []);
      }

      if (activeTab === "flashcards") {
        const url = user?.role === "admin"
          ? `${API_URL}/flashcard-sets/admin/all`
          : `${API_URL}/flashcard-sets`;

        const res = await fetch(url, { headers });
        const data = await res.json();
        const formatted = (data || []).map((set: any) => ({
          ...set,
          flashcardsCount: set.flashcardsCount ?? set.flashcards?.length ?? 0,
        }));
        setFlashcardSets(formatted);
      }

      if (activeTab === "shadowing") {
        const res = await fetch(`${API_URL}/shadow`, { headers });
        const data = await res.json();
        setShadowTopics(data || []);
      }
    } catch (err) {
      setMessageModal({ visible: true, title: "Lỗi", message: "Không thể tải dữ liệu" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, token]);

  // ==================== BOOK ACTIONS ====================
  const openBookModal = (book?: Book) => {
    setCurrentBook(book ?? { title: "", author: "", level: "N5", coverImage: "" });
    setBookModal(true);
  };

  const saveBook = async () => {
    if (!currentBook.title.trim() || !currentBook.author.trim()) {
      setMessageModal({ visible: true, title: "Lỗi", message: "Vui lòng nhập tiêu đề và tác giả" });
      return;
    }

    try {
      const method = currentBook._id ? "PATCH" : "POST";
      const url = currentBook._id ? `${API_URL}/books/${currentBook._id}` : `${API_URL}/books`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(currentBook),
      });

      if (res.ok) {
        const saved = await res.json();
        setBooks(prev =>
          currentBook._id
            ? prev.map(b => b._id === saved._id ? saved : b)
            : [...prev, saved]
        );
        setBookModal(false);
        setMessageModal({ visible: true, title: "Thành công", message: currentBook._id ? "Cập nhật thành công" : "Thêm sách mới" });
      } else {
        const err = await res.json();
        setMessageModal({ visible: true, title: "Lỗi", message: err.message || "Lưu thất bại" });
      }
    } catch {
      setMessageModal({ visible: true, title: "Lỗi", message: "Lỗi kết nối" });
    }
  };

  const deleteBook = (id: string) => {
    setConfirmModal({
      visible: true,
      title: "Xóa sách",
      message: "Chắc chắn xóa sách này?",
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/books/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setBooks(prev => prev.filter(b => b._id !== id));
            setMessageModal({ visible: true, title: "Thành công", message: "Đã xóa sách" });
          }
        } catch { }
        setConfirmModal({ visible: false });
      },
      onCancel: () => setConfirmModal({ visible: false }),
    });
  };

  // ==================== USER ACTIONS ====================
  const openUserModal = (u: User) => {
    setCurrentUser(u);
    setUserModal(true);
  };

  const saveUser = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_URL}/users/${currentUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
        }),
      });

      if (res.ok) {
        const { user: updated } = await res.json();
        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
        setUserModal(false);
        setMessageModal({ visible: true, title: "Thành công", message: "Cập nhật thành công" });
      }
    } catch { }
  };

  const deleteUser = (id: string) => {
    setConfirmModal({
      visible: true,
      title: "Xóa người dùng",
      message: "Chắc chắn xóa người dùng này?",
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/users/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setUsers(prev => prev.filter(u => u.id !== id));
            setMessageModal({ visible: true, title: "Thành công", message: "Đã xóa" });
          }
        } catch { }
        setConfirmModal({ visible: false });
      },
      onCancel: () => setConfirmModal({ visible: false }),
    });
  };

  // ==================== FLASHCARD ACTIONS ====================
  const openFlashcardModal = (set?: FlashcardSet) => {
    setCurrentFlashcardSet(set ?? {
      _id: "",
      title: "",
      description: "",
      isPublic: false,
      level: "N5",
    });
    setFlashcardModal(true);
  };

  const saveFlashcardSet = async () => {
    if (!currentFlashcardSet?.title.trim()) {
      setMessageModal({ visible: true, title: "Lỗi", message: "Vui lòng nhập tiêu đề" });
      return;
    }

    try {
      const method = currentFlashcardSet._id ? "PUT" : "POST";
      const url = currentFlashcardSet._id
        ? `${API_URL}/flashcard-sets/admin/${currentFlashcardSet._id}`
        : `${API_URL}/flashcard-sets`;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(currentFlashcardSet),
      });

      if (res.ok) {
        const saved = await res.json();
        setFlashcardSets(prev =>
          currentFlashcardSet._id
            ? prev.map(s => s._id === saved._id ? { ...saved, flashcardsCount: s.flashcardsCount } : s)
            : [...prev, { ...saved, flashcardsCount: 0 }]
        );
        setFlashcardModal(false);
        setMessageModal({ visible: true, title: "Thành công", message: currentFlashcardSet._id ? "Đã cập nhật" : "Tạo mới thành công" });
      }
    } catch { }
  };

  const deleteFlashcardSet = (id: string) => {
    setConfirmModal({
      visible: true,
      title: "Xóa bộ flashcard",
      message: "Tất cả flashcard bên trong cũng sẽ bị xóa!",
      confirmText: "Xóa vĩnh viễn",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/flashcard-sets/admin/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setFlashcardSets(prev => prev.filter(s => s._id !== id));
            setMessageModal({ visible: true, title: "Thành công", message: "Đã xóa bộ thẻ" });
          }
        } catch { }
        setConfirmModal({ visible: false });
      },
      onCancel: () => setConfirmModal({ visible: false }),
    });
  };

  const openFlashcardPreview = async (set: FlashcardSet) => {
    setSelectedSetTitle(set.title);
    setFlashcardPreviewModal(true);
    try {
      const res = await fetch(`${API_URL}/flashcards/sets/${set._id}/flashcards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSelectedSetFlashcards(await res.json());
    } catch { }
  };

  // ==================== NOTIFICATION ====================
  const sendNotification = async () => {
    if (!newNotifTitle.trim() || !newNotifMessage.trim()) {
      setMessageModal({ visible: true, title: "Lỗi", message: "Nhập đầy đủ tiêu đề & nội dung" });
      return;
    }
    try {
      const res = await fetch(`${API_URL}/admin/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newNotifTitle, message: newNotifMessage }),
      });
      if (res.ok) {
        setMessageModal({ visible:true, title: "Thành công", message: "Đã gửi thông báo!" });
        setNewNotifTitle(""); setNewNotifMessage("");
        setNotifModal(false);
        fetchNotifications();
      }
    } catch { }
  };

  const handleLogout = () => {
    setConfirmModal({
      visible: true,
      title: "Đăng xuất",
      message: "Bạn có chắc chắn muốn đăng xuất?",
      confirmText: "Đăng xuất",
      onConfirm: async () => {
        await logout();
        router.replace("/AuthScreen");
      },
      onCancel: () => setConfirmModal({ visible: false }),
    });
  };

  // ==================== RENDER CONTENT ====================
  const renderContent = () => {
    if (loading) return <ActivityIndicator size="large" color="#4a00e0" style={{ marginTop: 100 }} />;

    if (activeTab === "dashboard" && stats) {
      return (
        <ScrollView>
          <StatsRow stats={stats} />
          <DashboardCharts stats={stats} />
        </ScrollView>
      );
    }

    if (activeTab === "books") return <AdminTable data={books} columns={["title","author","level","chapters"]} labels={{title:"Tựa đề",author:"Tác giả",level:"Level",chapters:"Số chương"}} onEdit={openBookModal} onDelete={deleteBook} />;

    if (activeTab === "users") return (
      <AdminTable
        data={users}
        columns={["avatarURL","name","email","role"]}
        labels={{avatarURL:"",name:"Họ tên",email:"Email",role:"Vai trò"}}
        renderItem={(item) => (
          <View style={{flexDirection:"row",alignItems:"center",gap:12}}>
            {item.avatarURL ? <Image source={{uri:item.avatarURL}} style={{width:40,height:40,borderRadius:20}} /> :
              <View style={{width:40,height:40,borderRadius:20,backgroundColor:"#ccc",justifyContent:"center",alignItems:"center"}}>
                <Text style={{color:"#fff",fontWeight:"bold"}}>{item.name[0]?.toUpperCase()|| "U"}</Text>
              </View>
            }
            <Text style={styles.mainText}>{item.name}</Text>
          </View>
        )}
        renderBadge={(item)=> {
          const r = (item.role||"student").toLowerCase();
          return <Text style={[styles.roleBadge, r==="admin"&&styles.roleAdmin, r==="teacher"&&styles.roleTeacher]}>{r.toUpperCase()}</Text>;
        }}
        onEdit={openUserModal}
        onDelete={deleteUser}
      />
    );

    if (activeTab === "flashcards") return (
      <AdminTable
        data={flashcardSets}
        columns={["title","owner.name","flashcardsCount","isPublic","level"]}
        labels={{title:"Tên bộ thẻ","owner.name":"Chủ sở hữu",flashcardsCount:"Số thẻ",isPublic:"Trạng thái",level:"Level"}}
        renderItem={(item)=> (
          <TouchableOpacity onPress={()=>openFlashcardPreview(item)} style={{flexDirection:"row",alignItems:"center",gap:12}}>
            <MaterialIcons name="folder-open" size={28} color="#4a00e0" />
            <View>
              <Text style={styles.mainText}>{item.title}</Text>
              <Text style={{fontSize:12,color:"#666"}}>bởi {item.owner?.name || "Admin"}</Text>
            </View>
          </TouchableOpacity>
        )}
        renderBadge={(item)=> <Text style={item.isPublic?styles.badgePublic:styles.badgePrivate}>{item.isPublic?"Công khai":"Riêng tư"}</Text>}
        onEdit={openFlashcardModal}
        onDelete={deleteFlashcardSet}
      />
    );

    if (activeTab === "shadowing") return <AdminTable data={shadowTopics} columns={["title","description"]} labels={{title:"Chủ đề",description:"Mô tả"}} />;

    return <Text style={styles.comingSoonText}>Đang phát triển...</Text>;
  };

  // ==================== RENDER ====================
  return (
    <View style={styles.container}>
      {/* SIDEBAR */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <View style={styles.logoContainer}><Text style={styles.logoText}>VP</Text></View>
          <Text style={styles.sidebarTitle}>Admin Panel</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {menuItems.map(item => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, activeTab===item.key && styles.menuItemActive]}
              onPress={()=>setActiveTab(item.key)}
            >
              <FontAwesome5 name={item.icon} size={20} color={activeTab===item.key?"#fff":"#aaa"} />
              <Text style={[styles.menuText, activeTab===item.key && styles.menuTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.logoutMenuItem} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#ff6b6b" />
          <Text style={styles.logoutMenuText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* MAIN CONTENT */}
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>
            {menuItems.find(m=>m.key===activeTab)?.label || "Dashboard"}
          </Text>
          <View style={styles.headerActions}>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm..."
              value={search}
              onChangeText={setSearch}
            />

            {activeTab === "books" && (
              <TouchableOpacity style={styles.addBtn} onPress={()=>openBookModal()}>
                <MaterialIcons name="add" size={24} color="#fff" />
                <Text style={styles.addBtnText}>Thêm sách</Text>
              </TouchableOpacity>
            )}

            {activeTab === "flashcards" && (
              <TouchableOpacity style={styles.addBtn} onPress={()=>openFlashcardModal()}>
                <MaterialIcons name="add" size={24} color="#fff" />
                <Text style={styles.addBtnText}>Tạo bộ thẻ mới</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={()=>setNotifModal(true)} style={styles.notifBtn}>
              <MaterialIcons name="notifications" size={28} color="#fff" />
              {notifications.length>0 && (
                <View style={styles.notifBadge}>
                  <Text style={{color:"#fff",fontSize:10,fontWeight:"bold"}}>{notifications.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{paddingBottom:40}}>
          {renderContent()}
        </ScrollView>
      </View>

      {/* ==================== TẤT CẢ MODALS ==================== */}
      {/* Book Modal */}
      <Modal visible={bookModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{currentBook._id ? "Sửa sách" : "Thêm sách mới"}</Text>
            <TextInput style={styles.input} placeholder="Tựa đề *" value={currentBook.title} onChangeText={t=>setCurrentBook(p=>({...p,title:t}))} />
            <TextInput style={styles.input} placeholder="Tác giả *" value={currentBook.author} onChangeText={t=>setCurrentBook(p=>({...p,author:t}))} />
            <TextInput style={styles.input} placeholder="Link ảnh bìa" value={currentBook.coverImage} onChangeText={t=>setCurrentBook(p=>({...p,coverImage:t}))} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={()=>setBookModal(false)}><Text style={styles.cancelText}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveBook}><Text style={styles.saveText}>Lưu</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. USER MODAL */}
      <Modal visible={userModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chỉnh sửa người dùng</Text>
            <TextInput style={styles.input} placeholder="Họ tên" value={currentUser?.name || ""} onChangeText={t => setCurrentUser(p => p ? { ...p, name: t } : null)} />
            <TextInput style={styles.input} placeholder="Email" value={currentUser?.email || ""} onChangeText={t => setCurrentUser(p => p ? { ...p, email: t } : null)} />
            <Text style={{ marginBottom: 8, color: "#444" }}>Vai trò</Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
              {['student', 'teacher', 'admin'].map(r => (
                <TouchableOpacity
                  key={r}
                  style={{
                    flex: 1,
                    padding: 14,
                    backgroundColor: currentUser?.role === r ? "#4a00e0" : "#f0f0f0",
                    borderRadius: 12,
                    alignItems: "center"
                  }}
                  onPress={() => setCurrentUser(p => p ? { ...p, role: r } : null)}
                >
                  <Text style={{ color: currentUser?.role === r ? "#fff" : "#000", fontWeight: "600" }}>
                    {r.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setUserModal(false)}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveUser}>
                <Text style={styles.saveText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. FLASHCARD SET MODAL */}
      <Modal visible={flashcardModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {currentFlashcardSet?._id ? "Sửa bộ flashcard" : "Tạo bộ flashcard mới"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Tên bộ thẻ *"
              value={currentFlashcardSet?.title || ""}
              onChangeText={(text) => setCurrentFlashcardSet(prev => prev ? { ...prev, title: text } : null)}
            />

            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Mô tả (tùy chọn)"
              multiline
              value={currentFlashcardSet?.description || ""}
              onChangeText={(text) => setCurrentFlashcardSet(prev => prev ? { ...prev, description: text } : null)}
            />

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ marginBottom: 8, color: "#444" }}>Level</Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {["N5", "N4", "N3", "N2", "N1"].map(l => (
                    <TouchableOpacity
                      key={l}
                      style={{
                        padding: 10,
                        backgroundColor: currentFlashcardSet?.level === l ? "#4a00e0" : "#f0f0f0",
                        borderRadius: 8,
                      }}
                      onPress={() => setCurrentFlashcardSet(p => p ? { ...p, level: l } : null)}
                    >
                      <Text style={{ color: currentFlashcardSet?.level === l ? "#fff" : "#000" }}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text style={{ marginBottom: 8, color: "#444" }}>Công khai?</Text>
                <TouchableOpacity
                  style={{
                    padding: 12,
                    backgroundColor: currentFlashcardSet?.isPublic ? "#4CAF50" : "#f0f0f0",
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                  onPress={() => setCurrentFlashcardSet(p => p ? { ...p, isPublic: !p.isPublic } : null)}
                >
                  <Text style={{ color: currentFlashcardSet?.isPublic ? "#fff" : "#000", fontWeight: "600" }}>
                    {currentFlashcardSet?.isPublic ? "Có" : "Không"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setFlashcardModal(false)}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveFlashcardSet}>
                <Text style={styles.saveText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. FLASHCARD PREVIEW MODAL */}
      <Modal visible={flashcardPreviewModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: "95%", maxWidth: 800, maxHeight: "90%", padding: 0 }]}>
            <View style={{ padding: 24, backgroundColor: "#4a00e0", borderTopLeftRadius: 20, borderTopRightRadius: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: "#fff" }}>{selectedSetTitle}</Text>
              <TouchableOpacity onPress={() => setFlashcardPreviewModal(false)}>
                <MaterialIcons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 24, flex: 1 }}>
              {selectedSetFlashcards.length === 0 ? (
                <Text style={{ textAlign: "center", color: "#999", fontSize: 18, marginTop: 50 }}>
                  Bộ thẻ này chưa có flashcard nào
                </Text>
              ) : (
                <View style={{ gap: 16 }}>
                  {selectedSetFlashcards.map((card, index) => (
                    <View key={card._id} style={{ backgroundColor: "#f8f9fa", padding: 20, borderRadius: 16, borderLeftWidth: 5, borderLeftColor: "#4a00e0" }}>
                      <Text style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                        Thẻ {index + 1} / {selectedSetFlashcards.length}
                      </Text>
                      <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1a1a2e", marginBottom: 8 }}>
                        {card.vocabulary}
                      </Text>
                      {card.phonetic && (
                        <Text style={{ fontSize: 16, color: "#4a00e0", fontStyle: "italic", marginBottom: 8 }}>
                          {card.phonetic}
                        </Text>
                      )}
                      <Text style={{ fontSize: 18, color: "#333", lineHeight: 26 }}>
                        {card.meaning}
                      </Text>
                      {card.image && (
                        <Image
                          source={{ uri: `${API_URL}${card.image}` }}
                          style={{ width: "100%", height: 200, borderRadius: 12, marginTop: 12 }}
                          resizeMode="cover"
                        />
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: "#eee", alignItems: "center" }}>
              <Text style={{ color: "#666" }}>
                Tổng cộng: <Text style={{ fontWeight: "bold" }}>{selectedSetFlashcards.length}</Text> flashcard
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. NOTIFICATION MODAL – ĐÃ SỬA LẠI ĐỂ HIỆN */}
      <Modal visible={notifModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: "90%", width: "95%" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={styles.modalTitle}>Thông báo hệ thống</Text>
              <TouchableOpacity onPress={() => setNotifModal(false)}>
                <MaterialIcons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Gửi thông báo mới */}
            <View style={{ backgroundColor: "#f8f9fa", padding: 16, borderRadius: 16, marginBottom: 20 }}>
              <Text style={{ fontWeight: "bold", marginBottom: 10 }}>Gửi thông báo mới</Text>
              <TextInput style={styles.input} placeholder="Tiêu đề" value={newNotifTitle} onChangeText={setNewNotifTitle} />
              <TextInput style={[styles.input, { height: 100 }]} placeholder="Nội dung" multiline value={newNotifMessage} onChangeText={setNewNotifMessage} />
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setNotifModal(false)}>
                  <Text style={styles.cancelText}>Đóng</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={sendNotification}>
                  <Text style={styles.saveText}>Gửi</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Lịch sử */}
            <ScrollView>
              {notifications.length === 0 ? (
                <Text style={{ textAlign: "center", color: "#999", marginTop: 50 }}>Chưa có thông báo nào</Text>
              ) : (
                notifications.map((n) => (
                  <View key={n._id} style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: "#4a00e0" }}>
                    <Text style={{ fontWeight: "bold", fontSize: 16 }}>{n.title}</Text>
                    <Text style={{ color: "#444", marginVertical: 8 }}>{n.message}</Text>
                    <Text style={{ fontSize: 12, color: "#888" }}>{new Date(n.createdAt).toLocaleString("vi-VN")}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Confirm & Message Modal */}
      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onCancel={confirmModal.onCancel}
        onConfirm={confirmModal.onConfirm}
        confirmText={confirmModal.confirmText}
      />

      <MessageModal
        visible={messageModal.visible}
        title={messageModal.title}
        message={messageModal.message}
        onClose={()=>setMessageModal({visible:false})}
      />
    </View>
  );
}

// ==================== ADMIN TABLE COMPONENT ====================



// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", backgroundColor: "#f5f7fa" },
  sidebar: { width: SIDEBAR_WIDTH, backgroundColor: "#1e1e2e", paddingTop: Platform.OS === "ios" ? 60 : 40 },
  sidebarHeader: { padding: 24, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#333" },
  logoContainer: { width: 70, height: 70, backgroundColor: "#4a00e0", borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  logoText: { fontWeight: "bold", fontSize: 28, color: "#fff" },
  sidebarTitle: { fontSize: 18, color: "#aaa", fontWeight: "600" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 24, gap: 16 },
  menuItemActive: { backgroundColor: "#4a00e0", borderLeftWidth: 4, borderLeftColor: "#00d4ff" },
  menuText: { fontSize: 16, color: "#a0a0a0" },
  menuTextActive: { color: "#fff", fontWeight: "600" },
  logoutMenuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 18, paddingHorizontal: 24, gap: 16, borderTopWidth: 1, borderTopColor: "#333" },
  logoutMenuText: { color: "#ff6b6b", fontSize: 16, fontWeight: "600" },
  roleTeacher: { backgroundColor: "#e91e63", color: "#fff" },
  roleStudent: { backgroundColor: "#00bcd4", color: "#fff" },
  mainContent: { flex: 1 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 24, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  pageTitle: { fontSize: 28, fontWeight: "bold", color: "#1a1a2e" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  searchInput: { width: 320, backgroundColor: "#f1f3f5", padding: 14, borderRadius: 16, fontSize: 16 },
  addBtn: { backgroundColor: "#4a00e0", flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, gap: 8 },
  addBtnText: { color: "#fff", fontWeight: "600" },
  content: { flex: 1, padding: 24 },
  statCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    width: (width - 80) / 3,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  statNumber: { fontSize: 32, fontWeight: "bold", color: "#1a1a2e", marginVertical: 8 },
  statLabel: { fontSize: 16, color: "#666" },
  chartContainer: { alignItems: "center", backgroundColor: "#1e1e2e", padding: 16, borderRadius: 20 },
  chartTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 16 },
  notifBtn: { backgroundColor: "#4a00e0", padding: 14, borderRadius: 50, position: "relative" },
  notifBadge: { position: "absolute", top: 8, right: 8, backgroundColor: "#e91e63", borderRadius: 10, width: 18, height: 18, justifyContent: "center", alignItems: "center" },
  table: { backgroundColor: "#fff", borderRadius: 20, overflow: "hidden", elevation: 8, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, marginBottom: 32 },
  tableHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#4a00e0" },
  tableTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  itemCount: { fontSize: 14, color: "#e0d0ff" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  rowContent: { flexDirection: "row", alignItems: "center", gap: 20, flex: 1 },
  mainText: { fontSize: 17, fontWeight: "600", color: "#1a1a2e" },
  rowDetails: { flex: 1 },
  detailText: { fontSize: 14, color: "#666", marginBottom: 4 },
  badgeContainer: { marginLeft: 12 },
  badgePublic: {
    backgroundColor: "#e8f5e8", color: "#2e7d32", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, fontSize:
      12
  },
  badgePrivate: { backgroundColor: "#ffebee", color: "#c62828", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, fontSize: 12 },
  roleBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, fontSize: 12, fontWeight: "bold", backgroundColor: "#e0e0e0" },
  roleAdmin: { backgroundColor: "#4a00e0", color: "#fff" },
  actions: { flexDirection: "row", gap: 16 },
  editBtn: { padding: 8 },
  deleteBtn: { padding: 8 },
  comingSoonText: { textAlign: "center", fontSize: 24, color: "#999", marginTop: 100 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "90%", maxWidth: 500, backgroundColor: "#fff", borderRadius: 20, padding: 28 },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 24, textAlign: "center", color: "#1a1a2e" },
  input: { backgroundColor: "#f1f3f5", padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginTop: 10 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10 },
  cancelText: { color: "#666", fontSize: 16 },
  saveBtn: { backgroundColor: "#4a00e0", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  saveText: { color: "#fff", fontWeight: "600" },
});
