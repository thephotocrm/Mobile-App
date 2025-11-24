import { getDatabase } from '../index';
import { Client } from './ClientRepository';

export type ProjectStage = 'lead' | 'booked' | 'active' | 'completed';

export interface Project {
  id: number;
  client_id: number;
  title: string;
  stage: ProjectStage;
  event_date?: number;
  notes?: string;
  created_at: number;
  updated_at: number;
}

export interface ProjectWithClient extends Project {
  client_name: string;
  client_email: string;
}

export interface CreateProjectInput {
  client_id: number;
  title: string;
  stage?: ProjectStage;
  event_date?: number;
  notes?: string;
}

export interface UpdateProjectInput {
  title?: string;
  stage?: ProjectStage;
  event_date?: number;
  notes?: string;
}

export class ProjectRepository {
  static async getAll(): Promise<ProjectWithClient[]> {
    const db = getDatabase();
    const result = await db.getAllAsync<ProjectWithClient>(`
      SELECT p.*, c.name as client_name, c.email as client_email
      FROM projects p
      INNER JOIN clients c ON p.client_id = c.id
      ORDER BY p.created_at DESC
    `);
    return result;
  }

  static async getById(id: number): Promise<ProjectWithClient | null> {
    const db = getDatabase();
    const result = await db.getFirstAsync<ProjectWithClient>(`
      SELECT p.*, c.name as client_name, c.email as client_email
      FROM projects p
      INNER JOIN clients c ON p.client_id = c.id
      WHERE p.id = ?
    `, [id]);
    return result || null;
  }

  static async getByStage(stage: ProjectStage): Promise<ProjectWithClient[]> {
    const db = getDatabase();
    const result = await db.getAllAsync<ProjectWithClient>(`
      SELECT p.*, c.name as client_name, c.email as client_email
      FROM projects p
      INNER JOIN clients c ON p.client_id = c.id
      WHERE p.stage = ?
      ORDER BY p.created_at DESC
    `, [stage]);
    return result;
  }

  static async getByClient(clientId: number): Promise<Project[]> {
    const db = getDatabase();
    const result = await db.getAllAsync<Project>(
      'SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC',
      [clientId]
    );
    return result;
  }

  static async create(input: CreateProjectInput): Promise<Project> {
    const db = getDatabase();
    const result = await db.runAsync(
      'INSERT INTO projects (client_id, title, stage, event_date, notes) VALUES (?, ?, ?, ?, ?)',
      [input.client_id, input.title, input.stage || 'lead', input.event_date || null, input.notes || null]
    );
    const project = await db.getFirstAsync<Project>('SELECT * FROM projects WHERE id = ?', [result.lastInsertRowId]);
    if (!project) {
      throw new Error('Failed to create project');
    }
    return project;
  }

  static async update(id: number, input: UpdateProjectInput): Promise<Project> {
    const db = getDatabase();
    const updates: string[] = [];
    const values: any[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      values.push(input.title);
    }
    if (input.stage !== undefined) {
      updates.push('stage = ?');
      values.push(input.stage);
    }
    if (input.event_date !== undefined) {
      updates.push('event_date = ?');
      values.push(input.event_date);
    }
    if (input.notes !== undefined) {
      updates.push('notes = ?');
      values.push(input.notes);
    }

    updates.push('updated_at = ?');
    values.push(Math.floor(Date.now() / 1000));
    values.push(id);

    await db.runAsync(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const project = await db.getFirstAsync<Project>('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) {
      throw new Error('Project not found after update');
    }
    return project;
  }

  static async delete(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM projects WHERE id = ?', [id]);
  }

  static async search(query: string): Promise<ProjectWithClient[]> {
    const db = getDatabase();
    const searchTerm = `%${query}%`;
    const result = await db.getAllAsync<ProjectWithClient>(`
      SELECT p.*, c.name as client_name, c.email as client_email
      FROM projects p
      INNER JOIN clients c ON p.client_id = c.id
      WHERE p.title LIKE ? OR c.name LIKE ?
      ORDER BY p.created_at DESC
    `, [searchTerm, searchTerm]);
    return result;
  }

  static async getStageStats(): Promise<Record<ProjectStage, number>> {
    const db = getDatabase();
    const results = await db.getAllAsync<{ stage: ProjectStage; count: number }>(`
      SELECT stage, COUNT(*) as count
      FROM projects
      GROUP BY stage
    `);
    
    const stats: Record<string, number> = {
      lead: 0,
      booked: 0,
      active: 0,
      completed: 0,
    };

    results.forEach(row => {
      stats[row.stage] = row.count;
    });

    return stats as Record<ProjectStage, number>;
  }
}
