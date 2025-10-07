import winston from 'winston';
import nodemailer from 'nodemailer';
import { EventEmitter } from 'events';

class CustomerSuccessTracker extends EventEmitter {
  constructor(logger, emailConfig, metricsCollector) {
    super();
    this.logger = logger || winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [new winston.transports.Console()]
    });

    this.metrics = metricsCollector;
    this.customers = new Map();
    this.satisfactionScores = [];
    this.churnRisk = new Map();

    // Email configuration for notifications
    this.emailTransporter = emailConfig ? nodemailer.createTransporter(emailConfig) : null;

    // Initialize tracking intervals
    this.startTracking();
  }

  startTracking() {
    // Update weekly active users every hour
    setInterval(() => {
      this.updateWeeklyActiveUsers();
    }, 3600000); // 1 hour

    // Calculate satisfaction scores daily
    setInterval(() => {
      this.calculateDailySatisfaction();
    }, 86400000); // 24 hours

    // Check for churn risk weekly
    setInterval(() => {
      this.assessChurnRisk();
    }, 604800000); // 7 days

    // Update customer health scores every 6 hours
    setInterval(() => {
      this.updateCustomerHealthScores();
    }, 21600000); // 6 hours
  }

  // Track customer onboarding
  trackCustomerOnboarding(customerId, onboardingData) {
    const customer = this.getOrCreateCustomer(customerId);

    customer.onboarding = {
      startTime: onboardingData.startTime || new Date(),
      completed: onboardingData.completed || false,
      stepsCompleted: onboardingData.stepsCompleted || 0,
      totalSteps: onboardingData.totalSteps || 10,
      timeToFirstSuccess: onboardingData.timeToFirstSuccess,
      helpRequestsNeeded: onboardingData.helpRequestsNeeded || 0,
      confusionPoints: onboardingData.confusionPoints || []
    };

    if (onboardingData.completed) {
      this.metrics.trackNewCustomer();
      this.sendOnboardingCompletionNotification(customerId, customer);
    }

    this.logger.info('Customer onboarding tracked', {
      customerId,
      completed: onboardingData.completed,
      progress: `${onboardingData.stepsCompleted}/${onboardingData.totalSteps}`
    });
  }

  // Track video processing success
  trackVideoProcessingSuccess(customerId, processingData) {
    const customer = this.getOrCreateCustomer(customerId);

    if (!customer.videoProcessing) {
      customer.videoProcessing = {
        totalVideos: 0,
        successfulVideos: 0,
        totalProcessingTime: 0,
        averageProcessingTime: 0,
        playerHighlightsGenerated: 0,
        parentNotificationsSent: 0
      };
    }

    customer.videoProcessing.totalVideos++;
    customer.videoProcessing.successfulVideos++;
    customer.videoProcessing.totalProcessingTime += processingData.processingTime || 0;
    customer.videoProcessing.averageProcessingTime =
      customer.videoProcessing.totalProcessingTime / customer.videoProcessing.successfulVideos;

    if (processingData.playerHighlights) {
      customer.videoProcessing.playerHighlightsGenerated += processingData.playerHighlights.length;
    }

    if (processingData.parentNotifications) {
      customer.videoProcessing.parentNotificationsSent += processingData.parentNotifications;
    }

    // Update customer satisfaction based on success
    this.updateCustomerSatisfaction(customerId, {
      videoProcessingSuccess: true,
      processingTime: processingData.processingTime,
      featuresUsed: processingData.featuresUsed || []
    });

    this.logger.info('Video processing success tracked', {
      customerId,
      totalVideos: customer.videoProcessing.totalVideos,
      successRate: customer.videoProcessing.successfulVideos / customer.videoProcessing.totalVideos
    });
  }

  // Track customer feedback
  trackCustomerFeedback(customerId, feedbackData) {
    const customer = this.getOrCreateCustomer(customerId);

    if (!customer.feedback) {
      customer.feedback = [];
    }

    const feedback = {
      date: new Date(),
      type: feedbackData.type, // 'rating', 'comment', 'bug_report', 'feature_request'
      score: feedbackData.score, // 1-5 rating
      comment: feedbackData.comment,
      category: feedbackData.category, // 'usability', 'performance', 'features', etc.
      resolved: false,
      actionTaken: null
    };

    customer.feedback.push(feedback);

    // Update satisfaction score if it's a rating
    if (feedbackData.type === 'rating' && feedbackData.score) {
      this.satisfactionScores.push({
        customerId,
        score: feedbackData.score,
        date: new Date()
      });

      // Update metrics
      const avgScore = this.calculateAverageSatisfaction();
      this.metrics.updateCustomerSatisfaction(avgScore);
    }

    // Alert for low ratings
    if (feedbackData.score && feedbackData.score <= 2) {
      this.handleLowSatisfactionScore(customerId, feedback);
    }

    this.logger.info('Customer feedback tracked', {
      customerId,
      type: feedbackData.type,
      score: feedbackData.score
    });
  }

  // Track usage patterns
  trackUsagePattern(customerId, usageData) {
    const customer = this.getOrCreateCustomer(customerId);

    if (!customer.usage) {
      customer.usage = {
        lastActive: new Date(),
        totalSessions: 0,
        averageSessionDuration: 0,
        videosPerMonth: 0,
        featuresUsed: new Set(),
        peakUsageTimes: [],
        inactivityPeriods: []
      };
    }

    customer.usage.lastActive = new Date();
    customer.usage.totalSessions++;

    if (usageData.sessionDuration) {
      customer.usage.averageSessionDuration =
        (customer.usage.averageSessionDuration + usageData.sessionDuration) / 2;
    }

    if (usageData.featuresUsed) {
      usageData.featuresUsed.forEach(feature => {
        customer.usage.featuresUsed.add(feature);
      });
    }

    if (usageData.videoProcessed) {
      customer.usage.videosPerMonth++;
    }

    // Detect inactivity
    this.checkForInactivity(customerId, customer);

    this.logger.debug('Usage pattern tracked', {
      customerId,
      totalSessions: customer.usage.totalSessions,
      lastActive: customer.usage.lastActive
    });
  }

  // Update customer satisfaction based on various factors
  updateCustomerSatisfaction(customerId, factors) {
    const customer = this.getOrCreateCustomer(customerId);

    let satisfactionScore = 4.0; // Default neutral-positive score

    // Adjust based on onboarding experience
    if (customer.onboarding) {
      if (customer.onboarding.timeToFirstSuccess > 1800000) { // 30+ minutes
        satisfactionScore -= 0.5;
      }
      if (customer.onboarding.helpRequestsNeeded > 2) {
        satisfactionScore -= 0.3;
      }
      if (customer.onboarding.confusionPoints.length > 3) {
        satisfactionScore -= 0.4;
      }
    }

    // Adjust based on video processing success
    if (customer.videoProcessing) {
      const successRate = customer.videoProcessing.successfulVideos / customer.videoProcessing.totalVideos;
      if (successRate >= 0.95) satisfactionScore += 0.5;
      else if (successRate < 0.8) satisfactionScore -= 1.0;

      if (customer.videoProcessing.averageProcessingTime > 900000) { // 15+ minutes
        satisfactionScore -= 0.3;
      }
    }

    // Adjust based on recent feedback
    if (customer.feedback && customer.feedback.length > 0) {
      const recentFeedback = customer.feedback
        .filter(f => f.date > new Date(Date.now() - 2592000000)) // Last 30 days
        .filter(f => f.score !== undefined);

      if (recentFeedback.length > 0) {
        const avgFeedback = recentFeedback.reduce((sum, f) => sum + f.score, 0) / recentFeedback.length;
        satisfactionScore = (satisfactionScore + avgFeedback) / 2;
      }
    }

    // Adjust based on usage patterns
    if (customer.usage) {
      const daysSinceLastActive = (Date.now() - customer.usage.lastActive.getTime()) / 86400000;
      if (daysSinceLastActive > 7) satisfactionScore -= 0.5;
      if (daysSinceLastActive > 30) satisfactionScore -= 1.0;

      if (customer.usage.featuresUsed.size > 5) satisfactionScore += 0.3;
    }

    // Ensure score is within bounds
    satisfactionScore = Math.max(1.0, Math.min(5.0, satisfactionScore));

    customer.satisfactionScore = satisfactionScore;
    customer.lastSatisfactionUpdate = new Date();

    this.logger.info('Customer satisfaction updated', {
      customerId,
      satisfactionScore: satisfactionScore.toFixed(2)
    });

    return satisfactionScore;
  }

  // Get customer health score
  getCustomerHealthScore(customerId) {
    const customer = this.customers.get(customerId);
    if (!customer) return null;

    let healthScore = 100;
    const issues = [];

    // Check satisfaction score
    if (customer.satisfactionScore < 3.0) {
      healthScore -= 30;
      issues.push('low_satisfaction');
    }

    // Check usage frequency
    if (customer.usage) {
      const daysSinceLastActive = (Date.now() - customer.usage.lastActive.getTime()) / 86400000;
      if (daysSinceLastActive > 14) {
        healthScore -= 25;
        issues.push('inactive');
      }

      if (customer.usage.videosPerMonth < 2) {
        healthScore -= 15;
        issues.push('low_usage');
      }
    }

    // Check support requests
    const recentFeedback = customer.feedback || [];
    const supportRequests = recentFeedback.filter(f =>
      f.type === 'bug_report' || f.type === 'help_request'
    ).length;

    if (supportRequests > 3) {
      healthScore -= 20;
      issues.push('frequent_issues');
    }

    // Check feature adoption
    if (customer.usage && customer.usage.featuresUsed.size < 3) {
      healthScore -= 10;
      issues.push('low_feature_adoption');
    }

    return {
      score: Math.max(0, healthScore),
      status: this.getHealthStatus(healthScore),
      issues,
      lastUpdated: new Date()
    };
  }

  getHealthStatus(score) {
    if (score >= 80) return 'healthy';
    if (score >= 60) return 'at_risk';
    if (score >= 40) return 'unhealthy';
    return 'critical';
  }

  // Weekly active users calculation
  updateWeeklyActiveUsers() {
    const oneWeekAgo = new Date(Date.now() - 604800000); // 7 days

    let activeUsers = 0;
    for (const [customerId, customer] of this.customers) {
      if (customer.usage && customer.usage.lastActive > oneWeekAgo) {
        activeUsers++;
      }
    }

    this.metrics.updateWeeklyActiveUsers(activeUsers);

    this.logger.info('Weekly active users updated', { activeUsers });
    return activeUsers;
  }

  // Calculate daily satisfaction
  calculateDailySatisfaction() {
    const oneDayAgo = new Date(Date.now() - 86400000);

    const recentScores = this.satisfactionScores.filter(s => s.date > oneDayAgo);
    if (recentScores.length === 0) return 4.0; // Default if no recent scores

    const avgScore = recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length;
    this.metrics.updateCustomerSatisfaction(avgScore);

    return avgScore;
  }

  // Calculate average satisfaction across all customers
  calculateAverageSatisfaction() {
    if (this.satisfactionScores.length === 0) return 4.0;

    const thirtyDaysAgo = new Date(Date.now() - 2592000000);
    const recentScores = this.satisfactionScores.filter(s => s.date > thirtyDaysAgo);

    if (recentScores.length === 0) return 4.0;

    return recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length;
  }

  // Assess churn risk
  assessChurnRisk() {
    let highRiskCount = 0;
    let totalCustomers = 0;

    for (const [customerId, customer] of this.customers) {
      totalCustomers++;

      const healthScore = this.getCustomerHealthScore(customerId);
      const isHighRisk = this.isHighChurnRisk(customerId, customer, healthScore);

      if (isHighRisk) {
        highRiskCount++;
        this.churnRisk.set(customerId, {
          risk: 'high',
          reasons: this.getChurnRiskReasons(customer, healthScore),
          lastAssessment: new Date()
        });

        this.handleHighChurnRisk(customerId, customer);
      } else {
        this.churnRisk.delete(customerId);
      }
    }

    const churnRate = totalCustomers > 0 ? highRiskCount / totalCustomers : 0;
    this.metrics.updateCustomerChurnRate(churnRate);

    this.logger.info('Churn risk assessment completed', {
      totalCustomers,
      highRiskCount,
      churnRate: (churnRate * 100).toFixed(2) + '%'
    });
  }

  isHighChurnRisk(customerId, customer, healthScore) {
    const risks = [];

    // Low health score
    if (healthScore && healthScore.score < 50) {
      risks.push('low_health_score');
    }

    // Inactive for more than 2 weeks
    if (customer.usage) {
      const daysSinceLastActive = (Date.now() - customer.usage.lastActive.getTime()) / 86400000;
      if (daysSinceLastActive > 14) {
        risks.push('inactive');
      }
    }

    // Low satisfaction scores
    if (customer.satisfactionScore < 2.5) {
      risks.push('low_satisfaction');
    }

    // Multiple unresolved issues
    const unresolvedIssues = (customer.feedback || [])
      .filter(f => f.type === 'bug_report' && !f.resolved).length;
    if (unresolvedIssues > 2) {
      risks.push('unresolved_issues');
    }

    return risks.length >= 2; // High risk if 2+ risk factors
  }

  getChurnRiskReasons(customer, healthScore) {
    const reasons = [];

    if (healthScore && healthScore.issues) {
      reasons.push(...healthScore.issues);
    }

    if (customer.satisfactionScore < 3.0) {
      reasons.push('low_satisfaction');
    }

    return [...new Set(reasons)]; // Remove duplicates
  }

  // Customer health score updates
  updateCustomerHealthScores() {
    let healthyCount = 0;
    let atRiskCount = 0;
    let unhealthyCount = 0;

    for (const [customerId] of this.customers) {
      const healthScore = this.getCustomerHealthScore(customerId);
      if (!healthScore) continue;

      switch (healthScore.status) {
        case 'healthy':
          healthyCount++;
          break;
        case 'at_risk':
          atRiskCount++;
          break;
        case 'unhealthy':
        case 'critical':
          unhealthyCount++;
          break;
      }
    }

    this.logger.info('Customer health scores updated', {
      healthy: healthyCount,
      atRisk: atRiskCount,
      unhealthy: unhealthyCount,
      total: this.customers.size
    });

    this.emit('healthScoresUpdated', {
      healthy: healthyCount,
      atRisk: atRiskCount,
      unhealthy: unhealthyCount,
      total: this.customers.size
    });
  }

  // Utility methods
  getOrCreateCustomer(customerId) {
    if (!this.customers.has(customerId)) {
      this.customers.set(customerId, {
        id: customerId,
        createdAt: new Date(),
        satisfactionScore: 4.0,
        lastSatisfactionUpdate: new Date()
      });
    }
    return this.customers.get(customerId);
  }

  checkForInactivity(customerId, customer) {
    if (!customer.usage) return;

    const daysSinceLastActive = (Date.now() - customer.usage.lastActive.getTime()) / 86400000;

    if (daysSinceLastActive >= 7 && daysSinceLastActive < 8) {
      this.sendInactivityEmail(customerId, 'week');
    } else if (daysSinceLastActive >= 30 && daysSinceLastActive < 31) {
      this.sendInactivityEmail(customerId, 'month');
    }
  }

  // Notification methods
  async sendOnboardingCompletionNotification(customerId, customer) {
    this.emit('customerOnboardingComplete', { customerId, customer });

    if (this.emailTransporter) {
      // Send welcome email with tips
    }
  }

  async handleLowSatisfactionScore(customerId, feedback) {
    this.emit('lowSatisfactionScore', { customerId, feedback });

    this.logger.warn('Low satisfaction score detected', {
      customerId,
      score: feedback.score,
      comment: feedback.comment
    });

    if (this.emailTransporter) {
      // Send immediate follow-up email
    }
  }

  async handleHighChurnRisk(customerId, customer) {
    this.emit('highChurnRisk', { customerId, customer });

    this.logger.warn('High churn risk detected', { customerId });

    if (this.emailTransporter) {
      // Send retention email or trigger intervention
    }
  }

  async sendInactivityEmail(customerId, period) {
    this.emit('customerInactive', { customerId, period });

    if (this.emailTransporter) {
      // Send "We miss you" email
    }
  }

  // Analytics methods
  getCustomerSuccessMetrics() {
    const totalCustomers = this.customers.size;
    const activeCustomers = this.updateWeeklyActiveUsers();
    const averageSatisfaction = this.calculateAverageSatisfaction();
    const highRiskCustomers = Array.from(this.churnRisk.values())
      .filter(risk => risk.risk === 'high').length;

    return {
      totalCustomers,
      activeCustomers,
      averageSatisfaction,
      highRiskCustomers,
      churnRate: highRiskCustomers / totalCustomers,
      generatedAt: new Date()
    };
  }

  getCustomerSegments() {
    const segments = {
      new: 0,        // < 30 days
      established: 0, // 30-90 days
      loyal: 0,      // > 90 days
      highValue: 0,  // > 20 videos/month
      atRisk: 0      // High churn risk
    };

    const now = new Date();

    for (const [customerId, customer] of this.customers) {
      const daysSinceCreation = (now - customer.createdAt) / 86400000;

      if (daysSinceCreation < 30) segments.new++;
      else if (daysSinceCreation < 90) segments.established++;
      else segments.loyal++;

      if (customer.usage && customer.usage.videosPerMonth > 20) {
        segments.highValue++;
      }

      if (this.churnRisk.has(customerId)) {
        segments.atRisk++;
      }
    }

    return segments;
  }
}

export { CustomerSuccessTracker };