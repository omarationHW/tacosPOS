import { useState, useMemo } from 'react';
import { Users, Plus, Pencil, Trash2, Search, Phone, Cake } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCustomers } from '@/hooks/useCustomers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Database } from '@/lib/database.types';

type CustomerRow = Database['public']['Tables']['customers']['Row'];

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
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)),
    );
  }, [customers, search]);

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
          <Users className="text-amber-500" size={28} />
          <h1 className="text-2xl font-bold text-gray-100">Clientes</h1>
          <span className="rounded-full bg-gray-700 px-2.5 py-0.5 text-sm text-gray-300">
            {customers.length}
          </span>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          Nuevo cliente
        </Button>
      </div>

      {/* Upcoming birthdays */}
      {upcomingBirthdays.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-400">
            <Cake size={16} />
            Cumpleanos proximos (30 dias)
          </div>
          <div className="flex flex-wrap gap-2">
            {upcomingBirthdays.map((c) => (
              <span key={c.id} className="rounded-full bg-amber-500/20 px-3 py-1 text-sm text-amber-300">
                {c.name} - {new Date(c.birthday! + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o telefono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 py-2.5 pr-3 pl-10 text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Customer list */}
      <div className="flex flex-col gap-3">
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            className="flex items-center gap-4 rounded-xl border border-gray-700 bg-gray-800 p-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-700 text-sm font-bold text-gray-300">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-100 truncate">{customer.name}</h3>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
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
                <p className="mt-1 text-xs text-gray-500 truncate">{customer.notes}</p>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => openEdit(customer)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-amber-500"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => setDeleteConfirm(customer)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center text-gray-500">
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
