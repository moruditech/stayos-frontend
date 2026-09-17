'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError, MenuCategory, MenuItem, Outlet } from '@stayos/api-client';
import { PERMISSIONS, PLAN_FEATURES } from '@stayos/constants';
import {
  RoleGate,
  PlanGate,
  Modal,
  ConfirmDialog,
  SkeletonLoader,
  EmptyState,
  InlineError,
  useToast,
  applyServerErrors,
  Icons,
} from '@stayos/ui';
import { outletKeys, menuKeys } from '@/lib/query-keys';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
});
type CategoryFormValues = z.infer<typeof categorySchema>;

export default function MenuPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.POS_MENU_MANAGE}
      fallback={<EmptyState title="You don't have access to menu management" />}
    >
      <PlanGate feature={PLAN_FEATURES.RESTAURANT_MODULE}>
        <Suspense fallback={<></>}>
          <MenuPageContent />
        </Suspense>
      </PlanGate>
    </RoleGate>
  );
}

function MenuPageContent(): React.ReactElement {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const outletIdParam = searchParams.get('outletId');

  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<MenuCategory | null>(null);

  const { data: outletsData, isLoading: outletsLoading } = useQuery({
    queryKey: outletKeys.list(),
    queryFn: () => api.restaurantOutlets.list({ isActive: true, limit: 100 }),
    staleTime: 60_000,
  });
  const outlets = outletsData?.data ?? [];
  const selectedOutletId = outletIdParam || outlets[0]?._id || '';

  const changeOutlet = (id: string) => {
    router.push(`/restaurant/menu?outletId=${id}`);
  };

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: menuKeys.categories(selectedOutletId),
    queryFn: () => api.restaurantMenu.listCategories(selectedOutletId),
    enabled: !!selectedOutletId,
  });
  const categories = categoriesData?.data ?? [];

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: menuKeys.items(selectedOutletId),
    queryFn: () => api.restaurantMenu.listItems(selectedOutletId, { limit: 500 }),
    enabled: !!selectedOutletId,
  });
  const items = itemsData?.data ?? [];

  const categoryForm = useForm<CategoryFormValues>({ resolver: zodResolver(categorySchema) });

  const openEditCategory = (cat: MenuCategory) => {
    categoryForm.reset({ name: cat.name });
    setEditingCategory(cat);
  };

  const createCategoryMutation = useMutation({
    mutationFn: (values: CategoryFormValues) =>
      api.restaurantMenu.createCategory({ outletId: selectedOutletId, name: values.name, sortOrder: categories.length }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.categories(selectedOutletId) });
      setShowNewCategory(false);
      categoryForm.reset();
      toast('Category added.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(categoryForm, err);
      else toast(err.message ?? 'Failed to add category.', 'error');
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (values: CategoryFormValues) => api.restaurantMenu.updateCategory(editingCategory!._id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.categories(selectedOutletId) });
      setEditingCategory(null);
      toast('Category updated.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(categoryForm, err);
      else toast(err.message ?? 'Failed to update category.', 'error');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.restaurantMenu.removeCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.categories(selectedOutletId) });
      setDeletingCategory(null);
      toast('Category deactivated.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to deactivate category.', 'error'),
  });

  // Simple up/down reordering — swaps sortOrder with the adjacent category.
  // A full drag-and-drop reorder is reserved for the Table Map's floor plan,
  // where position is spatial rather than a simple linear order.
  const moveCategory = (cat: MenuCategory, direction: -1 | 1) => {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((c) => c._id === cat._id);
    const swapWith = sorted[index + direction];
    if (!swapWith) return;
    Promise.all([
      api.restaurantMenu.updateCategory(cat._id, { sortOrder: swapWith.sortOrder }),
      api.restaurantMenu.updateCategory(swapWith._id, { sortOrder: cat.sortOrder }),
    ])
      .then(() => queryClient.invalidateQueries({ queryKey: menuKeys.categories(selectedOutletId) }))
      .catch(() => toast('Failed to reorder categories.', 'error'));
  };

  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      api.restaurantMenu.toggleAvailability(id, isAvailable),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: menuKeys.items(selectedOutletId) }),
    onError: (err: ApiError) => toast(err.message ?? 'Failed to update availability.', 'error'),
  });

  const itemsByCategory = (categoryId: string): MenuItem[] =>
    items
      .filter((item) => {
        const catId = typeof item.categoryId === 'string' ? item.categoryId : item.categoryId._id;
        return catId === categoryId;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const isLoading = outletsLoading || categoriesLoading || itemsLoading;

  return (
    <div data-page="restaurant-menu">
      <div data-page-header>
        <div>
          <h1>Menu &amp; Recipes</h1>
        </div>
        {selectedOutletId && (
          <Link href={`/restaurant/menu/new?outletId=${selectedOutletId}`} data-btn-primary>
            + New item
          </Link>
        )}
      </div>

      {outletsLoading ? (
        <SkeletonLoader rows={1} />
      ) : outlets.length === 0 ? (
        <EmptyState
          title="No outlets yet"
          description="Create an outlet before building its menu."
          action={<Link href="/restaurant/outlets" data-btn-primary>Go to Outlets</Link>}
        />
      ) : (
        <>
          <div data-form-group>
            <label>Outlet</label>
            <select value={selectedOutletId} onChange={(e) => changeOutlet(e.target.value)}>
              {outlets.map((outlet: Outlet) => (
                <option key={outlet._id} value={outlet._id}>{outlet.name}</option>
              ))}
            </select>
          </div>

          <div data-page-header>
            <h2>Categories</h2>
            <button type="button" data-btn-secondary onClick={() => { categoryForm.reset({ name: '' }); setShowNewCategory(true); }}>
              + New category
            </button>
          </div>

          {isLoading ? (
            <SkeletonLoader rows={4} />
          ) : categories.length === 0 ? (
            <EmptyState
              title="No categories yet"
              description="Add a category (e.g. Starters, Mains, Drinks) before adding items."
              action={<button type="button" data-btn-primary onClick={() => setShowNewCategory(true)}>Add first category</button>}
            />
          ) : (
            categories
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((cat, index) => (
                <div key={cat._id} data-panel>
                  <div data-panel-header>
                    <h3>{cat.name}</h3>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button type="button" data-btn-ghost data-btn-sm onClick={() => moveCategory(cat, -1)} disabled={index === 0} aria-label="Move up">
                        <Icons.ChevronLeft style={{ transform: 'rotate(90deg)' }} size={16} />
                      </button>
                      <button type="button" data-btn-ghost data-btn-sm onClick={() => moveCategory(cat, 1)} disabled={index === categories.length - 1} aria-label="Move down">
                        <Icons.ChevronLeft style={{ transform: 'rotate(-90deg)' }} size={16} />
                      </button>
                      <button type="button" data-btn-ghost data-btn-sm onClick={() => openEditCategory(cat)}>Rename</button>
                      <button type="button" data-btn-ghost data-btn-sm onClick={() => setDeletingCategory(cat)}>Deactivate</button>
                    </div>
                  </div>

                  <div data-panel-body data-tight="true">
                    {itemsByCategory(cat._id).length === 0 ? (
                      <p data-field-hint>No items in this category yet.</p>
                    ) : (
                      <table data-table>
                        <thead>
                          <tr><th>Name</th><th>Price</th><th>Station</th><th>Available</th><th></th></tr>
                        </thead>
                        <tbody>
                          {itemsByCategory(cat._id).map((item) => (
                            <tr key={item._id}>
                              <td><Link href={`/restaurant/menu/${item._id}`} data-link>{item.name}</Link></td>
                              <td>R{item.price.toFixed(2)}</td>
                              <td>{item.station}</td>
                              <td>
                                <label data-checkbox-label>
                                  <input
                                    type="checkbox"
                                    checked={item.isAvailable}
                                    onChange={(e) => toggleAvailabilityMutation.mutate({ id: item._id, isAvailable: e.target.checked })}
                                  />
                                </label>
                              </td>
                              <td><Link href={`/restaurant/menu/${item._id}`} data-btn-ghost data-btn-sm>Edit</Link></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ))
          )}
        </>
      )}

      <Modal open={showNewCategory} onClose={() => setShowNewCategory(false)} title="New category">
        <form onSubmit={categoryForm.handleSubmit((v) => createCategoryMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label>Name</label>
            <input type="text" placeholder="e.g. Starters" {...categoryForm.register('name')} />
            <InlineError message={categoryForm.formState.errors.name?.message} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNewCategory(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createCategoryMutation.isPending}>
              {createCategoryMutation.isPending ? 'Adding…' : 'Add category'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingCategory} onClose={() => setEditingCategory(null)} title="Rename category">
        <form onSubmit={categoryForm.handleSubmit((v) => updateCategoryMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label>Name</label>
            <input type="text" {...categoryForm.register('name')} />
            <InlineError message={categoryForm.formState.errors.name?.message} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setEditingCategory(null)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={updateCategoryMutation.isPending}>
              {updateCategoryMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deletingCategory}
        title="Deactivate category?"
        message={`"${deletingCategory?.name}" will be hidden from the menu. Items in it are kept but should be moved to another category.`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={() => deletingCategory && deleteCategoryMutation.mutate(deletingCategory._id)}
        onCancel={() => setDeletingCategory(null)}
      />
    </div>
  );
}
