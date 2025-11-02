import { Request } from 'express';
import { PaginationParams, SortParams, FilterParams } from '../types/express';

/**
 * Default pagination values
 */
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
  minLimit: 1,
};

/**
 * Extract pagination parameters from request
 */
export function getPaginationParams(req: Request): PaginationParams {
  const page = Math.max(
    parseInt(req.query['page'] as string) || PAGINATION_DEFAULTS.page,
    1
  );

  const limit = Math.min(
    Math.max(
      parseInt(req.query['limit'] as string) || PAGINATION_DEFAULTS.limit,
      PAGINATION_DEFAULTS.minLimit
    ),
    PAGINATION_DEFAULTS.maxLimit
  );

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Extract sort parameters from request
 */
export function getSortParams(
  req: Request,
  defaultField: string = 'createdAt',
  defaultOrder: 'asc' | 'desc' = 'desc'
): SortParams {
  const field = (req.query['sortBy'] as string) || defaultField;
  const order = (req.query['order'] as 'asc' | 'desc') || defaultOrder;

  return { field, order };
}

/**
 * Extract filter parameters from request
 */
export function getFilterParams(
  req: Request,
  allowedFields: string[] = []
): FilterParams {
  const filters: FilterParams = {};

  // Extract specific filter fields from query
  allowedFields.forEach((field) => {
    if (req.query[field] !== undefined) {
      filters[field] = req.query[field];
    }
  });

  // Handle date range filters
  if (req.query['startDate'] || req.query['endDate']) {
    filters['dateRange'] = {};
    if (req.query['startDate']) {
      filters['dateRange']['$gte'] = new Date(req.query['startDate'] as string);
    }
    if (req.query['endDate']) {
      filters['dateRange']['$lte'] = new Date(req.query['endDate'] as string);
    }
  }

  // Handle search query
  if (req.query['search'] || req.query['q']) {
    filters['search'] = (req.query['search'] || req.query['q']) as string;
  }

  // Handle status filter (common pattern)
  if (req.query['status']) {
    filters['status'] = req.query['status'];
  }

  // Handle boolean filters
  ['active', 'published', 'featured'].forEach((field) => {
    if (req.query[field] !== undefined) {
      filters[field] = req.query[field] === 'true';
    }
  });

  return filters;
}

/**
 * Attach pagination middleware
 *
 * AUDIT: TypeScript compliance fix - prefixed unused res parameter with underscore
 */
export function attachPagination(req: Request, _res: any, next: any): void {
  req.pagination = getPaginationParams(req);
  next();
}

/**
 * Attach sort middleware
 *
 * AUDIT: TypeScript compliance fix - prefixed unused res parameter with underscore
 */
export function attachSort(
  defaultField: string = 'createdAt',
  defaultOrder: 'asc' | 'desc' = 'desc'
) {
  return (req: Request, _res: any, next: any): void => {
    req.sort = getSortParams(req, defaultField, defaultOrder);
    next();
  };
}

/**
 * Attach filters middleware
 *
 * AUDIT: TypeScript compliance fix - prefixed unused res parameter with underscore
 */
export function attachFilters(allowedFields: string[] = []) {
  return (req: Request, _res: any, next: any): void => {
    req.filters = getFilterParams(req, allowedFields);
    next();
  };
}

/**
 * Build MongoDB query from filters
 */
export function buildMongoQuery(filters: FilterParams): any {
  const query: any = {};

  Object.keys(filters).forEach((key) => {
    const value = filters[key];

    // Handle special cases
    if (key === 'search' && value) {
      // Text search
      query.$text = { $search: value };
    } else if (key === 'dateRange' && value) {
      // Date range
      query.createdAt = value;
    } else if (Array.isArray(value)) {
      // Array values (use $in operator)
      query[key] = { $in: value };
    } else if (typeof value === 'object' && value !== null) {
      // Object values (already formatted for MongoDB)
      query[key] = value;
    } else {
      // Simple values
      query[key] = value;
    }
  });

  // Remove undefined values
  Object.keys(query).forEach((key) => {
    if (query[key] === undefined) {
      delete query[key];
    }
  });

  return query;
}

/**
 * Build Supabase/PostgreSQL query from filters
 */
export function buildSupabaseQuery(filters: FilterParams): any {
  const conditions: string[] = [];
  const values: any[] = [];

  Object.keys(filters).forEach((key) => {
    const value = filters[key];

    if (key === 'search' && value) {
      // Full text search
      conditions.push(
        `to_tsvector('english', name || ' ' || description) @@ plainto_tsquery('english', $${values.length + 1})`
      );
      values.push(value);
    } else if (key === 'dateRange' && value) {
      // Date range
      if (value.$gte) {
        conditions.push(`created_at >= $${values.length + 1}`);
        values.push(value.$gte);
      }
      if (value.$lte) {
        conditions.push(`created_at <= $${values.length + 1}`);
        values.push(value.$lte);
      }
    } else if (Array.isArray(value)) {
      // Array values (use IN operator)
      conditions.push(`${key} = ANY($${values.length + 1})`);
      values.push(value);
    } else {
      // Simple values
      conditions.push(`${key} = $${values.length + 1}`);
      values.push(value);
    }
  });

  return {
    where: conditions.join(' AND '),
    values,
  };
}

/**
 * Calculate offset for pagination
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Calculate total pages
 */
export function calculateTotalPages(total: number, limit: number): number {
  return Math.ceil(total / limit);
}

/**
 * Generate pagination links
 */
export function generatePaginationLinks(
  baseUrl: string,
  page: number,
  totalPages: number,
  queryParams: any = {}
): {
  first?: string;
  prev?: string;
  next?: string;
  last?: string;
} {
  const links: any = {};
  const params = new URLSearchParams(queryParams);

  // First page
  if (page > 1) {
    params.set('page', '1');
    links.first = `${baseUrl}?${params.toString()}`;
  }

  // Previous page
  if (page > 1) {
    params.set('page', (page - 1).toString());
    links.prev = `${baseUrl}?${params.toString()}`;
  }

  // Next page
  if (page < totalPages) {
    params.set('page', (page + 1).toString());
    links.next = `${baseUrl}?${params.toString()}`;
  }

  // Last page
  if (page < totalPages) {
    params.set('page', totalPages.toString());
    links.last = `${baseUrl}?${params.toString()}`;
  }

  return links;
}
