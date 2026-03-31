import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import Colors from '@/constants/colors';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton = React.memo(function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: Colors.cardBackgroundLight,
          opacity,
        },
        style,
      ]}
    />
  );
});

export function SearchSkeleton() {
  return (
    <View style={skeletonStyles.searchContainer}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={skeletonStyles.searchItem}>
          <Skeleton width={48} height={36} borderRadius={4} />
          <View style={skeletonStyles.searchItemInfo}>
            <Skeleton width="70%" height={14} borderRadius={4} />
            <Skeleton width="50%" height={11} borderRadius={3} />
            <Skeleton width="40%" height={10} borderRadius={3} />
          </View>
          <Skeleton width={34} height={34} borderRadius={17} />
        </View>
      ))}
    </View>
  );
}

export function CardGridSkeleton() {
  return (
    <View style={skeletonStyles.gridContainer}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={skeletonStyles.gridItem}>
          <Skeleton width="100%" height={180} borderRadius={10} />
          <View style={skeletonStyles.gridItemText}>
            <Skeleton width="80%" height={12} borderRadius={3} />
            <Skeleton width="50%" height={10} borderRadius={3} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function PrintPreviewSkeleton() {
  return (
    <View style={skeletonStyles.printContainer}>
      <Skeleton width="60%" height={14} borderRadius={4} />
      <View style={skeletonStyles.printReceipt}>
        <Skeleton width="70%" height={18} borderRadius={4} />
        <Skeleton width="100%" height={200} borderRadius={0} />
        <Skeleton width="60%" height={14} borderRadius={4} />
        <Skeleton width="90%" height={12} borderRadius={3} />
        <Skeleton width="85%" height={12} borderRadius={3} />
        <Skeleton width="100" height={100} borderRadius={4} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  searchContainer: {
    paddingTop: 8,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  searchItemInfo: {
    flex: 1,
    gap: 6,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    paddingTop: 8,
  },
  gridItem: {
    width: '48%' as unknown as number,
    flexGrow: 1,
    flexBasis: '46%' as unknown as number,
    gap: 6,
  },
  gridItemText: {
    paddingHorizontal: 4,
    gap: 4,
  },
  printContainer: {
    alignItems: 'center',
    paddingTop: 16,
    gap: 12,
  },
  printReceipt: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
});
