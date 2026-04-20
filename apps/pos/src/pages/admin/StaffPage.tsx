import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Pencil, Trash2, ShieldCheck, ShieldOff, KeyRound, Copy, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useBusinessLine } from '@/contexts/BusinessLineContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { BusinessLineRecord } from '@tacos-pos/shared/types';

interface StaffMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  business_lines: BusinessLineRecord[];
  has_initial_pin: boolean;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'cashier', label: 'Cajero' },
  { value: 'waiter', label: 'Mesero' },
  { value: 'kitchen', label: 'Cocina' },
];

const roleBadgeVariant: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  admin: 'danger',
  cashier: 'success',
  waiter: 'info',
  kitchen: 'warning',
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  cashier: 'Cajero',
  waiter: 'Mesero',
  kitchen: 'Cocina',
};

interface StaffForm {
  email: string;
  full_name: string;
  role: string;
  lines: string[];
}

const emptyForm: StaffForm = {
  email: '',
  full_name: '',
  role: 'cashier',
  lines: [],
};

export function StaffPage() {
  const { availableBusinessLines } = useBusinessLine();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [pinReveal, setPinReveal] = useState<{ member: StaffMember; pin: string; label: string } | null>(null);

  const fetchStaff = useCallback(async () => {
    const [profilesRes, linksRes, seedsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('profile_business_lines').select('profile_id, business_line_id, business_line:business_lines(*)'),
      supabase.from('pin_initial_seeds').select('profile_id'),
    ]);

    if (profilesRes.error) {
      setLoading(false);
      return;
    }

    const linksByProfile = new Map<string, BusinessLineRecord[]>();
    for (const link of (linksRes.data ?? []) as any[]) {
      const bl = Array.isArray(link.business_line) ? link.business_line[0] : link.business_line;
      if (!bl) continue;
      const existing = linksByProfile.get(link.profile_id) ?? [];
      existing.push(bl);
      linksByProfile.set(link.profile_id, existing);
    }

    const seedIds = new Set((seedsRes.data ?? []).map((s: any) => s.profile_id as string));

    const members: StaffMember[] = (profilesRes.data ?? []).map((p: any) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      role: p.role,
      is_active: p.is_active,
      business_lines: linksByProfile.get(p.id) ?? [],
      has_initial_pin: seedIds.has(p.id),
    }));

    setStaff(members);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const toggleLine = (lineId: string) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.includes(lineId)
        ? prev.lines.filter((id) => id !== lineId)
        : [...prev.lines, lineId],
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      lines: availableBusinessLines.map((bl) => bl.id),
    });
    setModalOpen(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditing(member);
    setForm({
      email: member.email,
      full_name: member.full_name,
      role: member.role,
      lines: member.business_lines.map((bl) => bl.id),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({
            full_name: form.full_name,
            role: form.role as 'admin' | 'cashier' | 'waiter' | 'kitchen',
          })
          .eq('id', editing.id);
        if (profileErr) throw profileErr;

        await supabase.from('profile_business_lines').delete().eq('profile_id', editing.id);
        if (form.lines.length > 0) {
          const links = form.lines.map((blId) => ({ profile_id: editing.id, business_line_id: blId }));
          const { error: linkErr } = await supabase.from('profile_business_lines').insert(links);
          if (linkErr) throw linkErr;
        }

        toast.success(`${form.full_name || form.email} actualizado`);
      } else {
        if (!form.email.trim()) {
          toast.error('Email es obligatorio');
          setSaving(false);
          return;
        }

        const { data, error: fnErr } = await supabase.functions.invoke('admin-create-staff', {
          body: {
            email: form.email.trim(),
            full_name: form.full_name,
            role: form.role,
            line_ids: form.lines,
          },
        });
        if (fnErr) throw fnErr;
        if (!data?.pin || !data?.profile_id) {
          throw new Error(data?.error ?? 'No se pudo crear el usuario');
        }

        setPinReveal({
          member: {
            id: data.profile_id as string,
            email: form.email.trim(),
            full_name: form.full_name,
            role: form.role,
            is_active: true,
            business_lines: [],
            has_initial_pin: true,
          },
          pin: data.pin as string,
          label: 'PIN inicial',
        });

        toast.success(`${form.full_name || form.email} creado`);
      }

      setModalOpen(false);
      await fetchStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    const willDeactivate = member.is_active;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !member.is_active })
        .eq('id', member.id);
      if (error) throw error;

      // On deactivation: rotate auth password to invalidate any live session
      // and clear the PIN. Re-activation keeps the existing PIN intact since
      // admins may want to reuse a prior credential.
      if (willDeactivate) {
        const { error: rotateErr } = await supabase.rpc('admin_rotate_password', {
          target_profile_id: member.id,
        });
        if (rotateErr) {
          toast.error(`Usuario desactivado pero la sesión podría seguir viva: ${rotateErr.message}`);
        } else {
          toast.success(`${member.full_name || member.email} desactivado · sesión y PIN invalidados`);
        }
      } else {
        toast.success(`${member.full_name || member.email} activado · genera un nuevo PIN para que pueda ingresar`);
      }

      await fetchStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', deleteConfirm.id);
      if (error) throw error;
      toast.success(`${deleteConfirm.full_name || deleteConfirm.email} eliminado`);
      setDeleteConfirm(null);
      await fetchStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const handlePeekPin = async (member: StaffMember) => {
    const { data, error } = await supabase.rpc('peek_initial_pin', { target_profile_id: member.id });
    if (error) {
      toast.error('No se pudo obtener el PIN inicial');
      return;
    }
    if (!data) {
      toast.info('Este usuario ya no tiene PIN inicial (ya lo recibió o cambió)');
      await fetchStaff();
      return;
    }
    setPinReveal({ member, pin: data as string, label: 'PIN inicial' });
  };

  const handleResetPin = async (member: StaffMember) => {
    const { data, error } = await supabase.rpc('admin_reset_pin', { target_profile_id: member.id });
    if (error) {
      toast.error(error.message || 'Error al restablecer PIN');
      return;
    }
    setPinReveal({ member, pin: data as string, label: 'Nuevo PIN' });
    await fetchStaff();
  };

  const acknowledgePinDelivered = async () => {
    if (!pinReveal) return;
    await supabase.rpc('delete_initial_pin', { target_profile_id: pinReveal.member.id });
    setPinReveal(null);
    await fetchStaff();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="text-[color:var(--color-accent)]" size={28} />
          <h1 className="text-2xl font-bold text-[color:var(--color-fg)]">Personal</h1>
          <span className="rounded-full bg-[color:var(--color-bg-inset)] px-2.5 py-0.5 text-sm text-[color:var(--color-fg-muted)]">
            {staff.length}
          </span>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          Nuevo usuario
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {staff.map((member) => (
          <div
            key={member.id}
            className={`flex items-center gap-4 rounded-xl border bg-[color:var(--color-bg-elevated)] p-4 ${
              member.is_active ? 'border-[color:var(--color-border)]' : 'border-[color:var(--color-border)]/50 opacity-60'
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-bg-inset)] text-sm font-bold text-[color:var(--color-fg-muted)]">
              {(member.full_name || member.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-[color:var(--color-fg)] truncate">
                  {member.full_name || member.email}
                </h3>
                <Badge variant={roleBadgeVariant[member.role] ?? 'info'}>
                  {roleLabels[member.role] ?? member.role}
                </Badge>
                {!member.is_active && (
                  <Badge variant="danger">Inactivo</Badge>
                )}
                {member.has_initial_pin && (
                  <Badge variant="warning">PIN inicial pendiente</Badge>
                )}
              </div>
              <div className="mt-0.5 text-xs text-[color:var(--color-fg-subtle)]">{member.email}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {member.business_lines.map((bl) => (
                  <span key={bl.id} className="rounded bg-[color:var(--color-bg-inset)] px-1.5 py-0.5 text-xs text-[color:var(--color-fg-muted)]">
                    {bl.name}
                  </span>
                ))}
                {member.business_lines.length === 0 && (
                  <span className="text-xs text-[color:var(--color-fg-subtle)]">Sin lineas asignadas</span>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              {member.has_initial_pin && (
                <button
                  onClick={() => handlePeekPin(member)}
                  className="rounded-lg p-2 text-[color:var(--color-accent)] hover:bg-[color:var(--color-bg-inset)]"
                  title="Ver PIN inicial"
                >
                  <KeyRound size={16} />
                </button>
              )}
              <button
                onClick={() => handleResetPin(member)}
                className="rounded-lg p-2 text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-inset)] hover:text-[color:var(--color-accent)]"
                title="Generar nuevo PIN"
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={() => handleToggleActive(member)}
                className="rounded-lg p-2 text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-inset)] hover:text-[color:var(--color-fg)]"
                title={member.is_active ? 'Desactivar' : 'Activar'}
              >
                {member.is_active ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
              </button>
              <button
                onClick={() => openEdit(member)}
                className="rounded-lg p-2 text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-inset)] hover:text-[color:var(--color-accent)]"
                title="Editar"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => setDeleteConfirm(member)}
                className="rounded-lg p-2 text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-inset)] hover:text-red-400"
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {staff.length === 0 && (
        <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-8 text-center text-[color:var(--color-fg-subtle)]">
          No hay personal registrado.
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar: ${editing.full_name || editing.email}` : 'Nuevo usuario'}
      >
        <div className="space-y-4">
          <Input
            label="Nombre completo"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Ej: Juan Perez"
          />

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="usuario@ejemplo.com"
            disabled={!!editing}
          />

          {!editing && (
            <div className="rounded-lg border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent-soft)] p-3 text-xs text-[color:var(--color-accent)]">
              Se generará un PIN de 4 dígitos al crear el usuario. Podrás verlo una vez después de guardar.
            </div>
          )}

          <Select
            label="Rol"
            options={ROLE_OPTIONS}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[color:var(--color-fg-muted)]">Lineas de negocio</label>
            <div className="flex gap-2">
              {availableBusinessLines.map((bl) => (
                <button
                  key={bl.id}
                  type="button"
                  onClick={() => toggleLine(bl.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    form.lines.includes(bl.id)
                      ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]'
                      : 'border-[color:var(--color-border-strong)] text-[color:var(--color-fg-muted)] hover:border-[color:var(--color-border-strong)]'
                  }`}
                >
                  {bl.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editing ? 'Guardar' : 'Crear usuario'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar usuario"
        message={`Estas seguro de eliminar a "${deleteConfirm?.full_name || deleteConfirm?.email}"? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleting}
      />

      <PinRevealDialog
        state={pinReveal}
        onClose={() => setPinReveal(null)}
        onAcknowledge={acknowledgePinDelivered}
      />
    </div>
  );
}

function PinRevealDialog({
  state,
  onClose,
  onAcknowledge,
}: {
  state: { member: StaffMember; pin: string; label: string } | null;
  onClose: () => void;
  onAcknowledge: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!state) return;
    await navigator.clipboard.writeText(state.pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog.Root open={!!state} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[color:var(--color-overlay)] backdrop-blur-sm"
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-5 shadow-2xl"
          >
            {state && (
              <>
                <div>
                  <Dialog.Title className="font-display text-xl font-semibold text-[color:var(--color-fg)]">
                    {state.label}
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-[color:var(--color-fg-muted)]">
                    {state.member.full_name || state.member.email}
                  </Dialog.Description>
                </div>

                <div className="flex items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] py-5">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={state.pin}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="tabular font-display text-4xl font-bold tracking-[0.3em] text-[color:var(--color-fg)]"
                    >
                      {state.pin}
                    </motion.span>
                  </AnimatePresence>
                </div>

                <p className="text-xs text-[color:var(--color-fg-muted)]">
                  Este PIN solo se muestra una vez. Cópialo y entrégalo al usuario. Una vez confirmado, no podrás verlo de nuevo (tendrás que generar uno nuevo).
                </p>

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={copy} className="flex-1">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copiado' : 'Copiar PIN'}
                  </Button>
                  <Button onClick={onAcknowledge} className="flex-1">
                    Entregado
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
