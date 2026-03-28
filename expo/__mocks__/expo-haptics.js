export const HapticsModule = {
  impact: jest.fn().mockResolvedValue(undefined),
  notification: jest.fn().mockResolvedValue(undefined),
  selection: jest.fn().mockResolvedValue(undefined),
};

export async function impactAsync(style = 'medium') {
  HapticsModule.impact(style);
  return undefined;
}

export async function notificationAsync(type = 'success') {
  HapticsModule.notification(type);
  return undefined;
}

export async function selectionAsync() {
  HapticsModule.selection();
  return undefined;
}

export const ImpactStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
  Rigid: 'rigid',
  Soft: 'soft',
};

export const NotificationType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
};

export default {
  impactAsync,
  notificationAsync,
  selectionAsync,
  ImpactStyle,
  NotificationType,
};