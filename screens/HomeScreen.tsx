import React from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius, Typography, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";

const MOCK_STATS = {
  todaysMeetings: 0,
  newLeads: 4,
  unreadMessages: 0,
  tasksToday: 0,
  monthlyPayments: "$12,676.03",
  monthName: "November",
};

const MOCK_RECENT_CLIENTS = [
  {
    id: "1",
    name: "Austin Pacholek",
    email: "dwdwdwdwdwdwdw",
    initials: "AP",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    initials: "SJ",
  },
];

export function HomeScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
      ? "Good afternoon"
      : "Good evening";

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        <View style={styles.greetingSection}>
          <ThemedText style={[Typography.h2, { color: theme.text }]}>
            {greeting}, Photographer
          </ThemedText>
          <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: Spacing.xs }]}>            
            Turning sparks into flames, just another day in the life of a
            one-person powerhouse.
          </ThemedText>
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={styles.statColumn}>
              <StatCard
                value={MOCK_STATS.todaysMeetings.toString()}
                label="Today's meetings"
                icon="calendar"
                color="#8B4565"
              />
            </View>
            <View style={styles.statColumn}>
              <StatCard
                value={MOCK_STATS.newLeads.toString()}
                label="New leads"
                icon="users"
                color="#3B82F6"
              />
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statColumn}>
              <StatCard
                value={MOCK_STATS.unreadMessages.toString()}
                label="Unread messages"
                icon="message-circle"
                color="#10B981"
              />
            </View>
            <View style={styles.statColumn}>
              <StatCard
                value={MOCK_STATS.tasksToday.toString()}
                label="Tasks today"
                icon="check-square"
                color="#F59E0B"
              />
            </View>
          </View>
        </View>

        <Card elevation={2} style={styles.paymentsCard}>
          <ThemedText style={[Typography.h2, { color: theme.text }]}>
            {MOCK_STATS.monthlyPayments}
          </ThemedText>
          <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: Spacing.xs }]}>
            {MOCK_STATS.monthName} gross payments
          </ThemedText>
        </Card>

        <View style={styles.section}>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.md, fontWeight: "600" }]}>
            RECENT CLIENTS ({MOCK_RECENT_CLIENTS.length})
          </ThemedText>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.clientsScroll}
          >
            {MOCK_RECENT_CLIENTS.map((client, index) => (
              <Card 
                key={client.id} 
                elevation={1} 
                style={[styles.clientCard, index > 0 && { marginLeft: Spacing.md }]}
              >
                <Avatar name={client.name} size={48} />
                <ThemedText style={[Typography.body, { color: theme.text, fontWeight: "600", marginTop: Spacing.md }]}>
                  {client.name}
                </ThemedText>
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: Spacing.xs }]}>
                  {client.email}
                </ThemedText>
                <Pressable
                  style={({ pressed }) => [
                    styles.viewButton,
                    { borderColor: theme.border, marginTop: Spacing.md },
                    pressed && styles.viewButtonPressed,
                  ]}
                  onPress={() => {
                    console.log("View client:", client.name);
                  }}
                >
                  <ThemedText style={[Typography.bodySmall, { color: theme.text, fontWeight: "600" }]}>
                    View client
                  </ThemedText>
                </Pressable>
              </Card>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <ThemedText style={[Typography.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
            TODAY (0) • {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </ThemedText>
          <ThemedText style={[Typography.bodySmall, styles.emptyText, { color: theme.textSecondary }]}>No events today</ThemedText>
        </View>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  greetingSection: {
    marginBottom: Spacing.xl,
  },
  statsSection: {
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statColumn: {
    flex: 1,
  },
  paymentsCard: {
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: Spacing.lg,
    letterSpacing: 0.5,
  },
  clientsScroll: {
    paddingRight: Spacing.lg,
  },
  clientCard: {
    width: 200,
    alignItems: "flex-start",
  },
  viewButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignSelf: "stretch",
    alignItems: "center",
  },
  viewButtonPressed: {
    opacity: 0.7,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
});
