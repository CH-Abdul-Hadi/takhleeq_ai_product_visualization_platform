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

  sendContactMessage: async (payload) => {
    try {
      const response = await notificationApi.post('/contact', payload);
      return response.data;
    } catch (error) {
      console.error("Failed to send contact message:", error);
      throw error;
    }
  },

  /**
   * Get notifications for current user.
   * Falls back to service root message when dedicated endpoint is unavailable.
   */
  getNotifications: async (userEmail) => {
    const normalize = (payload) => {
      if (!payload) return [];
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload.notifications)) return payload.notifications;
      if (Array.isArray(payload.data)) return payload.data;
      return [];
    };

    const endpointCandidates = ["/get_notification", "/notifications", "/notification"];
    const requestConfig = userEmail ? { params: { user_email: userEmail } } : undefined;

    for (const endpoint of endpointCandidates) {
      try {
        const response = await notificationApi.get(endpoint, requestConfig);
        const items = normalize(response.data);
        return items;
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
