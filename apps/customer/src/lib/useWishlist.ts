'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { wishlistKeys } from '@/lib/query-keys';

/**
 * Shared wishlist state for accommodation pages. The portal layout already
 * guarantees a session exists before any (portal) page renders, so this
 * query can run unconditionally.
 */
export function useWishlist() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: wishlistKeys.list(),
    queryFn:  () => api.customer.getWishlist(),
  });

  const savedIds = useMemo(() => {
    const rows = (data as Record<string, unknown>[] | undefined) ?? [];
    return new Set(
      rows
        .map((row) => {
          const tenant = row['tenantId'];
          if (tenant && typeof tenant === 'object') return (tenant as Record<string, unknown>)['_id'] as string;
          return tenant as string | undefined;
        })
        .filter(Boolean) as string[]
    );
  }, [data]);

  const addMutation = useMutation({
    mutationFn: (tenantId: string) => api.customer.addToWishlist(tenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: wishlistKeys.list() }),
  });

  const removeMutation = useMutation({
    mutationFn: (tenantId: string) => api.customer.removeFromWishlist(tenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: wishlistKeys.list() }),
  });

  function isSaved(tenantId: string | undefined): boolean {
    return !!tenantId && savedIds.has(tenantId);
  }

  function toggle(tenantId: string | undefined): void {
    if (!tenantId) return;
    if (isSaved(tenantId)) {
      removeMutation.mutate(tenantId);
    } else {
      addMutation.mutate(tenantId);
    }
  }

  return { isSaved, toggle };
}
