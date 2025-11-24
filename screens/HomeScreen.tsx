import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { StatCard } from "@/components/StatCard";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
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
        <View style={[styles.greetingCard, { backgroundColor: theme.backgroundRoot }]}>
          <ThemedText style={[Typography.h2, styles.greeting]}>
            {greeting}, Photographer
          </ThemedText>
          <ThemedText style={[Typography.bodySmall, styles.tagline]}>            
            Turning sparks into flames, just another day in the life of a
            one-person powerhouse.
          </ThemedText>

          <View style={styles.statsGrid}>
            <StatCard
              value={MOCK_STATS.todaysMeetings.toString()}
              label="Today's meetings"
            />
            <StatCard
              value={MOCK_STATS.newLeads.toString()}
              label="New leads"
            />
            <StatCard
              value={MOCK_STATS.unreadMessages.toString()}
              label="Unread messages"
            />
            <StatCard
              value={MOCK_STATS.tasksToday.toString()}
              label="Tasks today"
            />
          </View>

          <View style={[styles.paymentsCard, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={[Typography.h2, { color: theme.text }]}>
              {MOCK_STATS.monthlyPayments}
            </ThemedText>
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {MOCK_STATS.monthName} gross payments
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[Typography.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
            RECENT CLIENTS ({MOCK_RECENT_CLIENTS.length})
          </ThemedText>

          {MOCK_RECENT_CLIENTS.map((client) => (
            <View key={client.id} style={[styles.clientCard, { backgroundColor: theme.backgroundRoot }]}>
              <Avatar name={client.name} size={48} />
              <View style={styles.clientInfo}>
                <ThemedText style={[Typography.body, { color: theme.text, fontWeight: "600" }]}>
                  {client.name}
                </ThemedText>
                <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                  {client.email}
                </ThemedText>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.viewButton,
                  { borderColor: theme.border },
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
            </View>
          ))}
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
    padding: Spacing.lg,
  },
  greetingCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    alignItems: "center",
  },
  greeting: {
    marginBottom: Spacing.xs,
  },
  tagline: {
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: Spacing.lg,
  },
  paymentsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: "100%",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: Spacing.lg,
    letterSpacing: 0.5,
  },
  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  clientInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  viewButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  viewButtonPressed: {
    opacity: 0.6,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
});
