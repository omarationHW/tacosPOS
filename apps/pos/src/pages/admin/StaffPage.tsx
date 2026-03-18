import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Pencil, Trash2, ShieldCheck, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
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
  password: string;
  full_name: string;
  role: string;
  lines: string[];
}

const emptyForm: StaffForm = {
  email: '',
  password: '',
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

  const fetchStaff = useCallback(async () => {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (error) {
      setLoading(false);
      return;
    }

    const { data: links } = await supabase
      .from('profile_business_lines')
      .select('profile_id, business_line_id, business_line:business_lines(*)');

    const linksByProfile = new Map<string, BusinessLineRecord[]>();
    for (const link of (links ?? []) as any[]) {
      const bl = Array.isArray(link.business_line) ? link.business_line[0] : link.business_line;
      if (!bl) continue;
      const existing = linksByProfile.get(link.profile_id) ?? [];
      existing.push(bl);
      linksByProfile.set(link.profile_id, existing);
    }

    const members: StaffMember[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      role: p.role,
      is_active: p.is_active,
      business_lines: linksByProfile.get(p.id) ?? [],
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
      password: '',
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
        // Update profile
        const updates: any = {
          full_name: form.full_name,
          role: form.role as 'admin' | 'cashier' | 'waiter' | 'kitchen',
        };

        const { error: profileErr } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', editing.id);

        if (profileErr) throw profileErr;

        // Update password if provided
        if (form.password.trim()) {
          const { error: pwErr } = await supabase.functions.invoke('admin-update-user', {
            body: { user_id: editing.id, password: form.password },
          });
          if (pwErr) {
            toast.error('Perfil actualizado pero no se pudo cambiar la contrasena. Usa el dashboard de Supabase.');
          }
        }

        // Update business lines
        await supabase
          .from('profile_business_lines')
          .delete()
          .eq('profile_id', editing.id);

        if (form.lines.length > 0) {
          const links = form.lines.map((blId) => ({
            profile_id: editing.id,
            business_line_id: blId,
          }));
          const { error: linkErr } = await supabase
            .from('profile_business_lines')
            .insert(links);
          if (linkErr) throw linkErr;
        }

        toast.success(`${form.full_name || form.email} actualizado`);
      } else {
        // Create new user via Supabase Auth
        if (!form.email.trim() || !form.password.trim()) {
          toast.error('Email y contrasena son obligatorios');
          setSaving(false);
          return;
        }

        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: { full_name: form.full_name },
          },
        });

        if (authErr) throw authErr;
        if (!authData.user) throw new Error('No se pudo crear el usuario');

        const newUserId = authData.user.id;

        // Update profile with role and name (trigger creates it)
        // Small delay to let the trigger fire
        await new Promise((r) => setTimeout(r, 500));

        const { error: profileErr } = await supabase
          .from('profiles')
          .upsert({
            id: newUserId,
            email: form.email.trim(),
            full_name: form.full_name,
            role: form.role as 'admin' | 'cashier' | 'waiter' | 'kitchen',
          }, { onConflict: 'id' });

        if (profileErr) throw profileErr;

        // Assign business lines
        if (form.lines.length > 0) {
          const links = form.lines.map((blId) => ({
            profile_id: newUserId,
            business_line_id: blId,
          }));
          const { error: linkErr } = await supabase
            .from('profile_business_lines')
            .insert(links);
          if (linkErr) throw linkErr;
        }

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
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !member.is_active })
        .eq('id', member.id);

      if (error) throw error;
      toast.success(member.is_active ? `${member.full_name} desactivado` : `${member.full_name} activado`);
      await fetchStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      // Delete profile (cascade deletes profile_business_lines)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteConfirm.id);

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
          <Users className="text-amber-500" size={28} />
          <h1 className="text-2xl font-bold text-gray-100">Personal</h1>
          <span className="rounded-full bg-gray-700 px-2.5 py-0.5 text-sm text-gray-300">
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
            className={`flex items-center gap-4 rounded-xl border bg-gray-800 p-4 ${
              member.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-60'
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-700 text-sm font-bold text-gray-300">
              {(member.full_name || member.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-gray-100 truncate">
                  {member.full_name || member.email}
                </h3>
                <Badge variant={roleBadgeVariant[member.role] ?? 'info'}>
                  {roleLabels[member.role] ?? member.role}
                </Badge>
                {!member.is_active && (
                  <Badge variant="danger">Inactivo</Badge>
                )}
              </div>
              <div className="mt-0.5 text-xs text-gray-500">{member.email}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {member.business_lines.map((bl) => (
                  <span key={bl.id} className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-400">
                    {bl.name}
                  </span>
                ))}
                {member.business_lines.length === 0 && (
                  <span className="text-xs text-gray-500">Sin lineas asignadas</span>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleToggleActive(member)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                title={member.is_active ? 'Desactivar' : 'Activar'}
              >
                {member.is_active ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
              </button>
              <button
                onClick={() => openEdit(member)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-amber-500"
                title="Editar"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => setDeleteConfirm(member)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-red-400"
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {staff.length === 0 && (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center text-gray-500">
          No hay personal registrado.
        </div>
      )}

      {/* Create / Edit Modal */}
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

          <Input
            label={editing ? 'Nueva contrasena (dejar vacio para no cambiar)' : 'Contrasena'}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={editing ? '********' : 'Minimo 6 caracteres'}
            required={!editing}
          />

          <Select
            label="Rol"
            options={ROLE_OPTIONS}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300">Lineas de negocio</label>
            <div className="flex gap-2">
              {availableBusinessLines.map((bl) => (
                <button
                  key={bl.id}
                  type="button"
                  onClick={() => toggleLine(bl.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    form.lines.includes(bl.id)
                      ? 'border-amber-500 bg-amber-500/20 text-amber-500'
                      : 'border-gray-600 text-gray-400 hover:border-gray-500'
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar usuario"
        message={`Estas seguro de eliminar a "${deleteConfirm?.full_name || deleteConfirm?.email}"? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
