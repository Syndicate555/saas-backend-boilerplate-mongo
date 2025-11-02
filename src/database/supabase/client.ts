import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../core/config/env';
import { logger } from '../../core/config/logger';

let supabase: SupabaseClient | null = null;

/**
 * Initialize Supabase client
 */
export function initializeSupabase(): SupabaseClient {
  if (env.DATABASE_TYPE !== 'supabase') {
    throw new Error('Supabase is not configured');
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase URL and anon key are required');
  }

  if (supabase) {
    return supabase;
  }

  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false, // We're using Clerk for auth
    },
    db: {
      schema: 'public',
    },
  });

  logger.info('Supabase client initialized');
  return supabase;
}

/**
 * Get Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    supabase = initializeSupabase();
  }
  return supabase;
}

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    
    // Try a simple query
    const { error } = await client
      .from('users')
      .select('count')
      .limit(1);

    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist (which is fine)
      logger.error('Supabase connection test failed:', error);
      return false;
    }

    logger.info('Supabase connection test successful');
    return true;
  } catch (error) {
    logger.error('Supabase connection test error:', error);
    return false;
  }
}

/**
 * Execute a query with error handling
 */
export async function executeQuery<T = any>(
  queryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>
): Promise<T> {
  const client = getSupabaseClient();
  const { data, error } = await queryFn(client);

  if (error) {
    logger.error('Supabase query error:', error);
    throw new Error(`Database query failed: ${error.message}`);
  }

  return data!;
}

/**
 * Transaction helper (Supabase doesn't have built-in transactions, so we use RPC)
 */
export async function withTransaction<T>(
  fn: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  const client = getSupabaseClient();
  
  // Note: Supabase doesn't have client-side transactions
  // You would need to create database functions for complex transactions
  // This is a simplified wrapper
  try {
    return await fn(client);
  } catch (error) {
    logger.error('Transaction error:', error);
    throw error;
  }
}

/**
 * Helper to build query filters
 */
export function buildFilters(filters: Record<string, any>): any {
  const query: any = {};
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    
    if (Array.isArray(value)) {
      query[`${key}.in`] = value;
    } else if (typeof value === 'object' && value.$gte) {
      query[`${key}.gte`] = value.$gte;
    } else if (typeof value === 'object' && value.$lte) {
      query[`${key}.lte`] = value.$lte;
    } else {
      query[`${key}.eq`] = value;
    }
  });
  
  return query;
}

/**
 * User repository for Supabase
 */
export const UserRepository = {
  async findById(id: string) {
    return executeQuery(async (client) =>
      client.from('users').select('*').eq('id', id).single()
    );
  },

  async findByClerkId(clerkId: string) {
    return executeQuery(async (client) =>
      client.from('users').select('*').eq('clerk_id', clerkId).single()
    );
  },

  async findByEmail(email: string) {
    return executeQuery(async (client) =>
      client.from('users').select('*').eq('email', email.toLowerCase()).single()
    );
  },

  async create(userData: any) {
    return executeQuery(async (client) =>
      client.from('users').insert(userData).select().single()
    );
  },

  async update(id: string, updates: any) {
    return executeQuery(async (client) =>
      client.from('users').update(updates).eq('id', id).select().single()
    );
  },

  async softDelete(id: string) {
    return executeQuery(async (client) =>
      client
        .from('users')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    );
  },

  async list(options: {
    limit?: number;
    offset?: number;
    filters?: Record<string, any>;
    orderBy?: string;
    order?: 'asc' | 'desc';
  } = {}) {
    const { limit = 20, offset = 0, filters = {}, orderBy = 'created_at', order = 'desc' } = options;
    
    let query = getSupabaseClient()
      .from('users')
      .select('*', { count: 'exact' });

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    // Apply ordering and pagination
    query = query
      .order(orderBy, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
    };
  },
};

/**
 * Audit log repository for Supabase
 */
export const AuditLogRepository = {
  async create(logData: any) {
    return executeQuery(async (client) =>
      client.from('audit_logs').insert(logData).select().single()
    );
  },

  async getUserLogs(userId: string, options: any = {}) {
    const { limit = 100, offset = 0 } = options;
    
    let query = getSupabaseClient()
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options.startDate) {
      query = query.gte('created_at', options.startDate);
    }
    if (options.endDate) {
      query = query.lte('created_at', options.endDate);
    }
    if (options.action) {
      query = query.eq('action', options.action);
    }
    if (options.resource) {
      query = query.eq('resource', options.resource);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    return data || [];
  },

  async getResourceLogs(resource: string, resourceId: string, options: any = {}) {
    const { limit = 100, offset = 0 } = options;
    
    const { data, error } = await getSupabaseClient()
      .from('audit_logs')
      .select('*')
      .eq('resource', resource)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    return data || [];
  },
};
