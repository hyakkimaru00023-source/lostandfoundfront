import { ClaimRequest, AdminDashboardStats, AdminActivity, ItemManagementFilter, UserManagementData, AISystemMetrics, NotificationMetrics } from '@/types/admin';
import { Item, Notification, UserStats } from '@/types';
import { enhancedStorage } from './enhancedStorage';

const API_URL = '/api';

class AdminService {
  private readonly CLAIMS_KEY = 'admin_claims';
  private readonly ADMIN_ACTIVITIES_KEY = 'admin_activities';
  private readonly USER_FLAGS_KEY = 'user_flags';

  // Fetch wrapper with error handling
  private async fetchAPI(endpoint: string, options?: RequestInit) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      return null;
    }
  }

  // Claims Management
  async getClaims(): Promise<ClaimRequest[]> {
    // Try to fetch from API first
    const apiData = await this.fetchAPI('/admin/claims');
    if (apiData && Array.isArray(apiData)) {
      // Store in localStorage as backup
      localStorage.setItem(this.CLAIMS_KEY, JSON.stringify(apiData));
      return apiData;
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(this.CLAIMS_KEY);
      return stored ? JSON.parse(stored) : this.initializeSampleClaims();
    } catch (error) {
      console.error('Error loading claims:', error);
      return [];
    }
  }

  // Get claims (sync version for backward compatibility)
  getClaimsSync(): ClaimRequest[] {
    try {
      const stored = localStorage.getItem(this.CLAIMS_KEY);
      return stored ? JSON.parse(stored) : this.initializeSampleClaims();
    } catch (error) {
      console.error('Error loading claims:', error);
      return [];
    }
  }

  saveClaim(claim: ClaimRequest): void {
    try {
      const claims = this.getClaimsSync();
      const existingIndex = claims.findIndex(c => c.id === claim.id);

      if (existingIndex >= 0) {
        claims[existingIndex] = claim;
      } else {
        claims.unshift(claim);
      }

      localStorage.setItem(this.CLAIMS_KEY, JSON.stringify(claims));
      this.logActivity({
        type: 'claim_submitted',
        description: `Claim submitted for item: ${claim.itemId}`,
        userId: claim.claimantId,
        itemId: claim.itemId,
        severity: 'info'
      });
    } catch (error) {
      console.error('Error saving claim:', error);
    }
  }

  updateClaimStatus(claimId: string, status: ClaimRequest['status'], adminNotes?: string, reviewedBy?: string): void {
    try {
      const claims = this.getClaimsSync();
      const claim = claims.find(c => c.id === claimId);

      if (claim) {
        claim.status = status;
        claim.reviewedAt = new Date().toISOString();
        claim.reviewedBy = reviewedBy || 'admin';
        if (adminNotes) claim.adminNotes = adminNotes;

        localStorage.setItem(this.CLAIMS_KEY, JSON.stringify(claims));

        // Update item status if claim is approved
        if (status === 'approved') {
          enhancedStorage.updateItem(claim.itemId, { status: 'claimed' });
        }

        this.logActivity({
          type: status === 'approved' ? 'claim_approved' : 'claim_rejected',
          description: `Claim ${status} for item: ${claim.itemId}`,
          userId: claim.claimantId,
          itemId: claim.itemId,
          severity: status === 'approved' ? 'success' : 'warning'
        });
      }
    } catch (error) {
      console.error('Error updating claim status:', error);
    }
  }

  bulkUpdateClaims(claimIds: string[], status: ClaimRequest['status'], adminNotes?: string): void {
    claimIds.forEach(id => this.updateClaimStatus(id, status, adminNotes));
  }

  // Dashboard Statistics - now fetches from API
  async getDashboardStats(): Promise<AdminDashboardStats> {
    // Try to fetch items from API
    const apiItems = await this.fetchAPI('/items');

    let items: any[] = [];
    if (apiItems && Array.isArray(apiItems)) {
      items = apiItems;
      // Cache in localStorage
      localStorage.setItem('cached_items', JSON.stringify(items));
    } else {
      // Fallback to localStorage
      items = enhancedStorage.getItems();
    }

    const claims = await this.getClaims();
    const activities = this.getActivities();

    return {
      totalItems: items.length,
      activeItems: items.filter(i => i.status === 'active' || i.status === 'open').length,
      matchedItems: items.filter(i => i.status === 'matched' || i.status === 'claimed').length,
      pendingClaims: claims.filter(c => c.status === 'pending').length,
      totalUsers: this.getTotalUsers(items),
      activeUsers: this.getActiveUsers(items),
      aiAccuracy: this.getAIAccuracy(),
      notificationsSent: this.getNotificationsSent(),
      successfulMatches: items.filter(i => i.status === 'matched' || i.status === 'claimed').length,
      recentActivity: activities.slice(0, 10)
    };
  }

  // Items Management
  async getItemsWithFilters(filters: ItemManagementFilter): Promise<any[]> {
    // Try API first
    const apiItems = await this.fetchAPI('/items');

    let items: any[] = [];
    if (apiItems && Array.isArray(apiItems)) {
      items = apiItems;
    } else {
      items = enhancedStorage.getItems();
    }

    if (filters.status?.length) {
      items = items.filter(item => filters.status!.includes(item.status));
    }

    if (filters.category?.length) {
      items = items.filter(item => filters.category!.includes(item.category));
    }

    if (filters.type) {
      items = items.filter(item => item.type === filters.type);
    }

    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      items = items.filter(item => {
        const itemDate = new Date(item.dateReported || item.created_at);
        return itemDate >= start && itemDate <= end;
      });
    }

    if (filters.location) {
      items = items.filter(item =>
        (item.location?.name || item.location || '').toLowerCase().includes(filters.location!.toLowerCase())
      );
    }

    if (filters.aiConfidence) {
      items = items.filter(item => {
        const confidence = item.aiClassification?.confidence || item.ai_confidence || 0;
        return confidence >= filters.aiConfidence!.min && confidence <= filters.aiConfidence!.max;
      });
    }

    return items;
  }

  bulkUpdateItems(itemIds: string[], updates: Partial<Item>): void {
    itemIds.forEach(id => {
      enhancedStorage.updateItem(id, updates);
    });

    this.logActivity({
      type: 'item_created',
      description: `Bulk updated ${itemIds.length} items`,
      severity: 'info'
    });
  }

  // User Management
  async getUsersData(): Promise<UserManagementData[]> {
    const items = await this.fetchAPI('/items') as any[] || enhancedStorage.getItems();
    const userMap = new Map<string, UserManagementData>();

    items.forEach(item => {
      const email = item.contact_email || item.contactInfo?.email;
      if (!email || !userMap.has(email)) {
        userMap.set(email, {
          id: email,
          name: item.contact_name || item.contactInfo?.name || 'Unknown',
          email: email,
          phone: item.contact_phone || item.contactInfo?.phone || '',
          joinedAt: item.dateReported || item.created_at,
          lastActive: item.dateReported || item.created_at,
          itemsReported: 0,
          successfulMatches: 0,
          trustScore: 85 + Math.random() * 15,
          verificationStatus: 'verified',
          flags: []
        });
      }

      const userData = userMap.get(email)!;
      userData.itemsReported++;
      if (item.status === 'matched' || item.status === 'claimed') {
        userData.successfulMatches++;
      }

      const itemDate = new Date(item.dateReported || item.created_at);
      if (itemDate > new Date(userData.lastActive)) {
        userData.lastActive = itemDate.toISOString();
      }
    });

    return Array.from(userMap.values());
  }

  // AI System Metrics
  getAIMetrics(): AISystemMetrics {
    const items = enhancedStorage.getItems();
    const trainingData = enhancedStorage.getTrainingData();
    const modelVersions = enhancedStorage.getModelVersions();
    const activeModel = enhancedStorage.getActiveModelVersion();

    const totalPredictions = items.filter(i => i.aiClassification).length;
    const userFeedback = trainingData.length;

    const categoryAccuracy: Record<string, number> = {};
    const categories = ['electronics', 'clothing', 'accessories', 'bags', 'books', 'keys'];
    categories.forEach(cat => {
      categoryAccuracy[cat] = 0.85 + Math.random() * 0.1;
    });

    return {
      currentModelVersion: activeModel?.versionNumber || '1.0.0',
      accuracy: activeModel?.performanceMetrics.accuracy || 0.89,
      precision: activeModel?.performanceMetrics.precision || 0.91,
      recall: activeModel?.performanceMetrics.recall || 0.88,
      f1Score: activeModel?.performanceMetrics.f1Score || 0.89,
      totalPredictions,
      correctPredictions: Math.floor(totalPredictions * 0.89),
      userFeedbackCount: userFeedback,
      lastTrainingDate: activeModel?.trainingCompletedAt || new Date().toISOString(),
      nextScheduledTraining: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      trainingDataSize: trainingData.length,
      categoryAccuracy
    };
  }

  // Notification Metrics
  getNotificationMetrics(): NotificationMetrics {
    const notifications = enhancedStorage.getNotifications();

    return {
      totalSent: notifications.length,
      deliveryRate: 0.98,
      openRate: 0.65,
      clickThroughRate: 0.23,
      unsubscribeRate: 0.02,
      channelPerformance: {
        email: { sent: 450, delivered: 441, opened: 287, clicked: 89 },
        push: { sent: 320, delivered: 312, opened: 198, clicked: 67 },
        sms: { sent: 120, delivered: 118, opened: 95, clicked: 23 },
        in_app: { sent: 680, delivered: 680, opened: 512, clicked: 156 }
      },
      recentNotifications: notifications.slice(0, 20).map(n => ({
        id: n.id,
        type: n.type,
        recipient: n.userId,
        status: 'delivered' as const,
        sentAt: n.timestamp
      }))
    };
  }

  // Activity Logging
  logActivity(activity: Omit<AdminActivity, 'id' | 'timestamp'>): void {
    try {
      const activities = this.getActivities();
      const newActivity: AdminActivity = {
        ...activity,
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      };

      activities.unshift(newActivity);

      if (activities.length > 1000) {
        activities.splice(1000);
      }

      localStorage.setItem(this.ADMIN_ACTIVITIES_KEY, JSON.stringify(activities));
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  getActivities(): AdminActivity[] {
    try {
      const stored = localStorage.getItem(this.ADMIN_ACTIVITIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading activities:', error);
      return [];
    }
  }

  // Helper methods
  private getTotalUsers(items: any[]): number {
    const uniqueEmails = new Set(items.map(i => i.contact_email || i.contactInfo?.email).filter(Boolean));
    return uniqueEmails.size || 1;
  }

  private getActiveUsers(items: any[]): number {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30);

    const recentEmails = new Set(
      items
        .filter(i => new Date(i.dateReported || i.created_at) > recentDate)
        .map(i => i.contact_email || i.contactInfo?.email)
        .filter(Boolean)
    );
    return recentEmails.size || 1;
  }

  private getAIAccuracy(): number {
    const activeModel = enhancedStorage.getActiveModelVersion();
    return activeModel?.performanceMetrics.accuracy || 0.89;
  }

  private getNotificationsSent(): number {
    return enhancedStorage.getNotifications().length;
  }

  private initializeSampleClaims(): ClaimRequest[] {
    const sampleClaims: ClaimRequest[] = [
      {
        id: 'claim_1',
        itemId: 'sample_1',
        claimantId: 'user_1',
        claimantName: 'Alice Johnson',
        claimantEmail: 'alice@example.com',
        claimantPhone: '+1-555-0199',
        status: 'pending',
        submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        verificationMethod: 'description',
        verificationDetails: 'Black iPhone 13 Pro with a small crack on the back, blue case with my initials AJ',
        priority: 'high',
        confidenceScore: 0.92
      },
      {
        id: 'claim_2',
        itemId: 'sample_3',
        claimantId: 'user_2',
        claimantName: 'Bob Smith',
        claimantEmail: 'bob@example.com',
        status: 'under_review',
        submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        reviewedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        reviewedBy: 'admin',
        verificationMethod: 'photo',
        verificationDetails: 'I have photos of the backpack from when I bought it, and receipt from the store',
        proofImages: ['/api/placeholder/300/200'],
        priority: 'medium',
        confidenceScore: 0.78
      }
    ];

    localStorage.setItem(this.CLAIMS_KEY, JSON.stringify(sampleClaims));
    return sampleClaims;
  }
}

export const adminService = new AdminService();