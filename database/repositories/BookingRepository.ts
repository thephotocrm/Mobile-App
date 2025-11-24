import { getDatabase } from '../index';
import { Client } from './ClientRepository';

export interface Booking {
  id: number;
  client_id: number;
  event_title: string;
  event_date: number;
  start_time: string;
  end_time: string;
  location?: string;
  notes?: string;
  created_at: number;
  updated_at: number;
}

export interface BookingWithClient extends Booking {
  client_name: string;
  client_email: string;
  client_phone?: string;
}

export interface CreateBookingInput {
  client_id: number;
  event_title: string;
  event_date: number;
  start_time: string;
  end_time: string;
  location?: string;
  notes?: string;
}

export interface UpdateBookingInput {
  event_title?: string;
  event_date?: number;
  start_time?: string;
  end_time?: string;
  location?: string;
  notes?: string;
}

export class BookingRepository {
  static async getAll(): Promise<BookingWithClient[]> {
    const db = getDatabase();
    const result = await db.getAllAsync<BookingWithClient>(`
      SELECT b.*, c.name as client_name, c.email as client_email, c.phone as client_phone
      FROM bookings b
      INNER JOIN clients c ON b.client_id = c.id
      ORDER BY b.event_date ASC
    `);
    return result;
  }

  static async getById(id: number): Promise<BookingWithClient | null> {
    const db = getDatabase();
    const result = await db.getFirstAsync<BookingWithClient>(`
      SELECT b.*, c.name as client_name, c.email as client_email, c.phone as client_phone
      FROM bookings b
      INNER JOIN clients c ON b.client_id = c.id
      WHERE b.id = ?
    `, [id]);
    return result || null;
  }

  static async getByClient(clientId: number): Promise<Booking[]> {
    const db = getDatabase();
    const result = await db.getAllAsync<Booking>(
      'SELECT * FROM bookings WHERE client_id = ? ORDER BY event_date ASC',
      [clientId]
    );
    return result;
  }

  static async getByDateRange(startDate: number, endDate: number): Promise<BookingWithClient[]> {
    const db = getDatabase();
    const result = await db.getAllAsync<BookingWithClient>(`
      SELECT b.*, c.name as client_name, c.email as client_email, c.phone as client_phone
      FROM bookings b
      INNER JOIN clients c ON b.client_id = c.id
      WHERE b.event_date >= ? AND b.event_date <= ?
      ORDER BY b.event_date ASC
    `, [startDate, endDate]);
    return result;
  }

  static async getUpcoming(limit?: number): Promise<BookingWithClient[]> {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);
    const query = `
      SELECT b.*, c.name as client_name, c.email as client_email, c.phone as client_phone
      FROM bookings b
      INNER JOIN clients c ON b.client_id = c.id
      WHERE b.event_date >= ?
      ORDER BY b.event_date ASC
      ${limit ? `LIMIT ${limit}` : ''}
    `;
    const result = await db.getAllAsync<BookingWithClient>(query, [now]);
    return result;
  }

  static async create(input: CreateBookingInput): Promise<Booking> {
    const db = getDatabase();
    const result = await db.runAsync(
      'INSERT INTO bookings (client_id, event_title, event_date, start_time, end_time, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [input.client_id, input.event_title, input.event_date, input.start_time, input.end_time, input.location || null, input.notes || null]
    );
    const booking = await db.getFirstAsync<Booking>('SELECT * FROM bookings WHERE id = ?', [result.lastInsertRowId]);
    if (!booking) {
      throw new Error('Failed to create booking');
    }
    return booking;
  }

  static async update(id: number, input: UpdateBookingInput): Promise<Booking> {
    const db = getDatabase();
    const updates: string[] = [];
    const values: any[] = [];

    if (input.event_title !== undefined) {
      updates.push('event_title = ?');
      values.push(input.event_title);
    }
    if (input.event_date !== undefined) {
      updates.push('event_date = ?');
      values.push(input.event_date);
    }
    if (input.start_time !== undefined) {
      updates.push('start_time = ?');
      values.push(input.start_time);
    }
    if (input.end_time !== undefined) {
      updates.push('end_time = ?');
      values.push(input.end_time);
    }
    if (input.location !== undefined) {
      updates.push('location = ?');
      values.push(input.location);
    }
    if (input.notes !== undefined) {
      updates.push('notes = ?');
      values.push(input.notes);
    }

    updates.push('updated_at = ?');
    values.push(Math.floor(Date.now() / 1000));
    values.push(id);

    await db.runAsync(
      `UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const booking = await db.getFirstAsync<Booking>('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!booking) {
      throw new Error('Booking not found after update');
    }
    return booking;
  }

  static async delete(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM bookings WHERE id = ?', [id]);
  }

  static async search(query: string): Promise<BookingWithClient[]> {
    const db = getDatabase();
    const searchTerm = `%${query}%`;
    const result = await db.getAllAsync<BookingWithClient>(`
      SELECT b.*, c.name as client_name, c.email as client_email, c.phone as client_phone
      FROM bookings b
      INNER JOIN clients c ON b.client_id = c.id
      WHERE b.event_title LIKE ? OR c.name LIKE ? OR b.location LIKE ?
      ORDER BY b.event_date ASC
    `, [searchTerm, searchTerm, searchTerm]);
    return result;
  }
}
