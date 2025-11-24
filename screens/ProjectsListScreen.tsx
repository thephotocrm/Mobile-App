import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Input } from '@/components/Input';
import { ProjectCard } from '@/components/ProjectCard';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { ProjectsStackParamList } from '@/navigation/ProjectsStackNavigator';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';
import { ProjectRepository, ProjectWithClient, ProjectStage } from '@/database/repositories/ProjectRepository';

type NavigationProp = NativeStackNavigationProp<ProjectsStackParamList, 'ProjectsList'>;

const STAGES = [
  { id: 'all', name: 'All', color: '#6B7280' },
  { id: 'lead', name: 'Lead', color: '#F59E0B' },
  { id: 'booked', name: 'Booked', color: '#3B82F6' },
  { id: 'active', name: 'Active', color: '#8B4565' },
  { id: 'completed', name: 'Completed', color: '#22C55E' },
];

const getStageColor = (stage: ProjectStage): string => {
  const stageColors: Record<ProjectStage, string> = {
    lead: '#F59E0B',
    booked: '#3B82F6',
    active: '#8B4565',
    completed: '#22C55E',
  };
  return stageColors[stage];
};

const formatEventDate = (timestamp?: number): string => {
  if (!timestamp) return 'No date set';
  
  const date = new Date(timestamp * 1000);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();
  
  return `${month} ${day}, ${year}`;
};

const capitalizeStage = (stage: ProjectStage): string => {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
};

export default function ProjectsListScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [projects, setProjects] = useState<ProjectWithClient[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    try {
      setLoading(true);
      let result: ProjectWithClient[];

      if (searchQuery.trim()) {
        result = await ProjectRepository.search(searchQuery.trim());
      } else if (selectedStage !== 'all') {
        result = await ProjectRepository.getByStage(selectedStage as ProjectStage);
      } else {
        result = await ProjectRepository.getAll();
      }

      if (searchQuery.trim() && selectedStage !== 'all') {
        result = result.filter(project => project.stage === selectedStage);
      }

      setProjects(result);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadProjects();
    }, [searchQuery, selectedStage])
  );

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
        {STAGES.map((stage) => (
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <View style={styles.projectList}>
          {projects.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>No projects found</ThemedText>
            </View>
          ) : (
            projects.map((project) => (
              <ProjectCard
                key={project.id.toString()}
                projectTitle={project.title}
                clientName={project.client_name}
                stageName={capitalizeStage(project.stage)}
                stageColor={getStageColor(project.stage)}
                eventDate={formatEventDate(project.event_date)}
                onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id.toString() })}
              />
            ))
          )}
        </View>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
