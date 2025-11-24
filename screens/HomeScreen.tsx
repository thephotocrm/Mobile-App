import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { StatCard } from "@/components/StatCard";
import { Spacing, BorderRadius } from "@/constants/theme";
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
          <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
            <Feather name="camera" size={40} color={theme.primary} />
          </View>
          <ThemedText style={styles.greeting}>
            {greeting}, Photographer
          </ThemedText>
          <ThemedText style={styles.tagline}>
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
            <ThemedText style={[styles.paymentsValue, { color: theme.text }]}>
              {MOCK_STATS.monthlyPayments}
            </ThemedText>
            <ThemedText style={[styles.paymentsLabel, { color: theme.textSecondary }]}>
              {MOCK_STATS.monthName} gross payments
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            RECENT CLIENTS ({MOCK_RECENT_CLIENTS.length})
          </ThemedText>

          {MOCK_RECENT_CLIENTS.map((client) => (
            <View key={client.id} style={[styles.clientCard, { backgroundColor: theme.backgroundRoot }]}>
              <Avatar name={client.name} size={48} />
              <View style={styles.clientInfo}>
                <ThemedText style={[styles.clientName, { color: theme.text }]}>
                  {client.name}
                </ThemedText>
                <ThemedText style={[styles.clientEmail, { color: theme.textSecondary }]}>
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
                <ThemedText style={[styles.viewButtonText, { color: theme.text }]}>
                  View client
                </ThemedText>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            TODAY (0) • {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </ThemedText>
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>No events today</ThemedText>
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: 14,
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
  paymentsValue: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  paymentsLabel: {
    fontSize: 14,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
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
  clientName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 14,
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
  viewButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
});
