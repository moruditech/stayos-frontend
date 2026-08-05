// Public portal: mostly SSR/SSG, but some client-side queries (e.g. search)
// use React Query for cache. All anonymous — no session dependencies.
export const discoveryKeys = {
  search: (params?: Record<string, unknown>) => ['discovery', 'search', params ?? {}] as const,
  featured: () => ['discovery', 'featured'] as const,
  propertyDetail: (slug: string) => ['discovery', 'property', slug] as const,
  rooms: (slug: string) => ['discovery', 'rooms', slug] as const,
  reviews: (slug: string, page?: number) => ['discovery', 'reviews', slug, page ?? 1] as const,
  cities: (q: string) => ['discovery', 'cities', q] as const,
};
