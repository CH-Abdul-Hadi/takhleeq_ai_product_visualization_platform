import { aiDesignApi } from './apiClient';

export const aiDesignService = {
  /**
   * Create AI Center design request
   */
  createAICenterDesign: async (designRequest) => {
    try {
      const response = await aiDesignApi.post('/ai-center/create', designRequest);
      return response.data;
    } catch (error) {
      console.error("Failed to create AI center design:", error);
      throw error;
    }
  },

  /**
   * Approve a design
   */
  approveDesign: async (recordId) => {
    try {
      const response = await aiDesignApi.post(`/ai-center/${recordId}/approve`);
      return response.data;
    } catch (error) {
      console.error("Failed to approve design:", error);
      throw error;
    }
  },

  /**
   * Reject a design
   */
  rejectDesign: async (recordId) => {
    try {
      const response = await aiDesignApi.post(`/ai-center/${recordId}/reject`);
      return response.data;
    } catch (error) {
      console.error("Failed to reject design:", error);
      throw error;
    }
  },

  /**
   * Get a single AI Center record
   */
  getAICenterRecord: async (recordId) => {
    try {
      const response = await aiDesignApi.get(`/ai-center/${recordId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get AI center record:", error);
      throw error;
    }
  },

  /**
   * Get all AI Center records
   */
  getAllAICenterRecords: async () => {
    try {
      const response = await aiDesignApi.get('/ai-center/');
      return response.data;
    } catch (error) {
      console.error("Failed to get AI center records:", error);
      throw error;
    }
  },
  getAICenterRecordsByUser: async (userId) => {
    try {
      const response = await aiDesignApi.get('/ai-center/', {
        params: { user_id: userId },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to get user AI center records:", error);
      throw error;
    }
  },

  /**
   * Check AI design service health
   */
  checkHealth: async () => {
    try {
      const response = await aiDesignApi.get('/health');
      return response.data;
    } catch (error) {
      console.error("Failed to check AI design service health:", error);
      throw error;
    }
  }
};
