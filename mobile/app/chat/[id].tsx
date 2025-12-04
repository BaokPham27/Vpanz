// app/chat/[id].tsx – FULLCODE ĐÃ FIX KIỂU DỮ LIỆU & AVATAR
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Bubble,
  Composer,
  GiftedChat,
  IMessage,
  InputToolbar,
  Message,
  MessageText,
  MessageTextProps,
  Send,
  Time,
  TimeProps,
} from 'react-native-gifted-chat';
import { Socket, io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

const SOCKET_URL = 'https://vpanz-api.onrender.com';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  token: string;
  avatarURL?: string | null;
}

type SenderInfo = string | { _id: string; id?: string; name?: string; email?: string };
type RawMessage = {
  _id: string;
  message: string;
  createdAt: string;
  sender: SenderInfo;
};

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const receiverId = String(params.id ?? '');
  const { user } = useAuth() as { user: AuthUser | null };
  const router = useRouter();

  const [messages, setMessages] = useState<IMessage[]>([]);
  const socket = useRef<Socket | null>(null);
  const pendingMessages = useRef<Map<string, IMessage>>(new Map());

  const receiverInfoRef = useRef<{ name: string; avatarURL?: string } | null>(null);

  if (!user || !receiverId) {
    useEffect(() => {
      router.replace('/');
    }, []);
    return <SafeAreaView style={{ flex: 1, backgroundColor: '#0b1220' }} />;
  }

  // ======================
  // 🔥 FIX QUAN TRỌNG NHẤT: Luôn trả về string
  // ======================
  const getSenderId = (sender: SenderInfo): string => {
    if (typeof sender === 'string') return String(sender);
    return String(sender._id || sender.id || '');
  };

  const getAvatarSource = (url?: string | null): string | undefined => {
    if (!url || url.trim() === '') return undefined;

    const trimmed = url.trim();

    if (trimmed.includes('ibb.co') || trimmed.includes('i.ibb.co')) {
      return JSON.stringify({
        uri: trimmed,
        headers: { 'User-Agent': 'Expo App' },
      }) as any;
    }
    return trimmed;
  };

  useEffect(() => {
    socket.current = io(SOCKET_URL, {
      auth: { token: user.token },
      transports: ['websocket'],
    });

    socket.current.on('connect', () => console.log('Chat socket connected'));

    const loadHistory = async () => {
      try {
        const historyRes = await fetch(`${SOCKET_URL}/api/chat/history/${receiverId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data: RawMessage[] = await historyRes.json();

        if (!receiverInfoRef.current) {
          try {
            const usersRes = await fetch(`${SOCKET_URL}/api/users/search?q=`, {
              headers: { Authorization: `Bearer ${user.token}` },
            });
            const allUsers = await usersRes.json();
            const found = allUsers.find((u: any) => String(u.id) === String(receiverId));
            if (found) {
              receiverInfoRef.current = {
                name: found.name,
                avatarURL: found.avatarURL || undefined,
              };
            }
          } catch {}
        }

        const receiver = receiverInfoRef.current || { name: 'Đối phương', avatarURL: undefined };

        const formatted: IMessage[] = data.map((msg) => {
          const senderId = getSenderId(msg.sender);
          const isFromMe = String(senderId) === String(user.id); // 🔥 FIX TẠI ĐÂY

          return {
            _id: msg._id,
            text: msg.message,
            createdAt: new Date(msg.createdAt),
            user: {
              _id: isFromMe ? String(user.id) : String(receiverId),
              name: isFromMe ? user.name : receiver.name,
              avatar: isFromMe
                ? getAvatarSource(user.avatarURL)
                : getAvatarSource(receiver.avatarURL),
            },
          };
        });

        setMessages(formatted.reverse());
      } catch (err) {
        console.error('Load chat history error:', err);
      }
    };

    loadHistory();

    socket.current.on('newMessage', (msg: RawMessage) => {
      const senderId = getSenderId(msg.sender);
      const isFromMe = String(senderId) === String(user.id); // 🔥 FIX

      // Kiểm tra tin tạm
      const pendingEntry = Array.from(pendingMessages.current.entries()).find(
        ([_, m]) =>
          m.text === msg.message &&
          Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 5000
      );

      if (pendingEntry) {
        const [tempId] = pendingEntry;
        pendingMessages.current.delete(tempId);
        setMessages((prev) =>
          prev.map((m) =>
            m._id === tempId
              ? { ...m, _id: msg._id, createdAt: new Date(msg.createdAt) }
              : m
          )
        );
        return;
      }

      const receiver = receiverInfoRef.current || { name: 'Đối phương' };

      const newMsg: IMessage = {
        _id: msg._id,
        text: msg.message,
        createdAt: new Date(msg.createdAt),
        user: {
          _id: String(senderId), // 🔥 FIX
          name: isFromMe ? user.name : receiver.name,
          avatar: isFromMe
            ? getAvatarSource(user.avatarURL)
            : getAvatarSource(receiver.avatarURL),
        },
      };

      setMessages((prev) => GiftedChat.append(prev, [newMsg]));
    });

    return () => {
      socket.current?.disconnect();
    };
  }, [user, receiverId]);

  const onSend = (newMessages: IMessage[] = []) => {
    const text = newMessages[0]?.text?.trim();
    if (!text || !socket.current?.connected) return;

    const tempId = Date.now().toString();
    const localMsg: IMessage = {
      _id: tempId,
      text,
      createdAt: new Date(),
      user: { _id: String(user.id), name: user.name }, // 🔥 FIX
    };

    pendingMessages.current.set(tempId, localMsg);
    setMessages((prev) => GiftedChat.append(prev, [localMsg]));

    socket.current.emit('sendMessage', {
      receiverId,
      message: text,
    });
  };

  const renderTime = (props: TimeProps<IMessage>) => (
    <Time
      {...props}
      timeTextStyle={{
        left: { color: '#8b9dc3', fontSize: 11 },
        right: { color: '#a8c7fa', fontSize: 11 },
      }}
    />
  );

  const renderMessageText = (props: MessageTextProps<IMessage>) => (
    <MessageText
      {...props}
      textStyle={{
        left: { color: '#e2e8f0', fontSize: 18 },
        right: { color: '#fff', fontSize: 18 },
      }}
    />
  );

  const renderBubble = (props: any) => (
    <Bubble
      {...props}
      wrapperStyle={{
        right: { backgroundColor: '#0084ff', marginLeft: 80, marginBottom: 8 },
        left: { backgroundColor: '#2d3748', marginRight: 80, marginBottom: 8 },
      }}
    />
  );

  const renderAvatar = (props: any) => {
    const { currentMessage } = props;
    if (!currentMessage?.user?.avatar || currentMessage.user._id === String(user.id))
      return null;

    let uri: string | undefined;

    try {
      const parsed = JSON.parse(currentMessage.user.avatar as string);
      uri = parsed.uri;
    } catch {
      uri = currentMessage.user.avatar as string;
    }

    if (!uri) return null;

    return (
      <View style={styles.avatarWrapper}>
        <Image source={{ uri }} style={styles.avatar} />
      </View>
    );
  };

  const renderUsernameOnMessage = (props: any) => {
    const { currentMessage, previousMessage, position } = props;
    if (position === 'right') return null;
    if (previousMessage?.user?._id === currentMessage?.user?._id) return null;

    return <Text style={styles.username}>{currentMessage?.user?.name}</Text>;
  };

  const renderMessage = (props: any) => (
    <Message
      {...props}
      renderUsernameOnMessage={renderUsernameOnMessage}
      renderTime={renderTime}
      renderMessageText={renderMessageText}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground
        source={{
          uri: 'https://marketplace.canva.com/EAGQn6X58kU/2/0/1600w/canva-h%C3%ACnh-n%E1%BB%81n-m%C3%A1y-t%C3%ADnh-l%E1%BB%9Di-kh%E1%BA%B3ng-%C4%91%E1%BB%8Bnh-t%E1%BA%A1o-%C4%91%E1%BB%99ng-l%E1%BB%B1c-xanh-d%C6%B0%C6%A1ng-nh%E1%BA%A1t-kem-ki%E1%BB%83u-ch%E1%BB%AF-l%E1%BA%A1-m%E1%BA%AFt-XRi0ikFXYgc.jpg',
        }}
        style={{ flex: 1 }}
      >
        <GiftedChat
          messages={messages}
          onSend={onSend}
          user={{ _id: String(user.id) }} // 🔥 FIX CUỐI
          renderSend={(props) => (
            <Send {...props} containerStyle={styles.sendContainer}>
              <Text style={styles.sendText}>Gửi</Text>
            </Send>
          )}
          renderInputToolbar={(props) => (
            <InputToolbar {...(props as any)} containerStyle={styles.inputToolbar}>
              <Composer
                {...(props as any)}
                placeholder="Aa..."
                placeholderTextColor="#8b9dc3"
                textInputStyle={{ color: '#fff', fontSize: 16 }}
              />
            </InputToolbar>
          )}
          renderBubble={renderBubble}
          renderMessage={renderMessage}
          renderAvatar={renderAvatar}
          messagesContainerStyle={{
            backgroundColor: 'transparent',
            paddingBottom: 10,
          }}
        />
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sendContainer: { justifyContent: 'center', paddingRight: 12, paddingBottom: 6 },
  sendText: { color: '#2284ff', fontSize: 16, fontWeight: '600' },
  inputToolbar: {
    backgroundColor: '#1e293b',
    borderRadius: 30,
    marginHorizontal: 10,
    marginVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 0,
  },
  username: {
    color: '#8b9dc3',
    fontSize: 12,
    marginLeft: 12,
    marginBottom: 3,
    fontWeight: '600',
  },
  avatarWrapper: { marginRight: 10, marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
});
