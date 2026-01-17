import { ClientRepository } from "./repositories/ClientRepository";
import { ProjectRepository } from "./repositories/ProjectRepository";
import {
  ConversationRepository,
  MessageRepository,
} from "./repositories/ConversationRepository";
import { BookingRepository } from "./repositories/BookingRepository";

export async function seedDatabase() {
  try {
    const existingClients = await ClientRepository.getAll();
    if (existingClients.length > 0) {
      return;
    }

    const client1 = await ClientRepository.create({
      name: "Sarah Johnson",
      email: "sarah.johnson@example.com",
      phone: "+1 (555) 123-4567",
    });

    const client2 = await ClientRepository.create({
      name: "Emily Davis",
      email: "emily.davis@example.com",
      phone: "+1 (555) 234-5678",
    });

    const client3 = await ClientRepository.create({
      name: "Rachel Martinez",
      email: "rachel.martinez@example.com",
      phone: "+1 (555) 345-6789",
    });

    const client4 = await ClientRepository.create({
      name: "Jessica Wilson",
      email: "jessica.wilson@example.com",
      phone: "+1 (555) 456-7890",
    });

    const client5 = await ClientRepository.create({
      name: "Amanda Brown",
      email: "amanda.brown@example.com",
      phone: "+1 (555) 567-8901",
    });

    await ProjectRepository.create({
      client_id: client1.id,
      title: "Sarah & Mike Wedding",
      stage: "booked",
      event_date: new Date("2025-06-15").getTime() / 1000,
      notes: "Initial consultation completed - discussed venue and timeline",
    });

    await ProjectRepository.create({
      client_id: client2.id,
      title: "Emily & James Engagement",
      stage: "active",
      event_date: new Date("2025-03-22").getTime() / 1000,
      notes: "Engagement shoot scheduled for next month",
    });

    await ProjectRepository.create({
      client_id: client3.id,
      title: "Rachel & Tom Wedding",
      stage: "lead",
      event_date: new Date("2025-08-10").getTime() / 1000,
    });

    await ProjectRepository.create({
      client_id: client4.id,
      title: "Jessica & David Ceremony",
      stage: "booked",
      event_date: new Date("2025-05-05").getTime() / 1000,
    });

    await ProjectRepository.create({
      client_id: client5.id,
      title: "Amanda & Chris Wedding",
      stage: "completed",
      event_date: new Date("2024-11-12").getTime() / 1000,
    });

    const conv1 = await ConversationRepository.create({
      client_id: client1.id,
    });
    await MessageRepository.create({
      conversation_id: conv1.id,
      text: "Hi! Looking forward to discussing the wedding details.",
      is_sent: false,
    });
    await MessageRepository.create({
      conversation_id: conv1.id,
      text: "Me too! Let's schedule a call this week.",
      is_sent: true,
    });

    const conv2 = await ConversationRepository.create({
      client_id: client2.id,
    });
    await MessageRepository.create({
      conversation_id: conv2.id,
      text: "Can we reschedule the engagement shoot?",
      is_sent: false,
    });
    await MessageRepository.create({
      conversation_id: conv2.id,
      text: "Of course! What dates work best for you?",
      is_sent: true,
    });
    await MessageRepository.create({
      conversation_id: conv2.id,
      text: "How about next Saturday afternoon?",
      is_sent: false,
    });

    const conv3 = await ConversationRepository.create({
      client_id: client3.id,
    });
    await MessageRepository.create({
      conversation_id: conv3.id,
      text: "I'd love to see your portfolio!",
      is_sent: false,
    });

    const conv4 = await ConversationRepository.create({
      client_id: client4.id,
    });
    await MessageRepository.create({
      conversation_id: conv4.id,
      text: "Thank you for the beautiful photos!",
      is_sent: false,
    });
    await MessageRepository.create({
      conversation_id: conv4.id,
      text: "You're so welcome! I loved capturing your special day.",
      is_sent: true,
    });

    await BookingRepository.create({
      client_id: client1.id,
      event_title: "Sarah & Mike Wedding Shoot",
      event_date: Math.floor(new Date("2025-06-15T10:00:00").getTime() / 1000),
      start_time: "10:00 AM",
      end_time: "6:00 PM",
      location: "Sunset Gardens, Los Angeles",
      notes: "Outdoor ceremony, bring backup equipment",
    });

    await BookingRepository.create({
      client_id: client2.id,
      event_title: "Emily & James Engagement Session",
      event_date: Math.floor(new Date("2025-03-22T14:00:00").getTime() / 1000),
      start_time: "2:00 PM",
      end_time: "4:00 PM",
      location: "Griffith Observatory",
    });

    await BookingRepository.create({
      client_id: client4.id,
      event_title: "Jessica & David Wedding",
      event_date: Math.floor(new Date("2025-05-05T11:00:00").getTime() / 1000),
      start_time: "11:00 AM",
      end_time: "7:00 PM",
      location: "The Grand Ballroom",
      notes: "Church ceremony followed by reception",
    });

    await BookingRepository.create({
      client_id: client3.id,
      event_title: "Rachel & Tom Consultation",
      event_date: Math.floor(new Date("2025-02-10T15:00:00").getTime() / 1000),
      start_time: "3:00 PM",
      end_time: "4:00 PM",
      location: "Coffee Shop Downtown",
    });

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
