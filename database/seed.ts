import { ClientRepository } from './repositories/ClientRepository';
import { ProjectRepository } from './repositories/ProjectRepository';

export async function seedDatabase() {
  try {
    const existingClients = await ClientRepository.getAll();
    if (existingClients.length > 0) {
      return;
    }

    const client1 = await ClientRepository.create({
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      phone: '+1 (555) 123-4567',
    });

    const client2 = await ClientRepository.create({
      name: 'Emily Davis',
      email: 'emily.davis@example.com',
      phone: '+1 (555) 234-5678',
    });

    const client3 = await ClientRepository.create({
      name: 'Rachel Martinez',
      email: 'rachel.martinez@example.com',
      phone: '+1 (555) 345-6789',
    });

    const client4 = await ClientRepository.create({
      name: 'Jessica Wilson',
      email: 'jessica.wilson@example.com',
      phone: '+1 (555) 456-7890',
    });

    const client5 = await ClientRepository.create({
      name: 'Amanda Brown',
      email: 'amanda.brown@example.com',
      phone: '+1 (555) 567-8901',
    });

    await ProjectRepository.create({
      client_id: client1.id,
      title: 'Sarah & Mike Wedding',
      stage: 'booked',
      event_date: new Date('2025-06-15').getTime() / 1000,
      notes: 'Initial consultation completed - discussed venue and timeline',
    });

    await ProjectRepository.create({
      client_id: client2.id,
      title: 'Emily & James Engagement',
      stage: 'active',
      event_date: new Date('2025-03-22').getTime() / 1000,
      notes: 'Engagement shoot scheduled for next month',
    });

    await ProjectRepository.create({
      client_id: client3.id,
      title: 'Rachel & Tom Wedding',
      stage: 'lead',
      event_date: new Date('2025-08-10').getTime() / 1000,
    });

    await ProjectRepository.create({
      client_id: client4.id,
      title: 'Jessica & David Ceremony',
      stage: 'booked',
      event_date: new Date('2025-05-05').getTime() / 1000,
    });

    await ProjectRepository.create({
      client_id: client5.id,
      title: 'Amanda & Chris Wedding',
      stage: 'completed',
      event_date: new Date('2024-11-12').getTime() / 1000,
    });

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
