import React from "react";
import { View, StyleSheet, Pressable, Linking, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { RouteProp, useRoute } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography } from "@/constants/theme";
import { ToolsStackParamList } from "@/navigation/ToolsStackNavigator";

const MOCK_CONTACTS_DATA: Record<
  string,
  {
    id: string;
    name: string;
    email: string;
    phone: string;
    company?: string;
    role: string;
    notes?: string;
    projects: Array<{
      id: string;
      title: string;
      stage: string;
      stageColor: string;
      eventDate: string;
    }>;
  }
> = {
  "1": {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    phone: "+1 (555) 123-4567",
    role: "Bride",
    notes: "Primary contact for the wedding",
    projects: [
      {
        id: "1",
        title: "Sarah & Mike Wedding",
        stage: "Booked",
        stageColor: "#3B82F6",
        eventDate: "June 15, 2025",
      },
    ],
  },
  "2": {
    id: "2",
    name: "Mike Chen",
    email: "mike.chen@example.com",
    phone: "+1 (555) 234-5678",
    role: "Groom",
    projects: [
      {
        id: "1",
        title: "Sarah & Mike Wedding",
        stage: "Booked",
        stageColor: "#3B82F6",
        eventDate: "June 15, 2025",
      },
    ],
  },
  "3": {
    id: "3",
    name: "Jennifer Mills",
    email: "jennifer@weddingmagic.com",
    phone: "+1 (555) 345-6789",
    company: "Wedding Magic Planning",
    role: "Wedding Planner",
    notes: "Preferred wedding planner - excellent at coordination",
    projects: [
      {
        id: "1",
        title: "Sarah & Mike Wedding",
        stage: "Booked",
        stageColor: "#3B82F6",
        eventDate: "June 15, 2025",
      },
      {
        id: "2",
        title: "Emily & David Wedding",
        stage: "Active",
        stageColor: "#22C55E",
        eventDate: "August 20, 2025",
      },
      {
        id: "3",
        title: "Lisa & James Wedding",
        stage: "Lead",
        stageColor: "#F59E0B",
        eventDate: "October 10, 2025",
      },
    ],
  },
  "4": {
    id: "4",
    name: "Robert Johnson",
    email: "robert.j@example.com",
    phone: "+1 (555) 456-7890",
    role: "Father of Bride",
    projects: [
      {
        id: "1",
        title: "Sarah & Mike Wedding",
        stage: "Booked",
        stageColor: "#3B82F6",
        eventDate: "June 15, 2025",
      },
    ],
  },
  "5": {
    id: "5",
    name: "Emily Davis",
    email: "emily.davis@example.com",
    phone: "+1 (555) 567-8901",
    role: "Bride",
    projects: [
      {
        id: "2",
        title: "Emily & David Wedding",
        stage: "Active",
        stageColor: "#22C55E",
        eventDate: "August 20, 2025",
      },
      {
        id: "4",
        title: "Emily & Tom Engagement",
        stage: "Completed",
        stageColor: "#9CA3AF",
        eventDate: "March 15, 2024",
      },
    ],
  },
  "6": {
    id: "6",
    name: "David Martinez",
    email: "david.m@example.com",
    phone: "+1 (555) 678-9012",
    role: "Groom",
    projects: [
      {
        id: "2",
        title: "Emily & David Wedding",
        stage: "Active",
        stageColor: "#22C55E",
        eventDate: "August 20, 2025",
      },
    ],
  },
  "7": {
    id: "7",
    name: "Lisa Anderson",
    email: "lisa.anderson@example.com",
    phone: "+1 (555) 789-0123",
    role: "Bride",
    projects: [
      {
        id: "3",
        title: "Lisa & James Wedding",
        stage: "Lead",
        stageColor: "#F59E0B",
        eventDate: "October 10, 2025",
      },
      {
        id: "5",
        title: "Lisa Birthday Session",
        stage: "Completed",
        stageColor: "#9CA3AF",
        eventDate: "May 5, 2024",
      },
    ],
  },
  "8": {
    id: "8",
    name: "James Wilson",
    email: "james.w@example.com",
    phone: "+1 (555) 890-1234",
    role: "Groom",
    projects: [
      {
        id: "3",
        title: "Lisa & James Wedding",
        stage: "Lead",
        stageColor: "#F59E0B",
        eventDate: "October 10, 2025",
      },
    ],
  },
};

type ContactDetailScreenRouteProp = RouteProp<
  ToolsStackParamList,
  "ContactDetail"
>;

export default function ContactDetailScreen() {
  const { theme } = useTheme();
  const route = useRoute<ContactDetailScreenRouteProp>();
  const contactId = route.params?.contactId || "1";
  const contact = MOCK_CONTACTS_DATA[contactId] || MOCK_CONTACTS_DATA["1"];

  const handleCall = () => {
    Linking.openURL(`tel:${contact.phone}`);
  };

  const handleText = () => {
    Linking.openURL(`sms:${contact.phone}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${contact.email}`);
  };

  return (
    <ScreenScrollView>
      <View
        style={[styles.hero, { backgroundColor: theme.backgroundSecondary }]}
      >
        <Avatar name={contact.name} size={80} />
        <ThemedText
          style={[
            styles.heroName,
            {
              fontSize: Typography.h2.fontSize,
              fontWeight: Typography.h2.fontWeight,
            },
          ]}
        >
          {contact.name}
        </ThemedText>
        <ThemedText style={[styles.heroRole, { color: theme.textSecondary }]}>
          {contact.role}
        </ThemedText>
        {contact.company ? (
          <ThemedText
            style={[styles.heroCompany, { color: theme.textSecondary }]}
          >
            {contact.company}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.actionsContainer}>
        <Pressable
          onPress={handleCall}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <View
            style={[
              styles.actionIcon,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="phone" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Call</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleText}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <View
            style={[
              styles.actionIcon,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="message-square" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Text</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleEmail}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <View
            style={[
              styles.actionIcon,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="mail" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Email</ThemedText>
        </Pressable>
      </View>

      <View style={styles.content}>
        <ThemedText
          style={[
            styles.sectionTitle,
            {
              fontSize: Typography.h3.fontSize,
              fontWeight: Typography.h3.fontWeight,
            },
          ]}
        >
          Contact Information
        </ThemedText>

        <View
          style={[
            styles.infoCard,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          {contact.email ? (
            <View style={styles.infoRow}>
              <Feather name="mail" size={18} color={theme.primary} />
              <View style={styles.infoContent}>
                <ThemedText
                  style={[styles.infoLabel, { color: theme.textSecondary }]}
                >
                  Email
                </ThemedText>
                <ThemedText style={styles.infoValue}>
                  {contact.email}
                </ThemedText>
              </View>
            </View>
          ) : null}

          {contact.phone ? (
            <View
              style={[
                styles.infoRow,
                styles.infoRowBorder,
                { borderTopColor: theme.border },
              ]}
            >
              <Feather name="phone" size={18} color={theme.primary} />
              <View style={styles.infoContent}>
                <ThemedText
                  style={[styles.infoLabel, { color: theme.textSecondary }]}
                >
                  Phone
                </ThemedText>
                <ThemedText style={styles.infoValue}>
                  {contact.phone}
                </ThemedText>
              </View>
            </View>
          ) : null}

          {contact.company ? (
            <View
              style={[
                styles.infoRow,
                styles.infoRowBorder,
                { borderTopColor: theme.border },
              ]}
            >
              <Feather name="briefcase" size={18} color={theme.primary} />
              <View style={styles.infoContent}>
                <ThemedText
                  style={[styles.infoLabel, { color: theme.textSecondary }]}
                >
                  Company
                </ThemedText>
                <ThemedText style={styles.infoValue}>
                  {contact.company}
                </ThemedText>
              </View>
            </View>
          ) : null}

          {contact.role ? (
            <View
              style={[
                styles.infoRow,
                styles.infoRowBorder,
                { borderTopColor: theme.border },
              ]}
            >
              <Feather name="user" size={18} color={theme.primary} />
              <View style={styles.infoContent}>
                <ThemedText
                  style={[styles.infoLabel, { color: theme.textSecondary }]}
                >
                  Role
                </ThemedText>
                <ThemedText style={styles.infoValue}>{contact.role}</ThemedText>
              </View>
            </View>
          ) : null}
        </View>

        {contact.notes ? (
          <>
            <ThemedText
              style={[
                styles.sectionTitle,
                {
                  fontSize: Typography.h3.fontSize,
                  fontWeight: Typography.h3.fontWeight,
                },
              ]}
            >
              Notes
            </ThemedText>
            <View
              style={[
                styles.notesCard,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <ThemedText style={[styles.notesText, { color: theme.text }]}>
                {contact.notes}
              </ThemedText>
            </View>
          </>
        ) : null}

        <ThemedText
          style={[
            styles.sectionTitle,
            {
              fontSize: Typography.h3.fontSize,
              fontWeight: Typography.h3.fontWeight,
            },
          ]}
        >
          Projects ({contact.projects.length})
        </ThemedText>

        {contact.projects.map((project) => (
          <Pressable
            key={project.id}
            style={({ pressed }) => [
              styles.projectCard,
              { backgroundColor: theme.backgroundSecondary },
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={styles.projectHeader}>
              <ThemedText
                style={[
                  styles.projectTitle,
                  { fontSize: Typography.body.fontSize, fontWeight: "600" },
                ]}
              >
                {project.title}
              </ThemedText>
              <Badge
                label={project.stage}
                backgroundColor={project.stageColor}
              />
            </View>
            <View style={styles.projectMeta}>
              <Feather name="calendar" size={14} color={theme.textSecondary} />
              <ThemedText
                style={[styles.projectDate, { color: theme.textSecondary }]}
              >
                {project.eventDate}
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: Spacing.xl,
    alignItems: "center",
  },
  heroName: {
    marginTop: Spacing.md,
    textAlign: "center",
  },
  heroRole: {
    marginTop: Spacing.xs,
    fontSize: 16,
    textAlign: "center",
  },
  heroCompany: {
    marginTop: Spacing.xs,
    fontSize: 14,
    textAlign: "center",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: Spacing.lg,
  },
  actionButton: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  content: {
    paddingHorizontal: 10,
    paddingBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  infoCard: {
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  infoRowBorder: {
    borderTopWidth: 1,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  notesCard: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.lg,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  projectCard: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  projectTitle: {
    flex: 1,
  },
  projectMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  projectDate: {
    fontSize: 12,
  },
});
