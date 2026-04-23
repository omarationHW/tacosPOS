import { useState, useMemo } from 'react';
import { Users, Plus, Pencil, Trash2, Search, Phone, Cake, Repeat, Wallet, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomers, type CustomerWithStats } from '@/hooks/useCustomers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type CustomerRow = CustomerWithStats;

function daysAgo(iso: string | null): string {
  if (!iso) return 'Sin visitas';
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days}d`;
  if (days < 30) return `Hace ${Math.floor(days / 7)}sem`;
  return `Hace ${Math.floor(days / 30)}m`;
}

interface CustomerForm {
  name: string;
  phone: string;
  birthday: string;
  address: string;
  notes: string;
}

const emptyForm: CustomerForm = {
  name: '',
  phone: '',
  birthday: '',
  address: '',
  notes: '',
};

export function CustomersPage() {
  const { customers, loading, createCustomer, updateCustomer, deleteCustomer } = useCustomers();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredCustomers = useMemo(() => {
    const base = search
      ? customers.filter((c) => {
          const q = search.toLowerCase();
          return c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q));
        })
      : customers;
    // Most frequent / recent first; falls back to alphabetical for clients with no visits.
    return [...base].sort((a, b) => {
      if (b.visits !== a.visits) return b.visits - a.visits;
      if (a.visits === 0) return a.name.localeCompare(b.name);
      return (b.lastVisit ?? '').localeCompare(a.lastVisit ?? '');
    });
  }, [customers, search]);

  const totals = useMemo(() => {
    const withVisits = customers.filter((c) => c.visits > 0);
    return {
      totalCustomers: customers.length,
      activeCustomers: withVisits.length,
      repeatCustomers: customers.filter((c) => c.visits >= 3).length,
      lifetimeRevenue: Math.round(customers.reduce((s, c) => s + c.totalSpent, 0) * 100) / 100,
    };
  }, [customers]);

  // Find upcoming birthdays (next 30 days)
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    return customers
      .filter((c) => {
        if (!c.birthday) return false;
        const bday = new Date(c.birthday);
        const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        if (thisYear < today) thisYear.setFullYear(thisYear.getFullYear() + 1);
        const diff = (thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 30;
      })
      .sort((a, b) => {
        const aDate = new Date(a.birthday!);
        const bDate = new Date(b.birthday!);
        return aDate.getMonth() * 31 + aDate.getDate() - (bDate.getMonth() * 31 + bDate.getDate());
      });
  }, [customers]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (customer: CustomerRow) => {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone ?? '',
      birthday: customer.birthday ?? '',
      address: customer.address ?? '',
      notes: customer.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        birthday: form.birthday || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (editing) {
        await updateCustomer(editing.id, data);
        toast.success('Cliente actualizado');
      } else {
        await createCustomer(data);
        toast.success('Cliente registrado');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteCustomer(deleteConfirm.id);
      toast.success('Cliente eliminado');
      setDeleteConfirm(null);
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
          <Users className="text-[color:var(--color-accent)]" size={28} />
          <h1 className="text-2xl font-bold text-[color:var(--color-fg)]">Clientes</h1>
          <span className="rounded-full bg-[color:var(--color-bg-inset)] px-2.5 py-0.5 text-sm text-[color:var(--color-fg-muted)]">
            {customers.length}
          </span>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          Nuevo cliente
        </Button>
      </div>

      {/* Fidelidad — resumen */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users size={16} />}
          label="Total clientes"
          value={totals.totalCustomers.toString()}
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="Clientes activos"
          value={totals.activeCustomers.toString()}
          hint={`${totals.totalCustomers === 0 ? 0 : Math.round((totals.activeCustomers / totals.totalCustomers) * 100)}% del total`}
        />
        <StatCard
          icon={<Repeat size={16} />}
          label="Frecuentes (3+ visitas)"
          value={totals.repeatCustomers.toString()}
        />
        <StatCard
          icon={<Wallet size={16} />}
          label="Ingresos totales"
          value={`$${totals.lifetimeRevenue.toFixed(2)}`}
        />
      </div>

      {/* Upcoming birthdays */}
      {upcomingBirthdays.length > 0 && (
        <div className="mb-6 rounded-xl border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[color:var(--color-accent)]">
            <Cake size={16} />
            Cumpleanos proximos (30 dias)
          </div>
          <div className="flex flex-wrap gap-2">
            {upcomingBirthdays.map((c) => (
              <span key={c.id} className="rounded-full bg-[color:var(--color-accent-soft)] px-3 py-1 text-sm text-[color:var(--color-accent)]">
                {c.name} - {new Date(c.birthday! + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-[color:var(--color-fg-subtle)]" />
          <input
            type="text"
            placeholder="Buscar por nombre o telefono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)] py-2.5 pr-3 pl-10 text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </div>
      </div>

      {/* Customer list */}
      <div className="flex flex-col gap-3">
        {filteredCustomers.map((customer) => {
          const isFrequent = customer.visits >= 3;
          return (
            <div
              key={customer.id}
              className="flex items-center gap-4 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold
                ${isFrequent
                  ? 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]'
                  : 'bg-[color:var(--color-bg-inset)] text-[color:var(--color-fg-muted)]'}`}>
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-[color:var(--color-fg)] truncate">{customer.name}</h3>
                  {isFrequent && (
                    <span className="rounded-full bg-[color:var(--color-accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-accent)]">
                      Frecuente
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[color:var(--color-fg-muted)]">
                  {customer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={12} />
                      {customer.phone}
                    </span>
                  )}
                  {customer.birthday && (
                    <span className="flex items-center gap-1">
                      <Cake size={12} />
                      {new Date(customer.birthday + 'T12:00:00').toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  )}
                </div>
                {customer.notes && (
                  <p className="mt-1 text-xs text-[color:var(--color-fg-subtle)] truncate">{customer.notes}</p>
                )}
              </div>
              <div className="hidden shrink-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:text-right">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-fg-subtle)]">Visitas</div>
                  <div className="font-mono text-base font-bold tabular-nums text-[color:var(--color-fg)]">{customer.visits}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-fg-subtle)]">Gastado</div>
                  <div className="font-mono text-base font-bold tabular-nums text-[color:var(--color-accent)]">
                    ${customer.totalSpent.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-fg-subtle)]">Última</div>
                  <div className="flex items-center justify-end gap-1 text-xs text-[color:var(--color-fg-muted)]">
                    <Clock size={11} />
                    {daysAgo(customer.lastVisit)}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => openEdit(customer)}
                  className="rounded-lg p-2 text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-inset)] hover:text-[color:var(--color-accent)]"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(customer)}
                  className="rounded-lg p-2 text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-inset)] hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-8 text-center text-[color:var(--color-fg-subtle)]">
          {search ? 'No se encontraron clientes.' : 'No hay clientes registrados. Crea el primero.'}
        </div>
      )}

      {/* Form Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar cliente' : 'Nuevo cliente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Nombre completo"
          />
          <Input
            label="Telefono"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Ej: 5512345678"
          />
          <Input
            label="Fecha de nacimiento"
            type="date"
            value={form.birthday}
            onChange={(e) => setForm({ ...form, birthday: e.target.value })}
          />
          <Input
            label="Direccion"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Direccion (opcional)"
          />
          <Input
            label="Notas"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notas adicionales"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Guardar' : 'Registrar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar cliente"
        message={`Estas seguro de eliminar a "${deleteConfirm?.name}"? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-[color:var(--color-fg-muted)]">
        {icon}
        {label}
      </div>
      <div className="font-mono text-2xl font-bold tabular-nums text-[color:var(--color-fg)]">
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-[11px] text-[color:var(--color-fg-subtle)]">{hint}</div>
      )}
    </div>
  );
}
