declare module "@/utils/notificationHelper" {
  export const setupNotifications: () => Promise<boolean>;
  export const requestFCMPermissions: () => Promise<boolean>;
  export const getFCMToken: () => Promise<string | null>;
  export const setupBackgroundHandler: () => void;
  export const storeNotificationData: (key: string, data: any) => string;
  export const getNotificationData: (key: string) => any;
  export const setupNotificationHandlers: () => void;
  export const createNotificationChannels: () => Promise<void>;
  export const showLocalNotification: (
    title: string,
    body: string,
    data?: any
  ) => Promise<boolean>;
  export const showImageReadyNotification: (
    title: string,
    body: string,
    imageUrl: string
  ) => Promise<boolean>;
}
