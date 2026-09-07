import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { PageHeader, Panel, LoadingBlock, ConfirmDialog, Modal, useToast, Icons } from '@stayos/ui';
import { platformKeys } from '../lib/query-keys';

interface Reward {
  _id: string;
  name: string;
  description?: string | undefined;
  pointsCost: number;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  isPopular: boolean;
  isActive: boolean;
}

interface Programme {
  programmeName: string;
  pointsLabel: string;
  pointsAbbrev: string;
  isActive: boolean;
  pointsPerRandStay: number;
  pointsPerRandDivisor: number;
  reviewBonusPoints: number;
  referralBonusPoints: number;
  profileCompletionPoints: number;
  tierThresholds: { silver: number; gold: number; platinum: number };
  termsAndConditions: string;
  termsVersion: number;
  rewards: Reward[];
}

export default function LoyaltyPage(): React.ReactElement {
  const qc        = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: platformKeys.loyalty(),
    queryFn:  () => api.platform.getLoyaltyProgramme() as Promise<Programme>,
  });

  const [form, setForm] = useState<Partial<Programme>>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  const [rewardModal, setRewardModal] = useState<Reward | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reward | null>(null);

  const saveMutation = useMutation({
    mutationFn: (input: Partial<Programme>) => api.platform.updateLoyaltyProgramme(input),
    onSuccess: () => {
      toast('Loyalty programme updated.', 'success');
      qc.invalidateQueries({ queryKey: platformKeys.loyalty() });
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not save changes.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (rewardId: string) => api.platform.deleteLoyaltyReward(rewardId),
    onSuccess: () => {
      toast('Reward deleted.', 'success');
      qc.invalidateQueries({ queryKey: platformKeys.loyalty() });
      setDeleteTarget(null);
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not delete reward.', 'error'),
  });

  if (isLoading || !data) return <LoadingBlock rows={6} />;

  const rewards = form.rewards ?? data.rewards ?? [];

  return (
    <div>
      <PageHeader
        title="Loyalty programme"
        subtitle="The one platform-wide rewards programme guests see across every property. Per-property and per-agency programmes are configured separately and aren't affected by this page."
      />

      <Panel>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>Programme settings</h3>
        <div data-form-grid-2>
          <div data-form-group>
            <label>Programme name</label>
            <input value={form.programmeName ?? ''} onChange={(e) => setForm((f) => ({ ...f, programmeName: e.target.value }))} />
          </div>
          <div data-form-group>
            <label>Points label</label>
            <input value={form.pointsLabel ?? ''} onChange={(e) => setForm((f) => ({ ...f, pointsLabel: e.target.value }))} />
          </div>
        </div>
        <div data-form-grid-2>
          <div data-form-group>
            <label>Points abbreviation (shown in UI, e.g. "QP")</label>
            <input value={form.pointsAbbrev ?? ''} onChange={(e) => setForm((f) => ({ ...f, pointsAbbrev: e.target.value }))} />
          </div>
          <div data-form-group>
            <label>Programme active</label>
            <label data-checkbox-label>
              <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
              Guests can earn and redeem points
            </label>
          </div>
        </div>

        <h4 style={{ margin: 'var(--space-5) 0 var(--space-3)' }}>Earning rules</h4>
        <div data-form-grid-2>
          <div data-form-group>
            <label>Points per stay (per R{form.pointsPerRandDivisor ?? 100} spent)</label>
            <input type="number" value={form.pointsPerRandStay ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, pointsPerRandStay: Number(e.target.value) }))} />
          </div>
          <div data-form-group>
            <label>Spend threshold (rand)</label>
            <input type="number" value={form.pointsPerRandDivisor ?? 100}
              onChange={(e) => setForm((f) => ({ ...f, pointsPerRandDivisor: Number(e.target.value) }))} />
          </div>
        </div>
        <div data-form-grid-2>
          <div data-form-group>
            <label>Points per review</label>
            <input type="number" value={form.reviewBonusPoints ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, reviewBonusPoints: Number(e.target.value) }))} />
          </div>
          <div data-form-group>
            <label>Points per referral</label>
            <input type="number" value={form.referralBonusPoints ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, referralBonusPoints: Number(e.target.value) }))} />
          </div>
        </div>
        <div data-form-group>
          <label>Points for completing profile (once-off)</label>
          <input type="number" style={{ maxWidth: 200 }} value={form.profileCompletionPoints ?? 0}
            onChange={(e) => setForm((f) => ({ ...f, profileCompletionPoints: Number(e.target.value) }))} />
        </div>

        <h4 style={{ margin: 'var(--space-5) 0 var(--space-3)' }}>Tier thresholds (lifetime points)</h4>
        <div data-form-grid-2>
          <div data-form-group>
            <label>Silver</label>
            <input type="number" value={form.tierThresholds?.silver ?? 1000}
              onChange={(e) => setForm((f) => ({ ...f, tierThresholds: { ...(f.tierThresholds ?? data.tierThresholds), silver: Number(e.target.value) } }))} />
          </div>
          <div data-form-group>
            <label>Gold</label>
            <input type="number" value={form.tierThresholds?.gold ?? 5000}
              onChange={(e) => setForm((f) => ({ ...f, tierThresholds: { ...(f.tierThresholds ?? data.tierThresholds), gold: Number(e.target.value) } }))} />
          </div>
        </div>
        <div data-form-group style={{ maxWidth: '48%' }}>
          <label>Platinum</label>
          <input type="number" value={form.tierThresholds?.platinum ?? 15000}
            onChange={(e) => setForm((f) => ({ ...f, tierThresholds: { ...(f.tierThresholds ?? data.tierThresholds), platinum: Number(e.target.value) } }))} />
        </div>

        <h4 style={{ margin: 'var(--space-5) 0 var(--space-3)' }}>Terms &amp; conditions</h4>
        <div data-form-group>
          <textarea rows={8} value={form.termsAndConditions ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, termsAndConditions: e.target.value }))} />
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Changing this bumps the terms version (currently v{data.termsVersion}) — guests who already accepted the previous version will be asked to review and accept again.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-5)' }}>
          <button data-btn-primary disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(form)}>
            {saveMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </Panel>

      <div style={{ marginTop: 'var(--space-5)' }}>
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3>Rewards catalog</h3>
          <button data-btn-primary onClick={() => setRewardModal('new')}><Icons.Plus size={16} /> New reward</button>
        </div>
        {rewards.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No rewards yet — add one to let guests start redeeming points.</p>
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead><tr><th>Name</th><th>Cost</th><th>Discount</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {rewards.map((r) => (
                    <tr key={r._id}>
                      <td>
                        <div data-cell-entity-name>{r.name}{r.isPopular ? ' ⭐' : ''}</div>
                        {r.description ? <div data-cell-entity-sub>{r.description}</div> : null}
                      </td>
                      <td data-tabular-nums>{r.pointsCost.toLocaleString()}</td>
                      <td>{r.discountType === 'percent' ? `${r.discountValue}%` : `R${r.discountValue}`} off</td>
                      <td><span data-status-badge data-status={r.isActive ? 'active' : 'suspended'}>{r.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        <button data-icon-button aria-label="Edit" onClick={() => setRewardModal(r)}><Icons.Pencil size={14} /></button>
                        <button data-icon-button aria-label="Delete" onClick={() => setDeleteTarget(r)}><Icons.Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>
      </div>

      {rewardModal !== null && (
        <RewardModal
          reward={rewardModal === 'new' ? null : rewardModal}
          onClose={() => setRewardModal(null)}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.name ?? ''}"?`}
        message="Guests will no longer be able to redeem this reward. This doesn't affect vouchers already redeemed."
        confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
      />
    </div>
  );
}

function RewardModal({ reward, onClose }: { reward: Reward | null; onClose: () => void }): React.ReactElement {
  const qc        = useQueryClient();
  const { toast } = useToast();
  const isEdit = Boolean(reward);
  const [form, setForm] = useState<Partial<Reward>>(reward ?? {
    name: '', description: '', pointsCost: 500, discountType: 'percent', discountValue: 10, isPopular: false, isActive: true,
  });

  const mutation = useMutation({
    mutationFn: (input: Partial<Reward>) =>
      isEdit ? api.platform.updateLoyaltyReward(reward!._id, input) : api.platform.createLoyaltyReward(input),
    onSuccess: () => {
      toast(isEdit ? 'Reward updated.' : 'Reward created.', 'success');
      qc.invalidateQueries({ queryKey: platformKeys.loyalty() });
      onClose();
    },
    onError: (err) => toast((err as ApiError).message ?? 'Could not save reward.', 'error'),
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit reward' : 'New reward'}>
      <div data-form-group>
        <label>Name</label>
        <input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div data-form-group>
        <label>Description (optional)</label>
        <input value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
      <div data-form-grid-2>
        <div data-form-group>
          <label>Points cost</label>
          <input type="number" value={form.pointsCost ?? 0} onChange={(e) => setForm((f) => ({ ...f, pointsCost: Number(e.target.value) }))} />
        </div>
        <div data-form-group>
          <label>Discount type</label>
          <select value={form.discountType ?? 'percent'} onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as 'percent' | 'fixed' }))}>
            <option value="percent">Percentage</option>
            <option value="fixed">Fixed amount (R)</option>
          </select>
        </div>
      </div>
      <div data-form-group>
        <label>Discount value</label>
        <input type="number" style={{ maxWidth: 160 }} value={form.discountValue ?? 0} onChange={(e) => setForm((f) => ({ ...f, discountValue: Number(e.target.value) }))} />
      </div>
      <label data-checkbox-label style={{ marginBottom: 'var(--space-2)' }}>
        <input type="checkbox" checked={form.isPopular ?? false} onChange={(e) => setForm((f) => ({ ...f, isPopular: e.target.checked }))} />
        Mark as popular
      </label>
      <label data-checkbox-label style={{ marginBottom: 'var(--space-4)' }}>
        <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
        Active (visible to guests)
      </label>
      <div data-modal-footer style={{ padding: 0, borderTop: 'none' }}>
        <button type="button" data-btn-secondary onClick={onClose}>Cancel</button>
        <button type="button" data-btn-primary disabled={mutation.isPending} onClick={() => mutation.mutate(form)}>
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create reward'}
        </button>
      </div>
    </Modal>
  );
}
