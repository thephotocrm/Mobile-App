import { getDatabase } from '../index';

export interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  created_at: number;
  updated_at: number;
}

export interface CreateClientInput {
  name: string;
  email: string;
  phone?: string;
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  phone?: string;
}

export class ClientRepository {
  static async getAll(): Promise<Client[]> {
    const db = getDatabase();
    const result = await db.getAllAsync<Client>('SELECT * FROM clients ORDER BY created_at DESC');
    return result;
  }

  static async getById(id: number): Promise<Client | null> {
    const db = getDatabase();
    const result = await db.getFirstAsync<Client>('SELECT * FROM clients WHERE id = ?', [id]);
    return result || null;
  }

  static async getByEmail(email: string): Promise<Client | null> {
    const db = getDatabase();
    const result = await db.getFirstAsync<Client>('SELECT * FROM clients WHERE email = ?', [email]);
    return result || null;
  }

  static async create(input: CreateClientInput): Promise<Client> {
    const db = getDatabase();
    const result = await db.runAsync(
      'INSERT INTO clients (name, email, phone) VALUES (?, ?, ?)',
      [input.name, input.email, input.phone || null]
    );
    const client = await this.getById(result.lastInsertRowId);
    if (!client) {
      throw new Error('Failed to create client');
    }
    return client;
  }

  static async update(id: number, input: UpdateClientInput): Promise<Client> {
    const db = getDatabase();
    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.email !== undefined) {
      updates.push('email = ?');
      values.push(input.email);
    }
    if (input.phone !== undefined) {
      updates.push('phone = ?');
      values.push(input.phone);
    }

    updates.push('updated_at = ?');
    values.push(Math.floor(Date.now() / 1000));
    values.push(id);

    await db.runAsync(
      `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const client = await this.getById(id);
    if (!client) {
      throw new Error('Client not found after update');
    }
    return client;
  }

  static async delete(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM clients WHERE id = ?', [id]);
  }

  static async search(query: string): Promise<Client[]> {
    const db = getDatabase();
    const searchTerm = `%${query}%`;
    const result = await db.getAllAsync<Client>(
      'SELECT * FROM clients WHERE name LIKE ? OR email LIKE ? ORDER BY created_at DESC',
      [searchTerm, searchTerm]
    );
    return result;
  }
}
