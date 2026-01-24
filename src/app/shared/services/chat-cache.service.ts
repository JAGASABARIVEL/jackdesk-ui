import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, shareReplay, map, catchError, switchMap } from 'rxjs/operators';
import { UserManagerService } from './user-manager.service';
import { ChatManagerService } from './chat-manager.service';
import { ContactManagerService } from './contact-manager.service';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  totalCount?: number; // For paginated data
  observable?: Observable<T>;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxAge: number; // Maximum age before force refresh
}

interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next?: string;
  previous?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatDataCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  
  // Cache configurations
  private readonly cacheConfigs: Record<string, CacheConfig> = {
    users: { ttl: 5 * 60 * 1000, maxAge: 15 * 60 * 1000 },
    contacts: { ttl: 3 * 60 * 1000, maxAge: 10 * 60 * 1000 },
    conversations: { ttl: 30 * 1000, maxAge: 2 * 60 * 1000 },
    search: { ttl: 60 * 1000, maxAge: 3 * 60 * 1000 } // Cache search results
  };

  // Invalidation broadcasts
  private invalidationSubject = new BehaviorSubject<{ key: string; reason: string } | null>(null);
  public invalidation$ = this.invalidationSubject.asObservable();

  constructor() {
    console.debug('🚀 ChatDataCacheService initialized with pagination support');
  }

  /**
   * Get cached data or fetch from source
   */
  get<T>(
    key: string,
    fetchFn: () => Observable<T>,
    options?: { 
      forceRefresh?: boolean; 
      cacheType?: keyof typeof this.cacheConfigs;
    }
  ): Observable<T> {
    const config = options?.cacheType 
      ? this.cacheConfigs[options.cacheType as keyof typeof this.cacheConfigs]
      : this.cacheConfigs['conversations'];

    const cached = this.cache.get(key);
    const now = Date.now();

    // Check if we should use cache
    if (
      !options?.forceRefresh &&
      cached &&
      (now - cached.timestamp) < config.ttl
    ) {
      console.debug(`✅ Cache HIT: ${key} (age: ${Math.round((now - cached.timestamp) / 1000)}s)`);
      return of(cached.data);
    }

    // Check if data is too old
    if (cached && (now - cached.timestamp) > config.maxAge) {
      console.debug(`⚠️ Cache EXPIRED: ${key}`);
      this.invalidate(key, 'expired');
    }

    // Check for ongoing request
    if (cached?.observable) {
      console.debug(`🔄 Cache PENDING: ${key}`);
      return cached.observable;
    }

    console.debug(`❌ Cache MISS: ${key}`);

    // Create shared observable
    const observable = fetchFn().pipe(
      tap(data => {
        this.set(key, data);
        console.debug(`💾 Cache SET: ${key}`);
      }),
      shareReplay(1)
    );

    // Store temporarily
    this.cache.set(key, {
      data: cached?.data,
      timestamp: cached?.timestamp || now,
      observable
    });

    return observable;
  }

  /**
   * Get paginated data with caching
   */
  getPaginated<T>(
    baseKey: string,
    page: number,
    pageSize: number,
    fetchFn: () => Observable<PaginatedResponse<T>>,
    options?: {
      forceRefresh?: boolean;
      cacheType?: keyof typeof this.cacheConfigs;
    }
  ): Observable<PaginatedResponse<T>> {
    const key = `${baseKey}:p${page}:s${pageSize}`;
    return this.get(key, fetchFn, options);
  }

  /**
   * Get search results with caching
   */
  getSearchResults<T>(
    baseKey: string,
    searchQuery: string,
    page: number,
    pageSize: number,
    fetchFn: () => Observable<PaginatedResponse<T>>,
    options?: { forceRefresh?: boolean }
  ): Observable<PaginatedResponse<T>> {
    // Normalize search query for consistent cache keys
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const key = `${baseKey}:search:${normalizedQuery}:p${page}:s${pageSize}`;
    
    return this.get(key, fetchFn, { 
      ...options, 
      cacheType: 'search' 
    });
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      observable: undefined
    });
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string, reason: string = 'manual'): void {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.debug(`🗑️ Cache INVALIDATED: ${key} (${reason})`);
      this.invalidationSubject.next({ key, reason });
    }
  }

  /**
   * Invalidate by pattern
   */
  invalidatePattern(pattern: RegExp, reason: string = 'manual'): void {
    let count = 0;
    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    });
    if (count > 0) {
      console.debug(`🗑️ Cache INVALIDATED: ${count} entries matching ${pattern} (${reason})`);
    }
  }

  /**
   * Invalidate all pagination caches for a base key
   */
  invalidatePagination(baseKey: string, reason: string = 'data_changed'): void {
    this.invalidatePattern(new RegExp(`^${baseKey}:p\\d+:s\\d+$`), reason);
  }

  /**
   * Invalidate all search caches for a base key
   */
  invalidateSearches(baseKey: string, reason: string = 'data_changed'): void {
    this.invalidatePattern(new RegExp(`^${baseKey}:search:`), reason);
  }

  /**
   * Clear all caches
   */
  invalidateAll(reason: string = 'manual'): void {
    const size = this.cache.size;
    this.cache.clear();
    console.debug(`🗑️ Cache CLEARED: ${size} entries (${reason})`);
    this.invalidationSubject.next({ key: '*', reason });
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: Array<{ key: string; age: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Math.round((now - entry.timestamp) / 1000)
    }));

    return { size: this.cache.size, entries };
  }
}

// ============================================================================
// WRAPPER SERVICE WITH PAGINATION SUPPORT
// ============================================================================

@Injectable({
  providedIn: 'root'
})
export class CachedChatDataService {
  constructor(
    private cache: ChatDataCacheService,
    private contactService: ContactManagerService,
    private conversationService: ChatManagerService,
    private userManagerService: UserManagerService
  ) {
    console.debug('🚀 CachedChatDataService initialized with pagination');
  }

  // ========== USERS ==========

  getUsers(forceRefresh = false): Observable<any[]> {
    return this.cache.get(
      'users:list',
      () => this.userManagerService.list_users(),
      { forceRefresh, cacheType: 'users' }
    );
  }

  // ========== CONTACTS WITH PAGINATION ==========

  /**
   * Get contacts with pagination and caching
   */
  getContactsPaginated(
    page: number = 1,
    pageSize: number = 50,
    forceRefresh = false
  ): Observable<PaginatedResponse<any>> {
    return this.cache.getPaginated(
      'contacts',
      page,
      pageSize,
      () => this.contactService.list_contact(page, pageSize),
      { forceRefresh, cacheType: 'contacts' }
    );
  }

  /**
   * Search contacts with server-side search and caching
   */
  searchContacts(
    searchQuery: string,
    page: number = 1,
    pageSize: number = 50,
    forceRefresh = false
  ): Observable<PaginatedResponse<any>> {
    return this.cache.getSearchResults(
      'contacts',
      searchQuery,
      page,
      pageSize,
      () => this.contactService.list_contact(page, pageSize, searchQuery),
      { forceRefresh }
    );
  }

  /**
   * Get all contacts (for backward compatibility)
   * Uses pagination internally but returns all results
   */
  getAllContacts(forceRefresh = false): Observable<any[]> {
    return this.cache.get(
      'contacts:all',
      () => this.loadAllContactsRecursively(),
      { forceRefresh, cacheType: 'contacts' }
    );
  }

  private loadAllContactsRecursively(page = 1, pageSize = 100, accumulated: any[] = []): Observable<any[]> {
    return this.contactService.list_contact(page, pageSize).pipe(
      switchMap(response => {
        const allResults = [...accumulated, ...response.results];
        const totalRecords = response.count ?? response.results.length;

        // Check if we need more pages
        if (allResults.length < totalRecords) {
          // Recursively load next page
          return this.loadAllContactsRecursively(page + 1, pageSize, allResults);
        }

        return of(allResults);
      }),
      catchError(err => {
        console.error('Error loading contacts recursively:', err);
        // Return what we have so far
        return of(accumulated);
      })
    );
  }

  // ========== CONVERSATIONS WITH PAGINATION ==========

  /**
   * Get user's active conversations with pagination
   */
  getActiveConversationsForUserPaginated(
    platform: string,
    page: number = 1,
    pageSize: number = 20,
    forceRefresh = false
  ): Observable<PaginatedResponse<any>> {
    return this.cache.getPaginated(
      `conversations:active-user:${platform}`,
      page,
      pageSize,
      () => this.conversationService.list_active_coversations_for_user(platform, page, pageSize),
      { forceRefresh, cacheType: 'conversations' }
    );
  }

  /**
   * Get org conversations with pagination
   */
  getActiveConversationsForOrgPaginated(
    platform: string,
    page: number = 1,
    pageSize: number = 20,
    forceRefresh = false
  ): Observable<PaginatedResponse<any>> {
    return this.cache.getPaginated(
      `conversations:active-org:${platform}`,
      page,
      pageSize,
      () => this.conversationService.list_new_active_conversations(platform, page, pageSize),
      { forceRefresh, cacheType: 'conversations' }
    );
  }

  /**
   * Search conversations (server-side search)
   */
  searchConversations(
    platform: string,
    searchQuery: string,
    page: number = 1,
    pageSize: number = 20,
    forceRefresh = false
  ): Observable<PaginatedResponse<any>> {
    return this.cache.getSearchResults(
      `conversations:${platform}`,
      searchQuery,
      page,
      pageSize,
      () => this.conversationService.search_conversations(platform, searchQuery, page, pageSize),
      { forceRefresh }
    );
  }

  /**
   * Get specific conversation
   */
  getConversation(
    platform: string,
    id: number,
    forceRefresh = false
  ): Observable<any> {
    return this.cache.get(
      `conversation:${platform}:${id}`,
      () => this.conversationService.list_conversation_from_id(platform, id),
      { forceRefresh, cacheType: 'conversations' }
    );
  }

  // ========== CACHE INVALIDATION ==========

  invalidateContacts(reason: string = 'data_changed'): void {
    this.cache.invalidatePattern(/^contacts:/, reason);
  }

  invalidateConversations(platform?: string, reason: string = 'data_changed'): void {
    if (platform) {
      this.cache.invalidatePattern(new RegExp(`^conversations:.*:${platform}`), reason);
    } else {
      this.cache.invalidatePattern(/^conversations:/, reason);
    }
  }

  invalidateConversation(id: number, platform?: string, reason: string = 'updated'): void {
    if (platform) {
      this.cache.invalidate(`conversation:${platform}:${id}`, reason);
    }
    this.cache.invalidatePattern(new RegExp(`conversation:.*:${id}`), reason);
  }

  // ========== BACKWARD COMPATIBILITY (deprecated - use paginated versions) ==========

  /**
   * @deprecated Use getActiveConversationsForUserPaginated instead
   */
  getActiveConversationsForUser(platform: string, forceRefresh = false): Observable<any[]> {
    return this.getActiveConversationsForUserPaginated(platform, 1, 100, forceRefresh).pipe(
      map(response => response.results)
    );
  }

  /**
   * @deprecated Use getActiveConversationsForOrgPaginated instead
   */
  getActiveConversationsForOrg(platform: string, forceRefresh = false): Observable<any[]> {
    return this.getActiveConversationsForOrgPaginated(platform, 1, 100, forceRefresh).pipe(
      map(response => response.results)
    );
  }

  /**
   * @deprecated Use getContactsPaginated instead
   */
  getContacts(forceRefresh = false): Observable<any[]> {
    return this.getContactsPaginated(1, 100, forceRefresh).pipe(
      map(response => response.results)
    );
  }

  // ========== STATS ==========

  getCacheStats() {
    return this.cache.getStats();
  }
}