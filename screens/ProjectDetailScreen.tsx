import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Linking, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography } from '@/constants/theme';

const MOCK_PROJECT = {
  title: 'Sarah & Mike Wedding',
  clientName: 'Sarah Johnson',
  clientEmail: 'sarah.johnson@example.com',
  clientPhone: '+1 (555) 123-4567',
  eventDate: 'June 15, 2025',
  stageName: 'Booked',
  stageColor: '#3B82F6',
  location: 'The Grand Ballroom, San Francisco',
  package: 'Premium Wedding Package',
  totalAmount: 4500,
  notes: [
    { id: '1', text: 'Initial consultation completed - discussed venue and timeline', date: 'Nov 10, 2024', type: 'note' },
    { id: '2', text: 'Contract signed and deposit received', date: 'Nov 15, 2024', type: 'milestone' },
    { id: '3', text: 'Scheduled engagement shoot for Dec 5th', date: 'Nov 20, 2024', type: 'note' },
  ],
  payments: [
    { id: '1', amount: 1500, date: 'Nov 15, 2024', description: 'Deposit payment', status: 'Paid' },
    { id: '2', amount: 1500, date: 'Jan 15, 2025', description: 'Second installment', status: 'Pending' },
    { id: '3', amount: 1500, date: 'May 15, 2025', description: 'Final payment', status: 'Pending' },
  ],
};

type TabType = 'activity' | 'payments' | 'files' | 'details';

export default function ProjectDetailScreen() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('activity');

  const handleCall = () => {
    Linking.openURL(`tel:${MOCK_PROJECT.clientPhone}`);
  };

  const handleText = () => {
    Linking.openURL(`sms:${MOCK_PROJECT.clientPhone}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${MOCK_PROJECT.clientEmail}`);
  };

  const handleSendLink = () => {
    Alert.alert('Magic Link Sent', `A secure login link has been sent to ${MOCK_PROJECT.clientEmail}`);
  };

  const totalPaid = MOCK_PROJECT.payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = MOCK_PROJECT.payments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'activity':
        return (
          <View style={styles.tabContent}>
            <ThemedText style={[styles.sectionTitle, { fontSize: Typography.h3.fontSize, fontWeight: Typography.h3.fontWeight }]}>
              Activity Timeline
            </ThemedText>
            {MOCK_PROJECT.notes.map((note) => (
              <View key={note.id} style={[styles.activityCard, { backgroundColor: theme.backgroundSecondary }]}>
                <View style={styles.activityHeader}>
                  <View style={[styles.activityIcon, { backgroundColor: note.type === 'milestone' ? theme.primary : theme.border }]}>
                    <Feather 
                      name={note.type === 'milestone' ? 'check' : 'edit-3'} 
                      size={14} 
                      color={note.type === 'milestone' ? '#fff' : theme.textSecondary} 
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <ThemedText style={styles.activityText}>{note.text}</ThemedText>
                    <ThemedText style={[styles.activityDate, { color: theme.textSecondary }]}>
                      {note.date}
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        );

      case 'payments':
        return (
          <View style={styles.tabContent}>
            <ThemedText style={[styles.sectionTitle, { fontSize: Typography.h3.fontSize, fontWeight: Typography.h3.fontWeight }]}>
              Payment Schedule
            </ThemedText>
            
            <View style={[styles.paymentSummary, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.paymentSummaryRow}>
                <ThemedText style={[styles.paymentSummaryLabel, { color: theme.textSecondary }]}>Total Contract</ThemedText>
                <ThemedText style={styles.paymentSummaryValue}>${MOCK_PROJECT.totalAmount.toLocaleString()}</ThemedText>
              </View>
              <View style={styles.paymentSummaryRow}>
                <ThemedText style={[styles.paymentSummaryLabel, { color: theme.success }]}>Paid</ThemedText>
                <ThemedText style={[styles.paymentSummaryValue, { color: theme.success }]}>${totalPaid.toLocaleString()}</ThemedText>
              </View>
              <View style={styles.paymentSummaryRow}>
                <ThemedText style={[styles.paymentSummaryLabel, { color: theme.textSecondary }]}>Pending</ThemedText>
                <ThemedText style={[styles.paymentSummaryValue, { color: theme.textSecondary }]}>${totalPending.toLocaleString()}</ThemedText>
              </View>
            </View>

            {MOCK_PROJECT.payments.map((payment) => (
              <View key={payment.id} style={[styles.paymentCard, { backgroundColor: theme.backgroundSecondary }]}>
                <View style={styles.paymentHeader}>
                  <ThemedText style={styles.paymentDescription}>{payment.description}</ThemedText>
                  <Badge 
                    label={payment.status} 
                    backgroundColor={payment.status === 'Paid' ? theme.success : '#B45309'}
                    color='#FFFFFF'
                  />
                </View>
                <View style={styles.paymentFooter}>
                  <ThemedText style={[styles.paymentDate, { color: theme.textSecondary }]}>
                    {payment.date}
                  </ThemedText>
                  <ThemedText style={[styles.paymentAmount, { color: payment.status === 'Paid' ? theme.success : theme.text }]}>
                    ${payment.amount.toLocaleString()}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        );

      case 'files':
        return (
          <View style={styles.tabContent}>
            <ThemedText style={[styles.sectionTitle, { fontSize: Typography.h3.fontSize, fontWeight: Typography.h3.fontWeight }]}>
              Files
            </ThemedText>
            <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="folder" size={48} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                No files uploaded yet
              </ThemedText>
              <ThemedText style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
                Share contracts, invoices, and photos with your client
              </ThemedText>
            </View>
          </View>
        );

      case 'details':
        return (
          <View style={styles.tabContent}>
            <ThemedText style={[styles.sectionTitle, { fontSize: Typography.h3.fontSize, fontWeight: Typography.h3.fontWeight }]}>
              Project Details
            </ThemedText>
            
            <View style={[styles.detailCard, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.detailRow}>
                <Feather name="calendar" size={18} color={theme.primary} />
                <View style={styles.detailContent}>
                  <ThemedText style={[styles.detailLabel, { color: theme.textSecondary }]}>Event Date</ThemedText>
                  <ThemedText style={styles.detailValue}>{MOCK_PROJECT.eventDate}</ThemedText>
                </View>
              </View>

              <View style={[styles.detailRow, styles.detailRowBorder, { borderTopColor: theme.border }]}>
                <Feather name="map-pin" size={18} color={theme.primary} />
                <View style={styles.detailContent}>
                  <ThemedText style={[styles.detailLabel, { color: theme.textSecondary }]}>Location</ThemedText>
                  <ThemedText style={styles.detailValue}>{MOCK_PROJECT.location}</ThemedText>
                </View>
              </View>

              <View style={[styles.detailRow, styles.detailRowBorder, { borderTopColor: theme.border }]}>
                <Feather name="package" size={18} color={theme.primary} />
                <View style={styles.detailContent}>
                  <ThemedText style={[styles.detailLabel, { color: theme.textSecondary }]}>Package</ThemedText>
                  <ThemedText style={styles.detailValue}>{MOCK_PROJECT.package}</ThemedText>
                </View>
              </View>

              <View style={[styles.detailRow, styles.detailRowBorder, { borderTopColor: theme.border }]}>
                <Feather name="user" size={18} color={theme.primary} />
                <View style={styles.detailContent}>
                  <ThemedText style={[styles.detailLabel, { color: theme.textSecondary }]}>Client</ThemedText>
                  <ThemedText style={styles.detailValue}>{MOCK_PROJECT.clientName}</ThemedText>
                  <ThemedText style={[styles.detailSubvalue, { color: theme.textSecondary }]}>
                    {MOCK_PROJECT.clientEmail}
                  </ThemedText>
                  <ThemedText style={[styles.detailSubvalue, { color: theme.textSecondary }]}>
                    {MOCK_PROJECT.clientPhone}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ScreenScrollView>
      <View style={[styles.hero, { backgroundColor: theme.backgroundSecondary }]}>
        <Avatar name={MOCK_PROJECT.clientName} size={64} />
        <ThemedText style={[styles.heroTitle, { fontSize: Typography.h2.fontSize, fontWeight: Typography.h2.fontWeight }]}>
          {MOCK_PROJECT.title}
        </ThemedText>
        <ThemedText style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
          {MOCK_PROJECT.clientName}
        </ThemedText>
        <View style={styles.heroBadge}>
          <Badge label={MOCK_PROJECT.stageName} backgroundColor={MOCK_PROJECT.stageColor} />
        </View>
        <ThemedText style={[styles.heroDate, { color: theme.textSecondary }]}>
          Event Date: {MOCK_PROJECT.eventDate}
        </ThemedText>
      </View>

      <View style={styles.actionsContainer}>
        <Pressable
          onPress={handleCall}
          style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.actionIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="phone" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Call</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleText}
          style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.actionIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="message-square" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Text</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleEmail}
          style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.actionIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="mail" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Email</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleSendLink}
          style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.actionIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="link" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Send Link</ThemedText>
        </Pressable>
      </View>

      <View style={[styles.tabBar, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => setActiveTab('activity')}
          style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
        >
          <ThemedText style={[styles.tabText, activeTab === 'activity' && { color: theme.primary, fontWeight: '600' }]}>
            Activity
          </ThemedText>
          {activeTab === 'activity' && <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />}
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('payments')}
          style={[styles.tab, activeTab === 'payments' && styles.tabActive]}
        >
          <ThemedText style={[styles.tabText, activeTab === 'payments' && { color: theme.primary, fontWeight: '600' }]}>
            Payments
          </ThemedText>
          {activeTab === 'payments' && <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />}
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('files')}
          style={[styles.tab, activeTab === 'files' && styles.tabActive]}
        >
          <ThemedText style={[styles.tabText, activeTab === 'files' && { color: theme.primary, fontWeight: '600' }]}>
            Files
          </ThemedText>
          {activeTab === 'files' && <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />}
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('details')}
          style={[styles.tab, activeTab === 'details' && styles.tabActive]}
        >
          <ThemedText style={[styles.tabText, activeTab === 'details' && { color: theme.primary, fontWeight: '600' }]}>
            Details
          </ThemedText>
          {activeTab === 'details' && <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />}
        </Pressable>
      </View>

      {renderTabContent()}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  heroTitle: {
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  heroSubtitle: {
    marginTop: Spacing.xs,
    fontSize: 16,
  },
  heroBadge: {
    marginTop: Spacing.md,
  },
  heroDate: {
    marginTop: Spacing.sm,
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Spacing.lg,
  },
  actionButton: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  tabContent: {
    padding: 10,
    paddingTop: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  activityCard: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  activityHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  activityDate: {
    fontSize: 12,
  },
  paymentSummary: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentSummaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  paymentSummaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentCard: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  paymentDescription: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentDate: {
    fontSize: 12,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: 8,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  detailCard: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  detailRowBorder: {
    borderTopWidth: 1,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailSubvalue: {
    fontSize: 14,
    marginTop: 2,
  },
});
