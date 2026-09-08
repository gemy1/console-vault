/**
 * Centralized Haptics Service
 * 
 * Configured to completely disable all vibration/haptic feedback
 * across the entire application.
 */

export enum ImpactFeedbackStyle {
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy',
  Rigid = 'rigid',
  Soft = 'soft',
}

export enum NotificationFeedbackType {
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

export const impactAsync = async (_style?: ImpactFeedbackStyle): Promise<void> => {
  // Vibration disabled
};

export const notificationAsync = async (_type?: NotificationFeedbackType): Promise<void> => {
  // Vibration disabled
};

export const selectionAsync = async (): Promise<void> => {
  // Vibration disabled
};

export default {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  notificationAsync,
  selectionAsync,
};
