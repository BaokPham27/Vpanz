// styles/sharedStyles.ts
import { Dimensions, Platform, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = 280;

export const sharedStyles = StyleSheet.create({
  // ==================== LAYOUT ====================
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f7fa',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#1e1e2e',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  sidebarHeader: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  logoContainer: {
    width: 70,
    height: 70,
    backgroundColor: '#4a00e0',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontWeight: 'bold',
    fontSize: 28,
    color: '#fff',
  },
  sidebarTitle: {
    fontSize: 18,
    color: '#aaa',
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
  },

  // ==================== HEADER ====================
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  searchInput: {
    width: 320,
    backgroundColor: '#f1f3f5',
    padding: 14,
    borderRadius: 16,
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: '#4a00e0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  notifBtn: {
    backgroundColor: '#4a00e0',
    padding: 14,
    borderRadius: 50,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#e91e63',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ==================== CONTENT ====================
  content: {
    flex: 1,
    padding: 24,
  },

  // ==================== MENU ====================
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 16,
  },
  menuItemActive: {
    backgroundColor: '#4a00e0',
    borderLeftWidth: 4,
    borderLeftColor: '#00d4ff',
  },
  menuText: {
    fontSize: 16,
    color: '#a0a0a0',
  },
  menuTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  logoutMenuText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
  },

  // ==================== STAT CARDS ====================
  statCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    width: (width - 400) / 3,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },

  // ==================== ADMIN TABLE ====================
  table: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    marginBottom: 32,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#4a00e0',
  },
  tableTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  itemCount: {
    fontSize: 14,
    color: '#e0d0ff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flex: 1,
  },
  mainText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  rowDetails: {
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  badgeContainer: {
    marginLeft: 12,
  },
  badgePublic: {
    backgroundColor: '#e8f5e8',
    color: '#2e7d32',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '600',
  },
  badgePrivate: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '600',
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#e0e0e0',
  },
  roleAdmin: {
    backgroundColor: '#4a00e0',
    color: '#fff',
  },
  roleTeacher: {
    backgroundColor: '#e91e63',
    color: '#fff',
  },
  roleStudent: {
    backgroundColor: '#00bcd4',
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  editBtn: {
    padding: 8,
  },
  deleteBtn: {
    padding: 8,
  },

  // ==================== MODALS ====================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#1a1a2e',
  },
  input: {
    backgroundColor: '#f1f3f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: '#4a00e0',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveText: {
    color: '#fff',
    fontWeight: '600',
  },

  // ==================== CHARTS & MISC ====================
  chartContainer: {
    alignItems: 'center',
    backgroundColor: '#1e1e2e',
    padding: 16,
    borderRadius: 20,
    marginTop: 20,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  comingSoonText: {
    textAlign: 'center',
    fontSize: 24,
    color: '#999',
    marginTop: 100,
  },
});
