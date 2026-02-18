import { useState } from 'react';
import { FolderOpen, Plus, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import type { Database } from '@/lib/database.types';

type Category = Database['public']['Tables']['categories']['Row'];

const ICON_OPTIONS = [
  'utensils-crossed', 'cup-soda', 'glass-water', 'plus-circle',
  'cake-slice', 'tag', 'beef', 'salad', 'pizza', 'coffee',
];

const COLOR_OPTIONS = [
  '#f59e0b', '#3b82f6', '#06b6d4', '#10b981',
  '#ec4899', '#8b5cf6', '#ef4444', '#f97316',
];

interface CategoryForm {
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
}

const emptyForm: CategoryForm = {
  name: '',
  description: '',
  icon: 'utensils-crossed',
  color: '#f59e0b',
  sort_order: 0,
};

export function CategoriesPage() {
  const { categories, loading, createCategory, updateCategory, toggleActive } = useCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sort_order: categories.length + 1 });
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description ?? '',
      icon: cat.icon ?? 'utensils-crossed',
      color: cat.color ?? '#f59e0b',
      sort_order: cat.sort_order,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, form);
        toast.success('Categoría actualizada');
      } else {
        await createCategory(form);
        toast.success('Categoría creada');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cat: Category) => {
    try {
      await toggleActive(cat.id, !cat.is_active);
      toast.success(cat.is_active ? 'Categoría desactivada' : 'Categoría activada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
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
          <FolderOpen className="text-amber-500" size={28} />
          <h1 className="text-2xl font-bold text-gray-100">Categorías</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          Nueva categoría
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-4 rounded-xl border border-gray-700 bg-gray-800 p-4"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold text-white"
              style={{ backgroundColor: cat.color ?? '#f59e0b' }}
            >
              {cat.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-100 truncate">{cat.name}</h3>
                <Badge variant={cat.is_active ? 'success' : 'danger'}>
                  {cat.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              {cat.description && (
                <p className="text-sm text-gray-400 truncate">{cat.description}</p>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleToggle(cat)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                title={cat.is_active ? 'Desactivar' : 'Activar'}
              >
                <div className={`h-4 w-4 rounded-full border-2 ${cat.is_active ? 'border-green-500 bg-green-500' : 'border-gray-500'}`} />
              </button>
              <button
                onClick={() => openEdit(cat)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-amber-500"
              >
                <Pencil size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center text-gray-500">
          No hay categorías. Crea la primera.
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Ej: Tacos"
          />
          <Input
            label="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descripción opcional"
          />
          <Input
            label="Orden"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            min={0}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300">Icono</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm({ ...form, icon })}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    form.icon === icon
                      ? 'border-amber-500 bg-amber-500/20 text-amber-500'
                      : 'border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300">Color</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    form.color === color ? 'scale-110 border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
