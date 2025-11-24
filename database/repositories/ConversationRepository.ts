import { getDatabase } from '../index';
import { Client } from './ClientRepository';

export interface Conversation {
  id: number;
  client_id: number;
  last_message_at: number;
  unread_count: number;
}

export interface ConversationWithClient extends Conversation {
  client_name: string;
  client_email: string;
  client_phone?: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  text: string;
  is_sent: boolean;
  created_at: number;
}

export interface CreateConversationInput {
  client_id: number;
}

export interface CreateMessageInput {
  conversation_id: number;
  text: string;
  is_sent: boolean;
}

export interface ConversationWithLastMessage extends ConversationWithClient {
  last_message_text?: string;
  last_message_created_at?: number;
}

export class ConversationRepository {
  static async getAll(): Promise<ConversationWithClient[]> {
    const db = getDatabase();
    const result = await db.getAllAsync<ConversationWithClient>(`
      SELECT c.*, cl.name as client_name, cl.email as client_email, cl.phone as client_phone
      FROM conversations c
      INNER JOIN clients cl ON c.client_id = cl.id
      ORDER BY c.last_message_at DESC
    `);
    return result;
  }

  static async getAllWithLastMessage(): Promise<ConversationWithLastMessage[]> {
    const db = getDatabase();
    const result = await db.getAllAsync<ConversationWithLastMessage>(`
      SELECT 
        c.*,
        cl.name as client_name,
        cl.email as client_email,
        cl.phone as client_phone,
        m.text as last_message_text,
        m.created_at as last_message_created_at
      FROM conversations c
      INNER JOIN clients cl ON c.client_id = cl.id
      LEFT JOIN (
        SELECT m1.*
        FROM messages m1
        INNER JOIN (
          SELECT conversation_id, MAX(created_at) as max_created_at, MAX(id) as max_id
          FROM messages
          GROUP BY conversation_id
        ) m2 ON m1.conversation_id = m2.conversation_id 
            AND m1.created_at = m2.max_created_at
            AND m1.id = m2.max_id
      ) m ON c.id = m.conversation_id
      ORDER BY c.last_message_at DESC
    `);
    return result;
  }

  static async getById(id: number): Promise<ConversationWithClient | null> {
    const db = getDatabase();
    const result = await db.getFirstAsync<ConversationWithClient>(`
      SELECT c.*, cl.name as client_name, cl.email as client_email, cl.phone as client_phone
      FROM conversations c
      INNER JOIN clients cl ON c.client_id = cl.id
      WHERE c.id = ?
    `, [id]);
    return result || null;
  }

  static async getByClientId(clientId: number): Promise<Conversation | null> {
    const db = getDatabase();
    const result = await db.getFirstAsync<Conversation>(
      'SELECT * FROM conversations WHERE client_id = ?',
      [clientId]
    );
    return result || null;
  }

  static async create(input: CreateConversationInput): Promise<Conversation> {
    const db = getDatabase();
    const result = await db.runAsync(
      'INSERT INTO conversations (client_id) VALUES (?)',
      [input.client_id]
    );
    const conversation = await db.getFirstAsync<Conversation>(
      'SELECT * FROM conversations WHERE id = ?',
      [result.lastInsertRowId]
    );
    if (!conversation) {
      throw new Error('Failed to create conversation');
    }
    return conversation;
  }

  static async updateLastMessageAt(id: number, timestamp?: number): Promise<void> {
    const db = getDatabase();
    const ts = timestamp || Math.floor(Date.now() / 1000);
    await db.runAsync(
      'UPDATE conversations SET last_message_at = ? WHERE id = ?',
      [ts, id]
    );
  }

  static async incrementUnreadCount(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      'UPDATE conversations SET unread_count = unread_count + 1 WHERE id = ?',
      [id]
    );
  }

  static async markAsRead(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      'UPDATE conversations SET unread_count = 0 WHERE id = ?',
      [id]
    );
  }

  static async delete(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM conversations WHERE id = ?', [id]);
  }

  static async search(query: string): Promise<ConversationWithClient[]> {
    const db = getDatabase();
    const searchTerm = `%${query}%`;
    const result = await db.getAllAsync<ConversationWithClient>(`
      SELECT c.*, cl.name as client_name, cl.email as client_email, cl.phone as client_phone
      FROM conversations c
      INNER JOIN clients cl ON c.client_id = cl.id
      WHERE cl.name LIKE ? OR cl.email LIKE ?
      ORDER BY c.last_message_at DESC
    `, [searchTerm, searchTerm]);
    return result;
  }

  static async searchWithLastMessage(query: string): Promise<ConversationWithLastMessage[]> {
    const db = getDatabase();
    const searchTerm = `%${query}%`;
    const result = await db.getAllAsync<ConversationWithLastMessage>(`
      SELECT 
        c.*,
        cl.name as client_name,
        cl.email as client_email,
        cl.phone as client_phone,
        m.text as last_message_text,
        m.created_at as last_message_created_at
      FROM conversations c
      INNER JOIN clients cl ON c.client_id = cl.id
      LEFT JOIN (
        SELECT m1.*
        FROM messages m1
        INNER JOIN (
          SELECT conversation_id, MAX(created_at) as max_created_at, MAX(id) as max_id
          FROM messages
          GROUP BY conversation_id
        ) m2 ON m1.conversation_id = m2.conversation_id 
            AND m1.created_at = m2.max_created_at
            AND m1.id = m2.max_id
      ) m ON c.id = m.conversation_id
      WHERE cl.name LIKE ? OR cl.email LIKE ?
      ORDER BY c.last_message_at DESC
    `, [searchTerm, searchTerm]);
    return result;
  }
}

export class MessageRepository {
  static async getByConversation(conversationId: number): Promise<Message[]> {
    const db = getDatabase();
    const result = await db.getAllAsync<Message>(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    );
    return result;
  }

  static async getLastMessage(conversationId: number): Promise<Message | null> {
    const db = getDatabase();
    const result = await db.getFirstAsync<Message>(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1',
      [conversationId]
    );
    return result || null;
  }

  static async create(input: CreateMessageInput): Promise<Message> {
    const db = getDatabase();
    const result = await db.runAsync(
      'INSERT INTO messages (conversation_id, text, is_sent) VALUES (?, ?, ?)',
      [input.conversation_id, input.text, input.is_sent ? 1 : 0]
    );
    
    await ConversationRepository.updateLastMessageAt(input.conversation_id);
    if (!input.is_sent) {
      await ConversationRepository.incrementUnreadCount(input.conversation_id);
    }
    
    const message = await db.getFirstAsync<Message>(
      'SELECT * FROM messages WHERE id = ?',
      [result.lastInsertRowId]
    );
    if (!message) {
      throw new Error('Failed to create message');
    }
    return message;
  }

  static async delete(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM messages WHERE id = ?', [id]);
  }

  static async deleteByConversation(conversationId: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
  }
}
