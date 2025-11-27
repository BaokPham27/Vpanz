import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Conditional import for secure store (only works on native)
let getItemAsync: (key: string) => Promise<string | null>;

if (Platform.OS !== 'web') {
  try {
    const SecureStore = require('expo-secure-store');
    getItemAsync = SecureStore.getItemAsync;
  } catch (e) {
    getItemAsync = AsyncStorage.getItem;
  }
} else {
  getItemAsync = AsyncStorage.getItem;
}

// TODO: Replace with your actual API base URL
const API_URL = 'http://localhost:5000/api';

const getAuthToken = async () => {
  try {
    const token = await getItemAsync('token');
    return token;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

export default function FlashcardSetsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sets, setSets] = useState<any[]>([]);
  const [menuVisibleFor, setMenuVisibleFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [newSetTitle, setNewSetTitle] = useState('');
  const [newSetDescription, setNewSetDescription] = useState('');
  const [editSetTitle, setEditSetTitle] = useState('');
  const [editSetDescription, setEditSetDescription] = useState('');

  const fetchFlashcardSets = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'You are not authenticated.');
        setLoading(false);
        return;
      }
      const response = await fetch(`${API_URL}/flashcard-sets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setSets(data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch flashcard sets');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while fetching flashcard sets.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFlashcardSets();
    }, [])
  );

  const filteredSets = sets.filter(set =>
    set.title && set.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNavigateToSet = (setId: string) => {
    router.push({
      pathname: '/(auth)/flashcards/[setId]',
      params: { setId },
    });
  };

  const handleEdit = (setId: string) => {
    const set = sets.find(s => s._id === setId);
    if (set) {
      setEditingSetId(setId);
      setEditSetTitle(set.title);
      setEditSetDescription(set.description || '');
      setIsEditModalVisible(true);
      setMenuVisibleFor(null);
    }
  };

  const handleDelete = (setId: string) => {
    Alert.alert(
      'Delete Set',
      'Are you sure you want to delete this flashcard set?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setMenuVisibleFor(null) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getAuthToken();
              console.log('Delete set token:', token ? 'EXISTS' : 'MISSING');
              if (!token) {
                Alert.alert('Error', 'Authentication failed. Please login again.');
                setMenuVisibleFor(null);
                return;
              }

              console.log('Attempting to delete flashcard set:', setId);
              console.log('Delete URL:', `${API_URL}/flashcard-sets/${setId}`);
              
              const response = await fetch(`${API_URL}/flashcard-sets/${setId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              console.log('Delete response status:', response.status);
              const responseData = await response.json();
              console.log('Delete response data:', responseData);

              if (response.ok) {
                setSets(prevSets => prevSets.filter(set => set._id !== setId));
                setMenuVisibleFor(null);
                console.log('FlashSet removed from state');
                Alert.alert('Success', 'Flashcard set deleted successfully!');
              } else {
                Alert.alert('Error', responseData.message || `Failed to delete flashcard set (${response.status})`);
              }
            } catch (error) {
              console.error('Error deleting flashcard set:', error);
              Alert.alert('Error', 'An error occurred while deleting the flashcard set.');
              setMenuVisibleFor(null);
            }
          },
        },
      ]
    );
  };

  const handleCreateSet = async () => {
    if (!newSetTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for the flashcard set.');
      return;
    }

    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/flashcard-sets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newSetTitle,
          description: newSetDescription,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSets(prevSets => [data, ...prevSets]);
        setNewSetTitle('');
        setNewSetDescription('');
        setIsModalVisible(false);
        Alert.alert('Success', 'Flashcard set created successfully!');
      } else {
        Alert.alert('Error', data.message || 'Failed to create flashcard set');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while creating the flashcard set.');
      console.error(error);
    }
  };

  const handleCloseModal = () => {
    setNewSetTitle('');
    setNewSetDescription('');
    setIsModalVisible(false);
  };

  const handleUpdateSet = async () => {
    if (!editSetTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for the flashcard set.');
      return;
    }

    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/flashcard-sets/${editingSetId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editSetTitle,
          description: editSetDescription,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSets(prevSets =>
          prevSets.map(set => (set._id === editingSetId ? data : set))
        );
        setEditSetTitle('');
        setEditSetDescription('');
        setEditingSetId(null);
        setIsEditModalVisible(false);
        Alert.alert('Success', 'Flashcard set updated successfully!');
      } else {
        Alert.alert('Error', data.message || 'Failed to update flashcard set');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while updating the flashcard set.');
      console.error(error);
    }
  };

  const handleCloseEditModal = () => {
    setEditSetTitle('');
    setEditSetDescription('');
    setEditingSetId(null);
    setIsEditModalVisible(false);
  };

  const renderSetItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => handleNavigateToSet(item._id)} style={styles.setItem}>
      <View style={styles.setItemDetails}>
        <Text style={styles.setTitle}>{item.title}</Text>
        <Text style={styles.setDescription}>{item.description}</Text>
        <Text style={styles.setInfo}>
          {item.flashcards ? item.flashcards.length : 0} cards · Updated on {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity onPress={() => setMenuVisibleFor(menuVisibleFor === item._id ? null : item._id)} style={styles.menuButton}>
        <Ionicons name="ellipsis-vertical" size={24} color="#666" />
      </TouchableOpacity>
      {menuVisibleFor === item._id && (
        <View style={styles.menu}>
          <TouchableOpacity onPress={() => handleEdit(item._id)} style={styles.menuItem}>
            <Text>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.menuItem}>
            <Text>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Flashcard Sets</Text>
      <View style={styles.controls}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search by title..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.newSetButton} onPress={() => setIsModalVisible(true)}>
          <Text style={styles.newSetButtonText}>New Set</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredSets}
        renderItem={renderSetItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text>No flashcard sets found.</Text>}
      />

      {/* Create Flashcard Set Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Flashcard Set</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Set Title"
              placeholderTextColor="#999"
              value={newSetTitle}
              onChangeText={setNewSetTitle}
            />

            <TextInput
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Description (optional)"
              placeholderTextColor="#999"
              value={newSetDescription}
              onChangeText={setNewSetDescription}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleCloseModal}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleCreateSet}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Flashcard Set Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Flashcard Set</Text>
              <TouchableOpacity onPress={handleCloseEditModal}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Set Title"
              placeholderTextColor="#999"
              value={editSetTitle}
              onChangeText={setEditSetTitle}
            />

            <TextInput
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Description (optional)"
              placeholderTextColor="#999"
              value={editSetDescription}
              onChangeText={setEditSetDescription}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleCloseEditModal}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleUpdateSet}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  controls: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  newSetButton: {
    marginLeft: 12,
    height: 40,
    paddingHorizontal: 16,
    backgroundColor: '#007bff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newSetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 16,
  },
  setItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  setItemDetails: {
    flex: 1,
  },
  setTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  setDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  setInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  menuButton: {
    padding: 8,
  },
  menu: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#007bff',
  },
  modalButtonSecondary: {
    backgroundColor: '#e0e0e0',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
