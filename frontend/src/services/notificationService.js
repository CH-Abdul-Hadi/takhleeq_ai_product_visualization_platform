import { notificationApi } from './apiClient';

export const notificationService = {
  /**
   * Get notification service status
   */
  getServiceStatus: async () => {
    try {
      const response = await notificationApi.get('/');
      return response.data;
    } catch (error) {
      console.error("Failed to get notification service status:", error);
      throw error;
    }
  },

  /**
   * Get notifications for current user.
   * Falls back to service root message when dedicated endpoint is unavailable.
   */
  getNotifications: async () => {
    const normalize = (payload) => {
      if (!payload) return [];
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload.notifications)) return payload.notifications;
      if (Array.isArray(payload.data)) return payload.data;
      return [];
    };

    const endpointCandidates = ["/get_notification", "/notifications", "/notification"];

    for (const endpoint of endpointCandidates) {
      try {
        const response = await notificationApi.get(endpoint);
        const items = normalize(response.data);
        if (items.length > 0) return items;
      } catch (error) {
        const status = error?.response?.status;
        if (status !== 404) {
          throw error;
        }
      }
    }

    const statusResponse = await notificationApi.get('/');
    const message = statusResponse?.data?.message || "Notification service is running.";
    return [
      {
        id: "service-status",
        type: "system",
        title: "Notification Service",
        desc: `${message} Email notifications are handled asynchronously via Kafka consumers.`,
        time: "Just now",
        unread: true,
      },
    ];
  }
};
