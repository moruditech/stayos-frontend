'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { PERMISSIONS, PLAN_FEATURES } from '@stayos/constants';
import { RoleGate, PlanGate, EmptyState, InlineError, useToast, applyServerErrors, SkeletonLoader, ConfirmDialog } from '@stayos/ui';
import { menuKeys } from '@/lib/query-keys';
import {
  menuItemFormResolver,
  MENU_ITEM_DEFAULT_VALUES,
  ModifierGroupsEditor,
  RecipeEditor,
  CategorySelect,
  type MenuItemFormValues,
} from '../_components/MenuItemForm';

export default function MenuItemDetailPage({ params }: { params: { itemId: string } }): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.POS_MENU_MANAGE}
      fallback={<EmptyState title="You don't have access to menu management" />}
    >
      <PlanGate feature={PLAN_FEATURES.RESTAURANT_MODULE}>
        <MenuItemDetailContent itemId={params.itemId} />
      </PlanGate>
    </RoleGate>
  );
}

function MenuItemDetailContent({ itemId }: { itemId: string }): React.ReactElement {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: item, isLoading } = useQuery({
    queryKey: menuKeys.itemDetail(itemId),
    queryFn: () => api.restaurantMenu.getItem(itemId),
  });

  const outletId = item ? (typeof item.outletId === 'string' ? item.outletId : '') : '';

  const { data: categoriesData } = useQuery({
    queryKey: menuKeys.categories(outletId),
    queryFn: () => api.restaurantMenu.listCategories(outletId),
    enabled: !!outletId,
  });
  const categories = categoriesData?.data ?? [];

  const form = useForm<MenuItemFormValues>({
    resolver: menuItemFormResolver(),
    defaultValues: MENU_ITEM_DEFAULT_VALUES,
  });

  // Populate the form once the item has loaded — a plain reset() call rather
  // than defaultValues, since the query resolves after the initial render.
  useEffect(() => {
    if (!item) return;
    form.reset({
      categoryId: typeof item.categoryId === 'string' ? item.categoryId : item.categoryId._id,
      name: item.name,
      description: item.description ?? '',
      imageUrl: item.imageUrl ?? '',
      price: item.price,
      vatApplicable: item.vatApplicable,
      station: item.station,
      isAvailable: item.isAvailable,
      modifierGroups: item.modifierGroups,
      recipe: item.recipe,
    });
  }, [item]);

  const updateMutation = useMutation({
    mutationFn: (values: MenuItemFormValues) =>
      api.restaurantMenu.updateItem(itemId, {
        categoryId: values.categoryId,
        name: values.name,
        price: values.price,
        vatApplicable: values.vatApplicable,
        station: values.station,
        isAvailable: values.isAvailable,
        modifierGroups: values.modifierGroups,
        recipe: values.recipe,
        ...(values.description ? { description: values.description } : {}),
        ...(values.imageUrl ? { imageUrl: values.imageUrl } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.itemDetail(itemId) });
      void queryClient.invalidateQueries({ queryKey: menuKeys.items(outletId) });
      toast('Menu item updated.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else toast(err.message ?? 'Failed to update menu item.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.restaurantMenu.removeItem(itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.items(outletId) });
      toast('Menu item deleted.', 'success');
      router.push(`/restaurant/menu?outletId=${outletId}`);
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to delete menu item.', 'error'),
  });

  if (isLoading) return <SkeletonLoader rows={6} />;
  if (!item) return <EmptyState title="Menu item not found" />;

  return (
    <div data-page="restaurant-menu-item-detail">
      <div data-page-header>
        <h1>{item.name}</h1>
        <button type="button" data-btn-ghost onClick={() => setShowDeleteConfirm(true)}>
          Delete item
        </button>
      </div>

      <form onSubmit={form.handleSubmit((v) => updateMutation.mutate(v))} noValidate data-form>
        <div data-form-row>
          <div data-form-group>
            <label>Name</label>
            <input type="text" {...form.register('name')} />
            <InlineError message={form.formState.errors.name?.message} />
          </div>
          <div data-form-group>
            <label>Category</label>
            <CategorySelect register={form.register} categories={categories} />
            <InlineError message={form.formState.errors.categoryId?.message} />
          </div>
        </div>

        <div data-form-group>
          <label>Description</label>
          <textarea rows={2} {...form.register('description')} />
        </div>

        <div data-form-row>
          <div data-form-group>
            <label>Price (excl. VAT)</label>
            <input type="number" step={0.01} min={0} {...form.register('price')} />
            <InlineError message={form.formState.errors.price?.message} />
          </div>
          <div data-form-group>
            <label>Station</label>
            <select {...form.register('station')}>
              <option value="kitchen">Kitchen</option>
              <option value="bar">Bar</option>
            </select>
          </div>
        </div>

        <div data-form-group>
          <label>Image URL</label>
          <input type="text" placeholder="https://…" {...form.register('imageUrl')} />
          <InlineError message={form.formState.errors.imageUrl?.message} />
        </div>

        <div data-form-group data-checkbox-group>
          <label data-checkbox-label>
            <input type="checkbox" {...form.register('vatApplicable')} />
            VAT applicable
          </label>
          <label data-checkbox-label>
            <input type="checkbox" {...form.register('isAvailable')} />
            Available for ordering
          </label>
        </div>

        <h3 data-section-heading>Modifier groups</h3>
        <ModifierGroupsEditor control={form.control} register={form.register} />

        <h3 data-section-heading>Recipe</h3>
        <RecipeEditor control={form.control} register={form.register} setValue={form.setValue} />

        <div data-form-actions>
          <button type="button" data-btn-ghost onClick={() => router.push(`/restaurant/menu?outletId=${outletId}`)}>
            Back to menu
          </button>
          <button type="submit" data-btn-primary disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete menu item?"
        message={`"${item.name}" will be removed from the menu. This can't be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
