import { useState } from 'react';
import { FolderOpen, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useCategories } from '@/hooks/useCategories';
import { useBusinessLine } from '@/contexts/BusinessLineContext';
import { useLineFilter } from '@/components/BusinessLineToggle';
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
  business_line_id: string;
}

export function CategoriesPage() {
  const { categories, loading, createCategory, updateCategory, toggleActive } = useCategories();
  const { activeBusinessLine, availableBusinessLines } = useBusinessLine();
  const resolvedLineId = useLineFilter();

  const emptyForm: CategoryForm = {
    name: '',
    description: '',
    icon: 'utensils-crossed',
    color: '#f59e0b',
    sort_order: 0,
    business_line_id: activeBusinessLine?.id ?? (availableBusinessLines[0]?.id ?? ''),
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filter categories by selected line
  const filteredCategories = resolvedLineId
    ? categories.filter((c) => c.business_line_id === resolvedLineId)
    : categories;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sort_order: filteredCategories.length + 1, business_line_id: activeBusinessLine?.id ?? '' });
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
      business_line_id: cat.business_line_id,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.business_line_id) {
      toast.error('Selecciona una linea de negocio');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, form);
        toast.success('Categoria actualizada');
      } else {
        await createCategory(form);
        toast.success('Categoria creada');
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
      toast.success(cat.is_active ? 'Categoria desactivada' : 'Categoria activada');
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
          <FolderOpen className="text-[color:var(--color-accent)]" size={28} />
          <h1 className="text-2xl font-bold text-[color:var(--color-fg)]">Categorias</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          Nueva categoria
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-4 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold text-white"
              style={{ backgroundColor: cat.color ?? '#f59e0b' }}
            >
              {cat.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-[color:var(--color-fg)] truncate">{cat.name}</h3>
                <Badge variant={cat.is_active ? 'success' : 'danger'}>
                  {cat.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              {cat.description && (
                <p className="text-sm text-[color:var(--color-fg-muted)] truncate">{cat.description}</p>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleToggle(cat)}
                className="rounded-lg p-2 text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-inset)] hover:text-[color:var(--color-fg)]"
                title={cat.is_active ? 'Desactivar' : 'Activar'}
              >
                <div className={`h-4 w-4 rounded-full border-2 ${cat.is_active ? 'border-green-500 bg-green-500' : 'border-[color:var(--color-border-strong)]'}`} />
              </button>
              <button
                onClick={() => openEdit(cat)}
                className="rounded-lg p-2 text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-inset)] hover:text-[color:var(--color-accent)]"
              >
                <Pencil size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-8 text-center text-[color:var(--color-fg-subtle)]">
          No hay categorias. Crea la primera.
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar categoria' : 'Nueva categoria'}
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
            label="Descripcion"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descripcion opcional"
          />
          <Input
            label="Posición en el menú"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            min={0}
            helper="Define el orden de aparición en el POS. Menor número = aparece primero."
          />

          {/* Business line selector */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[color:var(--color-fg-muted)]">Linea de negocio</label>
            <div className="flex gap-2">
              {availableBusinessLines.map((bl) => (
                <button
                  key={bl.id}
                  type="button"
                  onClick={() => setForm({ ...form, business_line_id: bl.id })}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    form.business_line_id === bl.id
                      ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]'
                      : 'border-[color:var(--color-border-strong)] text-[color:var(--color-fg-muted)] hover:border-[color:var(--color-border-strong)]'
                  }`}
                >
                  {bl.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[color:var(--color-fg-muted)]">Icono</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm({ ...form, icon })}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    form.icon === icon
                      ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]'
                      : 'border-[color:var(--color-border-strong)] text-[color:var(--color-fg-muted)] hover:border-[color:var(--color-border-strong)]'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[color:var(--color-fg-muted)]">Color</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`h-11 w-11 cursor-pointer rounded-full border-2 transition-transform ${
                    form.color === color ? 'scale-110 border-[color:var(--color-fg)]' : 'border-transparent'
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
