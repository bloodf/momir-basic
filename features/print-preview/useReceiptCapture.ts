import React, { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { captureRef } from 'react-native-view-shot';
import { showToast } from '@/components/Toast';
import { ErrorCategory, logger } from '@/utils/logger';
import { useI18n } from '@/stores/i18nStore';

export type SaveOutcome = {
  type: 'success' | 'error';
  message: string;
} | null;

interface UseReceiptCaptureReturn {
  isSaving: boolean;
  saveOutcome: SaveOutcome;
  saveToGallery: () => Promise<void>;
}

/**
 * Hook encapsulating receipt screenshot capture and gallery save logic.
 * Uses react-native-view-shot for capture and expo-media-library for persistence.
 */
export function useReceiptCapture(
  viewShotRef: React.RefObject<any>,
): UseReceiptCaptureReturn {
  const { t } = useI18n();

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveOutcome, setSaveOutcome] = useState<SaveOutcome>(null);

  const saveToGallery = useCallback(async () => {
    if (!viewShotRef.current) return;

    if (Platform.OS as string === 'web') {
      showToast({ type: 'info', title: t.printPreview.notAvailable, message: t.printPreview.devPrintNotSupported });
      return;
    }

    setIsSaving(true);

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showToast({ type: 'error', title: t.printPreview.permissionDenied, message: t.printPreview.galleryAccessRequired });
        setIsSaving(false);
        return;
      }

      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      await MediaLibrary.createAssetAsync(uri);

      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setSaveOutcome({ type: 'success', message: t.printPreview.savedToGallery });
    } catch (error) {
      logger.warn(ErrorCategory.Printer, 'Save to gallery failed', error);
      showToast({ type: 'error', title: t.printPreview.saveFailed, message: t.printPreview.saveFailedMsg });
      setSaveOutcome({ type: 'error', message: t.printPreview.saveFailedMsg });
    } finally {
      setIsSaving(false);
    }
  }, [viewShotRef, t]);

  return {
    isSaving,
    saveOutcome,
    saveToGallery,
  };
}
