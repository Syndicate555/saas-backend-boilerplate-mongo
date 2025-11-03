// TypeScript Audit Status: FIXED - All type errors resolved
import mongoose, { Document, Schema, Model } from 'mongoose';
import { AuditAction } from '../../../core/types';

/**
 * Audit log static methods interface
 */
export interface IAuditLogModel extends Model<IAuditLog> {
  log(data: {
    userId?: string;
    userEmail?: string;
    action: AuditAction | string;
    resource: string;
    resourceId?: string;
    metadata?: any;
    changes?: { before?: any; after?: any };
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    duration?: number;
    statusCode?: number;
    error?: Error;
  }): Promise<IAuditLog>;
  getUserLogs(
    userId: string,
    options?: {
      limit?: number;
      skip?: number;
      startDate?: Date;
      endDate?: Date;
      action?: string;
      resource?: string;
    }
  ): Promise<IAuditLog[]>;
  getResourceLogs(
    resource: string,
    resourceId: string,
    options?: {
      limit?: number;
      skip?: number;
    }
  ): Promise<IAuditLog[]>;
  getRecentErrors(options?: {
    limit?: number;
    since?: Date;
  }): Promise<IAuditLog[]>;
  getStats(startDate: Date, endDate: Date): Promise<any>;
  cleanup(daysToKeep?: number): Promise<number>;
}

/**
 * Audit log document interface
 */
export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  userEmail?: string;
  action: AuditAction | string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  changes?: {
    before?: any;
    after?: any;
  };
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  duration?: number;
  statusCode?: number;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  createdAt: Date;
}

/**
 * Audit log schema
 */
const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userEmail: {
      type: String,
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      index: true,
    },
    resource: {
      type: String,
      required: [true, 'Resource is required'],
      index: true,
    },
    resourceId: {
      type: String,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    changes: {
      before: Schema.Types.Mixed,
      after: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      index: true,
    },
    userAgent: String,
    requestId: {
      type: String,
      // Note: Index is defined below in schema.index() to avoid duplicate index warning
    },
    duration: Number, // in milliseconds
    statusCode: Number,
    error: {
      message: String,
      code: String,
      stack: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ requestId: 1 });

// TTL index to automatically delete old logs after 90 days
// Note: MongoDB doesn't support $ne in partial filter expressions, so we can't exclude critical logs here
// Instead, use the cleanup() static method to manually clean old logs while preserving critical ones
auditLogSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days
  }
);

// Static methods
/**
 * Create an audit log entry
 */
auditLogSchema.statics['log'] = async function (
  data: {
    userId?: string;
    userEmail?: string;
    action: AuditAction | string;
    resource: string;
    resourceId?: string;
    metadata?: any;
    changes?: { before?: any; after?: any };
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    duration?: number;
    statusCode?: number;
    error?: Error;
  }
): Promise<IAuditLog> {
  const logEntry = {
    ...data,
    error: data.error
      ? {
          message: data.error.message,
          code: (data.error as any).code,
          stack: data.error.stack,
        }
      : undefined,
  };

  return this.create(logEntry);
};

/**
 * Get logs for a specific user
 */
auditLogSchema.statics['getUserLogs'] = async function (
  userId: string,
  options: {
    limit?: number;
    skip?: number;
    startDate?: Date;
    endDate?: Date;
    action?: string;
    resource?: string;
  } = {}
): Promise<IAuditLog[]> {
  const query: any = { userId };

  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) query.createdAt.$gte = options.startDate;
    if (options.endDate) query.createdAt.$lte = options.endDate;
  }

  if (options.action) query.action = options.action;
  if (options.resource) query.resource = options.resource;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

/**
 * Get logs for a specific resource
 */
auditLogSchema.statics['getResourceLogs'] = async function (
  resource: string,
  resourceId: string,
  options: {
    limit?: number;
    skip?: number;
  } = {}
): Promise<IAuditLog[]> {
  return this.find({ resource, resourceId })
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0)
    .populate('userId', 'email name');
};

/**
 * Get recent errors
 */
auditLogSchema.statics['getRecentErrors'] = async function (
  options: {
    limit?: number;
    since?: Date;
  } = {}
): Promise<IAuditLog[]> {
  const query: any = { error: { $exists: true } };

  if (options.since) {
    query.createdAt = { $gte: options.since };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

/**
 * Get statistics for a time period
 */
auditLogSchema.statics['getStats'] = async function (
  startDate: Date,
  endDate: Date
): Promise<any> {
  const [
    totalLogs,
    actionStats,
    resourceStats,
    errorCount,
    avgDuration,
  ] = await Promise.all([
    // Total logs
    this.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    }),

    // Logs by action
    this.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),

    // Logs by resource
    this.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$resource',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),

    // Error count
    this.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      error: { $exists: true },
    }),

    // Average duration
    this.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          duration: { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' },
          minDuration: { $min: '$duration' },
          maxDuration: { $max: '$duration' },
        },
      },
    ]),
  ]);

  return {
    total: totalLogs,
    errors: errorCount,
    errorRate: totalLogs > 0 ? (errorCount / totalLogs) * 100 : 0,
    byAction: actionStats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {}),
    byResource: resourceStats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {}),
    performance: avgDuration[0] || {
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
    },
  };
};

/**
 * Clean up old logs (manual trigger)
 */
auditLogSchema.statics['cleanup'] = async function (
  daysToKeep: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    action: { $ne: 'critical' }, // Never delete critical logs
  });

  return result.deletedCount || 0;
};

// Prevent model overwrite error in development with hot reload
export const AuditLog = (mongoose.models['AuditLog'] || mongoose.model<IAuditLog, IAuditLogModel>('AuditLog', auditLogSchema)) as IAuditLogModel;
