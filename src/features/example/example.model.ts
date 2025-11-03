import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Example document interface with instance methods
 */
export interface IExample extends Document {
  name: string;
  description?: string;
  userId: mongoose.Types.ObjectId;
  status: 'draft' | 'published' | 'archived';
  tags?: string[];
  metadata?: Record<string, any>;
  isPublic: boolean;
  publishedAt?: Date;
  viewCount: number;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  canEdit(userId: string): boolean;
  publish(): Promise<void>;
  archive(): Promise<void>;
  softDelete(): Promise<void>;
}

/**
 * Example model interface with static methods
 */
export interface IExampleModel extends Model<IExample> {
  findByUser(
    userId: string,
    options?: {
      status?: string;
      limit?: number;
      skip?: number;
      sort?: any;
    }
  ): Promise<IExample[]>;
  search(
    searchTerm: string,
    options?: {
      status?: string;
      isPublic?: boolean;
      limit?: number;
      skip?: number;
    }
  ): Promise<IExample[]>;
  getPopular(limit?: number): Promise<IExample[]>;
  incrementViewCount(id: string): Promise<void>;
  softDelete(id: string): Promise<boolean>;
  restore(id: string): Promise<boolean>;
}

/**
 * Example schema
 */
const exampleSchema = new Schema<IExample, IExampleModel>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedAt: {
      type: Date,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
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
        // Conditionally remove deletedAt from JSON output
        if ('deletedAt' in ret) {
          delete ret.deletedAt;
        }
        return ret;
      },
    },
  }
);

// Indexes
exampleSchema.index({ userId: 1, status: 1 });
exampleSchema.index({ tags: 1 });
exampleSchema.index({ createdAt: -1 });
exampleSchema.index({ publishedAt: -1 });
exampleSchema.index({ name: 'text', description: 'text' }); // Text search

// Virtual for checking if soft deleted
exampleSchema.virtual('isDeleted').get(function (this: IExample) {
  return this.deletedAt != null;
});

// Pre-save middleware
exampleSchema.pre('save', function (next) {
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Pre-find middleware to exclude soft deleted by default
exampleSchema.pre(/^find/, function (this: any) {
  // Check if includeDeleted option is set, otherwise filter out soft deleted
  const options = this.getOptions?.() || {};
  if (!options.includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// Static methods
exampleSchema.statics = {
  /**
   * Find examples by user
   */
  async findByUser(
    this: Model<IExample>,
    userId: string,
    options: {
      status?: string;
      limit?: number;
      skip?: number;
      sort?: any;
    } = {}
  ): Promise<IExample[]> {
    const query: any = { userId };
    
    if (options.status) {
      query.status = options.status;
    }

    return this.find(query)
      .sort(options.sort || { createdAt: -1 })
      .limit(options.limit || 20)
      .skip(options.skip || 0)
      .populate('userId', 'name email');
  },

  /**
   * Search examples
   */
  async search(
    this: Model<IExample>,
    searchTerm: string,
    options: {
      status?: string;
      isPublic?: boolean;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<IExample[]> {
    const query: any = {
      $text: { $search: searchTerm },
    };

    if (options.status) {
      query.status = options.status;
    }
    if (options.isPublic !== undefined) {
      query.isPublic = options.isPublic;
    }

    return this.find(query)
      .sort({ score: { $meta: 'textScore' } })
      .limit(options.limit || 20)
      .skip(options.skip || 0)
      .populate('userId', 'name email');
  },

  /**
   * Get popular examples
   */
  async getPopular(
    this: Model<IExample>,
    limit: number = 10
  ): Promise<IExample[]> {
    return this.find({
      status: 'published',
      isPublic: true,
    })
      .sort({ viewCount: -1, publishedAt: -1 })
      .limit(limit)
      .populate('userId', 'name email');
  },

  /**
   * Increment view count
   */
  async incrementViewCount(
    this: Model<IExample>,
    id: string
  ): Promise<void> {
    await this.updateOne(
      { _id: id },
      { $inc: { viewCount: 1 } }
    );
  },

  /**
   * Soft delete
   */
  async softDelete(
    this: Model<IExample>,
    id: string
  ): Promise<boolean> {
    const result = await this.updateOne(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() }
    );
    return result.modifiedCount > 0;
  },

  /**
   * Restore from soft delete
   */
  async restore(
    this: Model<IExample>,
    id: string
  ): Promise<boolean> {
    const result = await this.updateOne(
      { _id: id, deletedAt: { $ne: null } },
      { deletedAt: null }
    );
    return result.modifiedCount > 0;
  },
};

// Instance methods
exampleSchema.methods = {
  /**
   * Check if user can edit this example
   */
  canEdit(this: IExample, userId: string): boolean {
    return this.userId.toString() === userId;
  },

  /**
   * Publish example
   */
  async publish(this: IExample): Promise<void> {
    this.status = 'published';
    this.publishedAt = new Date();
    this.isPublic = true;
    await this.save();
  },

  /**
   * Archive example
   */
  async archive(this: IExample): Promise<void> {
    this.status = 'archived';
    this.isPublic = false;
    await this.save();
  },

  /**
   * Soft delete
   */
  async softDelete(this: IExample): Promise<void> {
    this.deletedAt = new Date();
    await this.save();
  },
};

// Prevent model overwrite error in development with hot reload
export const Example = (mongoose.models.Example || mongoose.model<IExample, IExampleModel>('Example', exampleSchema)) as IExampleModel;
