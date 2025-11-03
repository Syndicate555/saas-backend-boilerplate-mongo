// TypeScript Audit Status: FIXED - All type errors resolved
import mongoose, { Document, Schema, Model } from 'mongoose';
import { UserRole, SubscriptionStatus } from '../../../core/types';

/**
 * User static methods interface
 */
export interface IUserModel extends Model<IUser> {
  findByClerkId(clerkId: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  findByStripeCustomerId(stripeCustomerId: string): Promise<IUser | null>;
  findOrCreateFromClerk(clerkData: {
    clerkId: string;
    email: string;
    name?: string;
    emailVerified?: boolean;
    profileImage?: string;
  }): Promise<IUser>;
  softDelete(userId: string): Promise<boolean>;
  restore(userId: string): Promise<boolean>;
  getStats(): Promise<any>;
}

/**
 * User document interface
 */
export interface IUser extends Document {
  clerkId: string;
  email: string;
  name?: string;
  role: UserRole;
  subscription: SubscriptionStatus;
  stripeCustomerId?: string;
  metadata?: Record<string, any>;
  lastLoginAt?: Date;
  emailVerified: boolean;
  profileImage?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Virtual properties
  isDeleted: boolean;
  isActive: boolean;
  isPro: boolean;
  isAdmin: boolean;

  // Instance methods
  updateLastLogin(): Promise<void>;
  updateSubscription(
    subscription: SubscriptionStatus,
    stripeCustomerId?: string
  ): Promise<void>;
  hasPermission(permission: string): boolean;
  softDelete(): Promise<void>;
  restore(): Promise<void>;
}

/**
 * User schema
 */
const userSchema = new Schema<IUser>(
  {
    clerkId: {
      type: String,
      required: [true, 'Clerk ID is required'],
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
      index: true,
    },
    subscription: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.FREE,
      index: true,
    },
    stripeCustomerId: {
      type: String,
      unique: true,
      sparse: true, // Allow null values
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    lastLoginAt: {
      type: Date,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
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
userSchema.index({ email: 1, deletedAt: 1 });
userSchema.index({ clerkId: 1, deletedAt: 1 });
userSchema.index({ role: 1, subscription: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLoginAt: -1 });

// Virtual properties
userSchema.virtual('isDeleted').get(function (this: IUser) {
  return this.deletedAt != null;
});

userSchema.virtual('isActive').get(function (this: IUser) {
  return !this.isDeleted && this.emailVerified;
});

userSchema.virtual('isPro').get(function (this: IUser) {
  return [SubscriptionStatus.PRO, SubscriptionStatus.ENTERPRISE].includes(
    this.subscription
  );
});

userSchema.virtual('isAdmin').get(function (this: IUser) {
  return this.role === UserRole.ADMIN;
});

// Static methods
/**
 * Find user by Clerk ID
 */
userSchema.statics['findByClerkId'] = async function (
  clerkId: string
): Promise<IUser | null> {
  return this.findOne({ clerkId, deletedAt: null });
};

/**
 * Find user by email
 */
userSchema.statics['findByEmail'] = async function (
  email: string
): Promise<IUser | null> {
  return this.findOne({
    email: email.toLowerCase(),
    deletedAt: null,
  });
};

/**
 * Find user by Stripe customer ID
 */
userSchema.statics['findByStripeCustomerId'] = async function (
  stripeCustomerId: string
): Promise<IUser | null> {
  return this.findOne({ stripeCustomerId, deletedAt: null });
};

/**
 * Find or create user from Clerk data
 */
userSchema.statics['findOrCreateFromClerk'] = async function (clerkData: {
  clerkId: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
  profileImage?: string;
}): Promise<IUser> {
  let user = await (this as any).findByClerkId(clerkData.clerkId);

  if (!user) {
    user = await this.create({
      clerkId: clerkData.clerkId,
      email: clerkData.email.toLowerCase(),
      name: clerkData.name,
      emailVerified: clerkData.emailVerified || false,
      profileImage: clerkData.profileImage,
    });
  } else {
    // Update user data if it changed
    user.email = clerkData.email.toLowerCase();
    if (clerkData.name) user.name = clerkData.name;
    if (clerkData.emailVerified !== undefined) {
      user.emailVerified = clerkData.emailVerified;
    }
    if (clerkData.profileImage) user.profileImage = clerkData.profileImage;
    await user.save();
  }

  return user;
};

/**
 * Soft delete user
 */
userSchema.statics['softDelete'] = async function (
  userId: string
): Promise<boolean> {
  const result = await this.updateOne(
    { _id: userId, deletedAt: null },
    { deletedAt: new Date() }
  );
  return result.modifiedCount > 0;
};

/**
 * Restore soft deleted user
 */
userSchema.statics['restore'] = async function (
  userId: string
): Promise<boolean> {
  const result = await this.updateOne(
    { _id: userId, deletedAt: { $ne: null } },
    { deletedAt: null }
  );
  return result.modifiedCount > 0;
};

/**
 * Get user statistics
 */
userSchema.statics['getStats'] = async function (): Promise<any> {
  const [totalUsers, activeUsers, deletedUsers, subscriptionStats, roleStats] =
    await Promise.all([
      this.countDocuments({ deletedAt: null }),
      this.countDocuments({ deletedAt: null, emailVerified: true }),
      this.countDocuments({ deletedAt: { $ne: null } }),
      this.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$subscription', count: { $sum: 1 } } },
      ]),
      this.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
    ]);

  return {
    total: totalUsers,
    active: activeUsers,
    deleted: deletedUsers,
    bySubscription: subscriptionStats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {}),
    byRole: roleStats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {}),
  };
};

// Instance methods
userSchema.methods = {
  /**
   * Update last login timestamp
   */
  async updateLastLogin(this: IUser): Promise<void> {
    this.lastLoginAt = new Date();
    await this.save();
  },

  /**
   * Update subscription
   */
  async updateSubscription(
    this: IUser,
    subscription: SubscriptionStatus,
    stripeCustomerId?: string
  ): Promise<void> {
    this.subscription = subscription;
    if (stripeCustomerId) {
      this.stripeCustomerId = stripeCustomerId;
    }
    await this.save();
  },

  /**
   * Check if user has permission
   */
  hasPermission(this: IUser, permission: string): boolean {
    // Admin has all permissions
    if (this.role === UserRole.ADMIN) return true;

    // Add more permission logic here based on your requirements
    // This is a simplified example
    const rolePermissions: Record<string, string[]> = {
      [UserRole.USER]: ['read:own', 'update:own'],
      [UserRole.MODERATOR]: ['read:all', 'update:own', 'delete:flagged'],
      [UserRole.ADMIN]: ['*'],
    };

    const permissions = rolePermissions[this.role] || [];
    return permissions.includes(permission) || permissions.includes('*');
  },

  /**
   * Soft delete
   */
  async softDelete(this: IUser): Promise<void> {
    this.deletedAt = new Date();
    await this.save();
  },

  /**
   * Restore from soft delete
   */
  async restore(this: IUser): Promise<void> {
    this.deletedAt = null as any;
    await this.save();
  },
};

// Middleware
userSchema.pre('save', function (next) {
  // Ensure email is lowercase
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});

// Exclude soft deleted records by default
userSchema.pre(/^find/, function (this: any) {
  // Only apply if not explicitly looking for deleted records
  const options = this.getOptions() as any;
  if (!options?.includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// Prevent model overwrite error in development with hot reload
export const User = (mongoose.models['User'] ||
  mongoose.model<IUser, IUserModel>('User', userSchema)) as IUserModel;
