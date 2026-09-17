'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { PERMISSIONS, PLAN_FEATURES } from '@stayos/constants';
import { RoleGate, PlanGate, EmptyState, InlineError, useToast, applyServerErrors, SkeletonLoader } from '@stayos/ui';
import { menuKeys } from '@/lib/query-keys';
import {
  menuItemFormResolver,
  MENU_ITEM_DEFAULT_VALUES,
  ModifierGroupsEditor,
  RecipeEditor,
  CategorySelect,
  type MenuItemFormValues,
} from '../_components/MenuItemForm';

export default function NewMenuItemPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.POS_MENU_MANAGE}
      fallback={<EmptyState title="You don't have access to menu management" />}
    >
      <PlanGate feature={PLAN_FEATURES.RESTAURANT_MODULE}>
        <Suspense fallback={<></>}>
          <NewMenuItemContent />
        </Suspense>
      </PlanGate>
    </RoleGate>
  );
}

function NewMenuItemContent(): React.ReactElement {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const outletId = searchParams.get('outletId') ?? '';

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: menuKeys.categories(outletId),
    queryFn: () => api.restaurantMenu.listCategories(outletId),
    enabled: !!outletId,
  });
  const categories = categoriesData?.data ?? [];

  const form = useForm<MenuItemFormValues>({
    resolver: menuItemFormResolver(),
    defaultValues: MENU_ITEM_DEFAULT_VALUES,
  });

  const createMutation = useMutation({
    mutationFn: (values: MenuItemFormValues) =>
      api.restaurantMenu.createItem({
        outletId,
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
      void queryClient.invalidateQueries({ queryKey: menuKeys.items(outletId) });
      toast('Menu item created.', 'success');
      router.push(`/restaurant/menu?outletId=${outletId}`);
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else toast(err.message ?? 'Failed to create menu item.', 'error');
    },
  });

  if (!outletId) {
    return <EmptyState title="No outlet selected" description="Go back to Menu & Recipes and choose an outlet first." />;
  }

  return (
    <div data-page="restaurant-menu-new">
      <div data-page-header>
        <h1>New menu item</h1>
      </div>

      {isLoading ? (
        <SkeletonLoader rows={4} />
      ) : (
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} noValidate data-form>
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
              Cancel
            </button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create item'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
