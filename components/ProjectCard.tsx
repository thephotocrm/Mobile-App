import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';

interface ProjectCardProps {
  projectTitle: string;
  clientName: string;
  stageName: string;
  stageColor: string;
  eventDate: string;
  onPress: () => void;
}

export function ProjectCard({
  projectTitle,
  clientName,
  stageName,
  stageColor,
  eventDate,
  onPress,
}: ProjectCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundRoot },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.row}>
        <Avatar name={clientName} size={48} />
        <View style={styles.content}>
          <ThemedText style={styles.title}>{projectTitle}</ThemedText>
          <ThemedText style={styles.subtitle}>{clientName}</ThemedText>
          <View style={styles.metaRow}>
            <Badge label={stageName} backgroundColor={stageColor} />
            <ThemedText style={styles.date}>{eventDate}</ThemedText>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
    gap: Spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  date: {
    fontSize: 12,
    opacity: 0.6,
  },
});
