// models/Chat.js – MySQL2 Version (2025)
const db = require('../db');

class Chat {
  // Tìm hoặc tạo chat 1-1 giữa 2 người
  static async findOrCreateOneOnOne(userId1, userId2) {
    const [existing] = await db.query(`
      SELECT c.id FROM chats c
      JOIN chat_participants cp1 ON cp1.chatId = c.id AND cp1.userId = ?
      JOIN chat_participants cp2 ON cp2.chatId = c.id AND cp2.userId = ?
      WHERE (SELECT COUNT(*) FROM chat_participants cp WHERE cp.chatId = c.id) = 2
      LIMIT 1
    `, [userId1, userId2]);

    if (existing.length > 0) {
      return existing[0].id;
    }

    // Tạo mới
    const [result] = await db.query('INSERT INTO chats () VALUES ()');
    const chatId = result.insertId;

    await db.query('INSERT INTO chat_participants (chatId, userId) VALUES (?, ?), (?, ?)',
      [chatId, userId1, chatId, userId2]);

    return chatId;
  }

  // Lấy danh sách chat của user
  static async getUserChats(userId) {
    const [rows] = await db.query(`
      SELECT 
        c.id AS chatId,
        c.updatedAt,
        u.id AS otherUserId,
        u.name AS otherUserName,
        u.avatarURL,
        msg.message AS lastMessage,
        msg.createdAt AS lastMessageTime,
        msg.senderId,
        cp.unreadCount
      FROM chats c
      JOIN chat_participants cp ON cp.chatId = c.id AND cp.userId = ?
      JOIN chat_participants cp2 ON cp2.chatId = c.id AND cp2.userId != ?
      JOIN users u ON u.id = cp2.userId
      LEFT JOIN chat_messages msg ON msg.id = (
        SELECT id FROM chat_messages 
        WHERE chatId = c.id 
        ORDER BY createdAt DESC LIMIT 1
      )
      LEFT JOIN chat_participants cp ON cp.chatId = c.id AND cp.userId = ?
      ORDER BY c.updatedAt DESC
    `, [userId, userId, userId]);

    return rows.map(row => ({
      chatId: row.chatId,
      otherUser: {
        id: row.otherUserId,
        name: row.otherUserName,
        avatarURL: row.avatarURL
      },
      lastMessage: row.lastMessage ? {
        text: row.lastMessage,
        sentAt: row.lastMessageTime,
        isMine: row.senderId === userId
      } : null,
      updatedAt: row.updatedAt,
      unreadCount: row.unreadCount || 0
    }));
  }

  // Lấy tin nhắn trong chat
  static async getMessages(chatId, userId, limit = 50, before = null) {
    let query = `
      SELECT m.*, u.name AS senderName, u.avatarURL
      FROM chat_messages m
      JOIN users u ON u.id = m.senderId
      WHERE m.chatId = ?
    `;
    const params = [chatId];

    if (before) {
      query += ' AND m.createdAt < ?';
      params.push(before);
    }

    query += ' ORDER BY m.createdAt DESC LIMIT ?';
    params.push(limit);

    const [rows] = await db.query(query, params);
    return rows.reverse(); // cũ → mới
  }

  // Gửi tin nhắn
  static async sendMessage(chatId, senderId, message, type = 'text') {
    const [result] = await db.query(
      'INSERT INTO chat_messages (chatId, senderId, message, messageType) VALUES (?, ?, ?, ?)',
      [chatId, senderId, message, type]
    );

    // Tăng unread cho người nhận
    await db.query(`
      UPDATE chat_participants 
      SET unreadCount = unreadCount + 1 
      WHERE chatId = ? AND userId != ?
    `, [chatId, senderId]);

    return { id: result.insertId, message, senderId, createdAt: new Date() };
  }
}

module.exports = Chat;