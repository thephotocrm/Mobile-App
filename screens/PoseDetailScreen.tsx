import React, { useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { ToolsStackParamList } from "@/navigation/ToolsStackNavigator";
import { Pose, getCategoryLabel } from "@/constants/poses";

type PoseDetailScreenNavigationProp = NativeStackNavigationProp<
  ToolsStackParamList,
  "PoseDetail"
>;

type PoseDetailScreenRouteProp = RouteProp<ToolsStackParamList, "PoseDetail">;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function PoseDetailScreen() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<PoseDetailScreenNavigationProp>();
  const route = useRoute<PoseDetailScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const { poseId, poses } = route.params;
  const initialIndex = poses.findIndex((p) => p.id === poseId);

  const [currentIndex, setCurrentIndex] = useState(
    initialIndex >= 0 ? initialIndex : 0,
  );
  const [showOverlay, setShowOverlay] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(poses.filter((p) => p.isFavorite).map((p) => p.id)),
  );

  const currentPose = poses[currentIndex];

  const handleToggleOverlay = useCallback(() => {
    setShowOverlay((prev) => !prev);
  }, []);

  const handleFavoriteToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(currentPose.id)) {
        newFavorites.delete(currentPose.id);
      } else {
        newFavorites.add(currentPose.id);
      }
      return newFavorites;
    });
  }, [currentPose.id]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const isFavorite = favorites.has(currentPose?.id || "");

  const renderItem = ({ item }: { item: Pose }) => (
    <PoseImage pose={item} onPress={handleToggleOverlay} />
  );

  if (!currentPose) {
    return (
      <View style={[styles.container, { backgroundColor: "#000" }]}>
        <ThemedText style={{ color: "#FFF" }}>Pose not found</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <StatusBar barStyle="light-content" />

      {/* Swipeable Image Gallery */}
      <FlatList
        ref={flatListRef}
        data={poses}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex >= 0 ? initialIndex : 0}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Top Overlay - Close & Favorite */}
      {showOverlay && (
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "transparent"]}
          style={[styles.topOverlay, { paddingTop: insets.top }]}
        >
          <Pressable
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={12}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.topRight}>
            <Pressable
              style={[
                styles.actionButton,
                isFavorite && { backgroundColor: "rgba(236,72,153,0.3)" },
              ]}
              onPress={handleFavoriteToggle}
              hitSlop={12}
            >
              <Feather
                name="heart"
                size={24}
                color={isFavorite ? "#EC4899" : "#FFFFFF"}
              />
            </Pressable>
          </View>
        </LinearGradient>
      )}

      {/* Bottom Overlay - Pose Info */}
      {showOverlay && (
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={[
            styles.bottomOverlay,
            { paddingBottom: insets.bottom + Spacing.md },
          ]}
        >
          {/* Pagination Dots */}
          <View style={styles.pagination}>
            {poses.length > 1 &&
              poses.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentIndex && styles.dotActive,
                  ]}
                />
              ))}
          </View>

          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <ThemedText style={styles.categoryText}>
              {getCategoryLabel(currentPose.category)}
            </ThemedText>
          </View>

          {/* Title */}
          {currentPose.title && (
            <ThemedText style={styles.title}>{currentPose.title}</ThemedText>
          )}

          {/* Notes */}
          {currentPose.notes && (
            <ThemedText style={styles.notes}>{currentPose.notes}</ThemedText>
          )}

          {/* Pose Counter */}
          <ThemedText style={styles.counter}>
            {currentIndex + 1} of {poses.length}
          </ThemedText>
        </LinearGradient>
      )}
    </View>
  );
}

interface PoseImageProps {
  pose: Pose;
  onPress: () => void;
}

function PoseImage({ pose, onPress }: PoseImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <Pressable style={styles.imageContainer} onPress={onPress}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
      {error ? (
        <View style={styles.errorContainer}>
          <Feather name="image" size={64} color="#666" />
          <ThemedText style={styles.errorText}>Failed to load image</ThemedText>
        </View>
      ) : (
        <Image
          source={{ uri: pose.imageUrl }}
          style={styles.image}
          resizeMode="contain"
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  errorText: {
    color: "#666",
    ...Typography.body,
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  topRight: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
    width: 20,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.chip,
    marginBottom: Spacing.sm,
  },
  categoryText: {
    color: "#FFFFFF",
    ...Typography.captionMedium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    color: "#FFFFFF",
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  notes: {
    color: "rgba(255,255,255,0.8)",
    ...Typography.body,
    marginBottom: Spacing.md,
  },
  counter: {
    color: "rgba(255,255,255,0.6)",
    ...Typography.caption,
    textAlign: "center",
  },
});
