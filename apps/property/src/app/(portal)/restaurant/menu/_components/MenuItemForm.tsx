'use client';

import React, { useMemo, useState } from 'react';
import { useFieldArray, useWatch, type Control, type UseFormRegister, type UseFormSetValue } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { MenuCategory, StockItemOption } from '@stayos/api-client';
import { Icons, StatCard } from '@stayos/ui';

const modifierOptionSchema = z.object({
  name: z.string().min(1, 'Required'),
  priceDelta: z.coerce.number(),
});

const modifierGroupSchema = z.object({
  name: z.string().min(1, 'Required'),
  required: z.boolean(),
  multiSelect: z.boolean(),
  options: z.array(modifierOptionSchema).min(1, 'At least one option is required'),
});

const recipeIngredientSchema = z.object({
  stockItemId: z.string().min(1, 'Select an ingredient'),
  quantity: z.coerce.number().positive('Must be positive'),
  unit: z.string().min(1, 'Required'),
});

export const menuItemFormSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  imageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  price: z.coerce.number().min(0, 'Must be zero or positive'),
  vatApplicable: z.boolean(),
  station: z.enum(['kitchen', 'bar']),
  isAvailable: z.boolean(),
  modifierGroups: z.array(modifierGroupSchema),
  recipe: z.array(recipeIngredientSchema),
});

export type MenuItemFormValues = z.infer<typeof menuItemFormSchema>;

export const MENU_ITEM_DEFAULT_VALUES: MenuItemFormValues = {
  categoryId: '',
  name: '',
  description: '',
  imageUrl: '',
  price: 0,
  vatApplicable: true,
  station: 'kitchen',
  isAvailable: true,
  modifierGroups: [],
  recipe: [],
};

export function menuItemFormResolver() {
  return zodResolver(menuItemFormSchema);
}

// ── Modifier groups editor ───────────────────────────────────────────────────
// Nested useFieldArray: the outer array is modifierGroups, and each group's
// own options[] needs its own useFieldArray scoped to that group's path —
// react-hook-form doesn't nest field arrays automatically, so each group row
// is its own component that calls useFieldArray with its own groupIndex.

export function ModifierGroupsEditor({ control, register }: {
  control: Control<MenuItemFormValues>;
  register: UseFormRegister<MenuItemFormValues>;
}): React.ReactElement {
  const { fields, append, remove } = useFieldArray({ control, name: 'modifierGroups' });

  return (
    <div>
      {fields.map((field, groupIndex) => (
        <ModifierGroupRow
          key={field.id}
          control={control}
          register={register}
          groupIndex={groupIndex}
          onRemoveGroup={() => remove(groupIndex)}
        />
      ))}
      <button
        type="button"
        data-btn-secondary
        onClick={() => append({ name: '', required: false, multiSelect: false, options: [{ name: '', priceDelta: 0 }] })}
      >
        + Add modifier group
      </button>
    </div>
  );
}

function ModifierGroupRow({ control, register, groupIndex, onRemoveGroup }: {
  control: Control<MenuItemFormValues>;
  register: UseFormRegister<MenuItemFormValues>;
  groupIndex: number;
  onRemoveGroup: () => void;
}): React.ReactElement {
  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: `modifierGroups.${groupIndex}.options`,
  });

  return (
    <div data-panel data-panel-padded style={{ marginBottom: 'var(--space-3)' }}>
      <div data-form-row>
        <div data-form-group>
          <label>Group name</label>
          <input type="text" placeholder="e.g. Size, Add-ons" {...register(`modifierGroups.${groupIndex}.name`)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)', paddingBottom: '2px' }}>
          <label data-checkbox-label>
            <input type="checkbox" {...register(`modifierGroups.${groupIndex}.required`)} />
            Required
          </label>
          <label data-checkbox-label>
            <input type="checkbox" {...register(`modifierGroups.${groupIndex}.multiSelect`)} />
            Multi-select
          </label>
        </div>
      </div>

      {optionFields.map((opt, optIndex) => (
        <div key={opt.id} data-form-row>
          <div data-form-group>
            <label>Option name</label>
            <input type="text" placeholder="e.g. Large" {...register(`modifierGroups.${groupIndex}.options.${optIndex}.name`)} />
          </div>
          <div data-form-group>
            <label>Price delta (R)</label>
            <input type="number" step={0.01} {...register(`modifierGroups.${groupIndex}.options.${optIndex}.priceDelta`)} />
          </div>
          <button type="button" data-btn-ghost data-btn-sm onClick={() => removeOption(optIndex)} aria-label="Remove option">
            <Icons.Trash2 size={16} />
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
        <button type="button" data-btn-ghost data-btn-sm onClick={() => appendOption({ name: '', priceDelta: 0 })}>
          + Add option
        </button>
        <button type="button" data-btn-ghost data-btn-sm onClick={onRemoveGroup}>
          Remove group
        </button>
      </div>
    </div>
  );
}

// ── Recipe editor ─────────────────────────────────────────────────────────────
// Searchable picker against existing Stock Items (TAD dashboard §3.2), with a
// live computed cost-per-item and margin shown as it's built.

export function RecipeEditor({ control, register, setValue }: {
  control: Control<MenuItemFormValues>;
  register: UseFormRegister<MenuItemFormValues>;
  setValue: UseFormSetValue<MenuItemFormValues>;
}): React.ReactElement {
  const { fields, append, remove } = useFieldArray({ control, name: 'recipe' });
  const { data: stockItems } = useQuery({
    queryKey: ['restaurant', 'stock-item-options'],
    queryFn: () => api.restaurantMenu.listStockItemOptions(),
    staleTime: 60_000,
  });

  const stockItemMap = useMemo(() => {
    const map: Record<string, StockItemOption> = {};
    (stockItems ?? []).forEach((s) => { map[s._id] = s; });
    return map;
  }, [stockItems]);

  const recipeValues = useWatch({ control, name: 'recipe' });
  const priceValue = useWatch({ control, name: 'price' });

  const totalCost = useMemo(() => {
    return (recipeValues ?? []).reduce((sum, ingredient) => {
      const stockItem = ingredient?.stockItemId ? stockItemMap[ingredient.stockItemId] : undefined;
      if (!stockItem || !ingredient?.quantity) return sum;
      return sum + stockItem.costPerUnit * ingredient.quantity;
    }, 0);
  }, [recipeValues, stockItemMap]);

  const margin = (priceValue ?? 0) - totalCost;
  const marginPercent = priceValue ? (margin / priceValue) * 100 : 0;

  return (
    <div>
      {fields.map((field, index) => (
        <RecipeRow
          key={field.id}
          control={control}
          register={register}
          setValue={setValue}
          index={index}
          stockItems={stockItems ?? []}
          onRemove={() => remove(index)}
        />
      ))}
      <button
        type="button"
        data-btn-secondary
        onClick={() => append({ stockItemId: '', quantity: 1, unit: '' })}
      >
        + Add ingredient
      </button>

      {fields.length > 0 && (
        <div data-stat-grid style={{ marginTop: 'var(--space-4)' }}>
          <StatCard icon={Icons.Wallet} tone="teal" label="Recipe cost" value={`R${totalCost.toFixed(2)}`} />
          <StatCard icon={Icons.TrendingUp} tone="green" label="Margin" value={`R${margin.toFixed(2)}`} />
          <StatCard icon={Icons.Percent} tone="blue" label="Margin %" value={`${marginPercent.toFixed(1)}%`} />
        </div>
      )}
    </div>
  );
}

function RecipeRow({ control, register, setValue, index, stockItems, onRemove }: {
  control: Control<MenuItemFormValues>;
  register: UseFormRegister<MenuItemFormValues>;
  setValue: UseFormSetValue<MenuItemFormValues>;
  index: number;
  stockItems: StockItemOption[];
  onRemove: () => void;
}): React.ReactElement {
  const [search, setSearch] = useState('');
  const selectedId = useWatch({ control, name: `recipe.${index}.stockItemId` });
  const selected = stockItems.find((s) => s._id === selectedId);

  const filtered = search.length > 0
    ? stockItems.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];

  const selectStockItem = (s: StockItemOption) => {
    setValue(`recipe.${index}.stockItemId`, s._id, { shouldValidate: true, shouldDirty: true });
    setValue(`recipe.${index}.unit`, s.unit, { shouldValidate: true, shouldDirty: true });
    setSearch('');
  };

  return (
    <div data-form-row>
      <div data-form-group style={{ position: 'relative' }}>
        <label>Ingredient</label>
        {selected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span>{selected.name} ({selected.unit})</span>
            <button type="button" data-btn-ghost data-btn-sm onClick={() => setValue(`recipe.${index}.stockItemId`, '')}>
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              placeholder="Search stock items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {filtered.length > 0 && (
              <ul data-search-results>
                {filtered.map((s) => (
                  <li key={s._id} data-search-result-item onClick={() => selectStockItem(s)}>
                    {s.name}{' '}
                    <span style={{ color: 'var(--color-text-muted)' }}>{s.unit} · R{s.costPerUnit.toFixed(2)}/unit</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <input type="hidden" {...register(`recipe.${index}.stockItemId`)} />
        <input type="hidden" {...register(`recipe.${index}.unit`)} />
      </div>
      <div data-form-group>
        <label>Quantity</label>
        <input type="number" step={0.01} min={0} {...register(`recipe.${index}.quantity`)} />
      </div>
      <button type="button" data-btn-ghost data-btn-sm onClick={onRemove} aria-label="Remove ingredient">
        <Icons.Trash2 size={16} />
      </button>
    </div>
  );
}

export function CategorySelect({ register, categories }: {
  register: UseFormRegister<MenuItemFormValues>;
  categories: MenuCategory[];
}): React.ReactElement {
  return (
    <select {...register('categoryId')}>
      <option value="">Select…</option>
      {categories.map((c) => (
        <option key={c._id} value={c._id}>{c.name}</option>
      ))}
    </select>
  );
}
