import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ErrorCategory, logger } from '@/utils/logger';

export type ToastType = 'error' | 'warning' | 'success' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
  persistent?: boolean;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const ICON_MAP: Record<ToastType, React.ReactNode> = {
  error: <AlertTriangle size={16} color="#FF6B6B" />,
  warning: <WifiOff size={16} color="#FFB347" />,
  success: <CheckCircle size={16} color="#66BB6A" />,
  info: <Info size={16} color="#64B5F6" />,
};

const ACCENT_MAP: Record<ToastType, string> = {
  error: '#FF6B6B',
  warning: '#FFB347',
  success: '#66BB6A',
  info: '#64B5F6',
};

const MAX_DURATION = 8000;
const DEFAULT_DURATION = 4000;

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const dismissedRef = useRef(false);

  const duration = Math.min(toast.duration ?? DEFAULT_DURATION, MAX_DURATION);

  const dismissToast = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -60,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(toast.id);
    });
  }, [toast.id, onDismiss, translateY, opacity]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 140,
        friction: 16,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: duration,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => {
      dismissToast();
    }, duration);
    return () => clearTimeout(timer);
  }, [translateY, opacity, progressAnim, duration, dismissToast]);

  const accent = ACCENT_MAP[toast.type];

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.toastItem,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.toastInner}>
        <View style={[styles.iconCircle, { backgroundColor: `${accent}18` }]}>
          {ICON_MAP[toast.type]}
        </View>
        <View style={styles.toastContent}>
          <Text style={styles.toastTitle} numberOfLines={1}>{toast.title}</Text>
          {toast.message ? (
            <Text style={styles.toastMessage} numberOfLines={1}>{toast.message}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressWidth,
              backgroundColor: accent,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

let _addToast: ((toast: Omit<ToastMessage, 'id'>) => void) | null = null;
let _removeToast: ((id: string) => void) | null = null;

export function showToast(toast: Omit<ToastMessage, 'id'>) {
  if (_addToast) {
    _addToast(toast);
  } else {
    logger.debug(ErrorCategory.Render, `Provider not mounted, queuing toast: ${toast.title}`);
  }
}

export function dismissToast(id: string) {
  if (_removeToast) {
    _removeToast(id);
  }
}

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${toastCounter++}`;
    const newToast: ToastMessage = { ...toast, id };

    if (Platform.OS !== 'web' && (toast.type === 'error' || toast.type === 'warning')) {
      void Haptics.notificationAsync(
        toast.type === 'error'
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Warning
      );
    }

    setToasts(prev => {
      const filtered = prev.filter(t => !(t.title === toast.title && t.type === toast.type));
      return [newToast, ...filtered].slice(0, 3);
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    _addToast = addToast;
    _removeToast = removeToast;
    return () => {
      _addToast = null;
      _removeToast = null;
    };
  }, [addToast, removeToast]);

  return (
    <View style={styles.providerWrap}>
      {children}
      <View
        style={[styles.toastContainer, { top: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  providerWrap: {
    flex: 1,
  },
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 6,
  },
  toastItem: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastContent: {
    flex: 1,
    gap: 1,
  },
  toastTitle: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  toastMessage: {
    color: '#8E8E93',
    fontSize: 12,
    lineHeight: 16,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1,
  },
});
