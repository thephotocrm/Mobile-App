import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Input } from '@/components/Input';
import { ProjectCard } from '@/components/ProjectCard';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { ProjectsStackParamList } from '@/navigation/ProjectsStackNavigator';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';

type NavigationProp = NativeStackNavigationProp<ProjectsStackParamList, 'ProjectsList'>;

const MOCK_STAGES = [
  { id: 'all', name: 'All', color: '#6B7280' },
  { id: 'lead', name: 'Lead', color: '#F59E0B' },
  { id: 'booked', name: 'Booked', color: '#3B82F6' },
  { id: 'active', name: 'Active', color: '#8B4565' },
  { id: 'completed', name: 'Completed', color: '#22C55E' },
];

const MOCK_PROJECTS = [
  { id: '1', title: 'Sarah & Mike Wedding', clientName: 'Sarah Johnson', stageName: 'Booked', stageColor: '#3B82F6', eventDate: 'Jun 15, 2025' },
  { id: '2', title: 'Emily & James Engagement', clientName: 'Emily Davis', stageName: 'Active', stageColor: '#8B4565', eventDate: 'Mar 22, 2025' },
  { id: '3', title: 'Rachel & Tom Wedding', clientName: 'Rachel Martinez', stageName: 'Lead', stageColor: '#F59E0B', eventDate: 'Aug 10, 2025' },
  { id: '4', title: 'Jessica & David Ceremony', clientName: 'Jessica Wilson', stageName: 'Booked', stageColor: '#3B82F6', eventDate: 'May 5, 2025' },
  { id: '5', title: 'Amanda & Chris Wedding', clientName: 'Amanda Brown', stageName: 'Completed', stageColor: '#22C55E', eventDate: 'Nov 12, 2024' },
];

export default function ProjectsListScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');

  const filteredProjects = MOCK_PROJECTS.filter((project) => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = selectedStage === 'all' || project.stageName.toLowerCase() === selectedStage;
    return matchesSearch && matchesStage;
  });

  return (
    <ScreenScrollView>
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Feather name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.stageContainer}
        contentContainerStyle={styles.stageContent}
      >
        {MOCK_STAGES.map((stage) => (
          <Pressable
            key={stage.id}
            onPress={() => setSelectedStage(stage.id)}
            style={({ pressed }) => [
              styles.stageChip,
              {
                backgroundColor: selectedStage === stage.id ? stage.color : theme.backgroundSecondary,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ThemedText
              style={[
                styles.stageText,
                { color: selectedStage === stage.id ? '#FFFFFF' : theme.text },
              ]}
            >
              {stage.name}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.projectList}>
        {filteredProjects.map((project) => (
          <ProjectCard
            key={project.id}
            projectTitle={project.title}
            clientName={project.clientName}
            stageName={project.stageName}
            stageColor={project.stageColor}
            eventDate={project.eventDate}
            onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id })}
          />
        ))}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 10,
    paddingTop: Spacing.md,
  },
  searchWrapper: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: Spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: Spacing.xl + Spacing.md,
  },
  stageContainer: {
    marginTop: Spacing.md,
  },
  stageContent: {
    paddingHorizontal: 10,
    gap: Spacing.sm,
  },
  stageChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  stageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  projectList: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.md,
  },
});
