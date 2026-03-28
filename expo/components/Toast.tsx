import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, WifiOff, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

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
  error: <AlertTriangle size={18} color="#FF6B6B" />,
  warning: <WifiOff size={18} color="#FFB347" />,
  success: <CheckCircle size={18} color="#4CAF50" />,
  info: <Info size={18} color="#5B9BD5" />,
};

const BG_MAP: Record<ToastType, string> = {
  error: 'rgba(239,83,80,0.14)',
  warning: 'rgba(255,179,71,0.14)',
  success: 'rgba(76,175,80,0.14)',
  info: 'rgba(91,155,213,0.14)',
};

const BORDER_MAP: Record<ToastType, string> = {
  error: 'rgba(239,83,80,0.35)',
  warning: 'rgba(255,179,71,0.35)',
  success: 'rgba(76,175,80,0.35)',
  info: 'rgba(91,155,213,0.35)',
};

const ACCENT_MAP: Record<ToastType, string> = {
  error: '#FF6B6B',
  warning: '#FFB347',
  success: '#4CAF50',
  info: '#5B9BD5',
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const dismissedRef = useRef(false);

  const dismissToast = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
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
        tension: 120,
        friction: 14,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 120,
        friction: 14,
        useNativeDriver: true,
      }),
    ]).start();

    if (!toast.persistent) {
      const duration = toast.duration ?? 4000;
      const timer = setTimeout(() => {
        dismissToast();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [translateY, opacity, scale, toast.persistent, toast.duration, dismissToast]);

  const dismissible = toast.dismissible !== false;

  return (
    <Animated.View
      style={[
        styles.toastItem,
        {
          backgroundColor: BG_MAP[toast.type],
          borderColor: BORDER_MAP[toast.type],
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <View style={[styles.accentStrip, { backgroundColor: ACCENT_MAP[toast.type] }]} />
      <View style={styles.toastIcon}>{ICON_MAP[toast.type]}</View>
      <View style={styles.toastContent}>
        <Text style={styles.toastTitle} numberOfLines={1}>{toast.title}</Text>
        {toast.message ? (
          <Text style={styles.toastMessage} numberOfLines={2}>{toast.message}</Text>
        ) : null}
      </View>
      {dismissible && (
        <Pressable
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.selectionAsync();
            dismissToast();
          }}
          style={styles.toastClose}
          hitSlop={8}
        >
          <X size={14} color={Colors.textSecondary} />
        </Pressable>
      )}
    </Animated.View>
  );
}

let _addToast: ((toast: Omit<ToastMessage, 'id'>) => void) | null = null;
let _removeToast: ((id: string) => void) | null = null;

export function showToast(toast: Omit<ToastMessage, 'id'>) {
  if (_addToast) {
    _addToast(toast);
  } else {
    console.log('[Toast] Provider not mounted, queuing toast:', toast.title);
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
    left: 12,
    right: 12,
    zIndex: 9999,
    gap: 6,
  },
  toastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 0,
    gap: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  accentStrip: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  toastIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  toastContent: {
    flex: 1,
    gap: 2,
  },
  toastTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  toastMessage: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  toastClose: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
