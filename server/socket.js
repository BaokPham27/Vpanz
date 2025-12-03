// socket.js – MySQL2 + REALTIME CHAT & NOTIFICATION 2025
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

function formatTimeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

function initSocket(httpServer, db) {
  const io = new Server(httpServer, { cors: { origin: "*" } });
  const onlineUsers = new Map();

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id.toString();
    console.log('User connected:', userId);
    onlineUsers.set(userId, socket);
    socket.join(userId);

    // Load recent chats
    const loadRecentChats = async () => {
      try {
        const [chats] = await db.query(`
          SELECT c.id, c.updatedAt, m.message AS lastMsg, m.createdAt AS msgTime,
                 u.id AS otherId, u.name, u.email, u.avatarURL
          FROM chats c
          JOIN chat_participants cp ON c.id = cp.chatId
          LEFT JOIN chat_messages m ON c.lastMessageId = m.id
          LEFT JOIN users u ON u.id = (
            SELECT userId FROM chat_participants 
            WHERE chatId = c.id AND userId != ? LIMIT 1
          )
          WHERE cp.userId = ?
          ORDER BY c.updatedAt DESC LIMIT 20
        `, [userId, userId]);

        const formatted = chats.map(chat => ({
          chatId: chat.id,
          user: {
            id: chat.otherId || userId,
            name: chat.name || 'Người dùng đã xóa',
            email: chat.email || '',
            avatarURL: chat.avatarURL || null
          },
          preview: chat.lastMsg || 'Đã gửi tin nhắn',
          lastMessageAt: chat.msgTime || chat.updatedAt
        }));

        socket.emit('recentChats', formatted);
      } catch (err) {
        console.error('Lỗi load recent chats:', err);
        socket.emit('recentChats', []);
      }
    };

    loadRecentChats();
    socket.on('getRecentChats', loadRecentChats);

    // Send message
    socket.on('sendMessage', async ({ receiverId, message }) => {
      if (!message?.trim()) return;

      try {
        const conn = await db.getConnection();
        await conn.beginTransaction();

        // Tìm hoặc tạo chat
        const [existing] = await conn.query(
          'SELECT chatId FROM chat_participants WHERE userId IN (?, ?) GROUP BY chatId HAVING COUNT(DISTINCT userId) = 2',
          [userId, receiverId]
        );

        let chatId;
        if (existing.length > 0) {
          chatId = existing[0].chatId;
        } else {
          const [res] = await conn.query('INSERT INTO chats (type) VALUES ("private")');
          chatId = res.insertId;
          await conn.query('INSERT INTO chat_participants (chatId, userId) VALUES (?, ?), (?, ?)',
            [chatId, userId, chatId, receiverId]
          );
        }

        // Tạo tin nhắn
        const [msgRes] = await conn.query(
          'INSERT INTO chat_messages (chatId, senderId, message) VALUES (?, ?, ?)',
          [chatId, userId, message.trim()]
        );

        await conn.query('UPDATE chats SET lastMessageId = ?, updatedAt = NOW() WHERE id = ?', [msgRes.insertId, chatId]);
        await conn.commit();
        conn.release();

        const payload = {
          _id: msgRes.insertId,
          chatId,
          message: message.trim(),
          createdAt: new Date(),
          sender: { id: userId }
        };

        io.to(chatId.toString()).emit('newMessage', payload);
        [userId, receiverId].forEach(id => onlineUsers.get(id)?.emit('getRecentChats'));

      } catch (err) {
        console.error('Lỗi gửi tin nhắn:', err);
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    });
  });

  // Hàm gửi thông báo
  io.sendNotification = async (userId, { title, message, type = 'info', data = {} }) => {
    try {
      await db.query(
        'INSERT INTO notifications (userId, title, message, type, data) VALUES (?, ?, ?, ?, ?)',
        [userId, title, message, type, JSON.stringify(data)]
      );
      io.to(userId.toString()).emit('newNotification', {
        title, message, type, data, read: false, time: 'Vừa xong'
      });
    } catch (err) {
      console.error('Lỗi gửi thông báo:', err);
    }
  };

  return io;
}

module.exports = { initSocket };