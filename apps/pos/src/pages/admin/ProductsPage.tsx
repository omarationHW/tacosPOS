import { useState, useMemo } from 'react';
import { Package, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useProducts, useModifierGroups, type ProductWithRelations } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useBusinessLine } from '@/contexts/BusinessLineContext';
import { useLineFilter } from '@/components/BusinessLineToggle';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ProductForm {
  name: string;
  description: string;
  price: string;
  category_id: string;
  is_active: boolean;
  sort_order: number;
  business_line_id: string;
}

export function ProductsPage() {
  const { products, loading, createProduct, updateProduct, deleteProduct } = useProducts();
  const { categories } = useCategories();
  const { groups: modifierGroups, createGroup: createModifierGroup } = useModifierGroups();
  const { activeBusinessLine, availableBusinessLines } = useBusinessLine();
  const resolvedLineId = useLineFilter();

  const emptyForm: ProductForm = {
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_active: true,
    sort_order: 0,
    business_line_id: activeBusinessLine?.id ?? '',
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithRelations | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [selectedModifierGroups, setSelectedModifierGroups] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<ProductWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupModifiers, setNewGroupModifiers] = useState<{ name: string; price_override: string }[]>([
    { name: '', price_override: '0' },
  ]);

  const lineProducts = useMemo(() => {
    if (!resolvedLineId) return products;
    return products.filter((p) => p.business_line_id === resolvedLineId);
  }, [products, resolvedLineId]);

  const filteredProducts = useMemo(() => {
    return lineProducts.filter((p) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !filterCategory || p.category_id === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [lineProducts, search, filterCategory]);

  const lineCategories = useMemo(() => {
    if (!resolvedLineId) return categories;
    return categories.filter((c) => c.business_line_id === resolvedLineId);
  }, [categories, resolvedLineId]);

  const categoryOptions = lineCategories.map((c) => ({ value: c.id, label: c.name }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sort_order: lineProducts.length, business_line_id: activeBusinessLine?.id ?? '' });
    setSelectedModifierGroups([]);
    setShowNewGroup(false);
    setModalOpen(true);
  };

  const openEdit = (product: ProductWithRelations) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? '',
      price: String(product.price),
      category_id: product.category_id,
      is_active: product.is_active,
      sort_order: product.sort_order,
      business_line_id: product.business_line_id,
    });
    setSelectedModifierGroups(
      product.modifier_groups?.map((mg) => mg.modifier_group_id) ?? [],
    );
    setShowNewGroup(false);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category_id) {
      toast.error('Selecciona una categoría');
      return;
    }
    if (!form.business_line_id) {
      toast.error('Selecciona una línea de negocio');
      return;
    }
    setSaving(true);
    try {
      const productData = {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        category_id: form.category_id,
        is_active: form.is_active,
        sort_order: form.sort_order,
        business_line_id: form.business_line_id,
      };

      if (editing) {
        await updateProduct(editing.id, productData, null, selectedModifierGroups);
        toast.success('Producto actualizado');
      } else {
        await createProduct(productData, null, selectedModifierGroups);
        toast.success('Producto creado');
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
      await deleteProduct(deleteConfirm.id);
      toast.success('Producto eliminado');
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateModifierGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const mods = newGroupModifiers
        .filter((m) => m.name.trim())
        .map((m) => ({ name: m.name, price_override: parseFloat(m.price_override) || 0 }));
      const group = await createModifierGroup({ name: newGroupName }, mods);
      setSelectedModifierGroups((prev) => [...prev, group.id]);
      setShowNewGroup(false);
      setNewGroupName('');
      setNewGroupModifiers([{ name: '', price_override: '0' }]);
      toast.success('Grupo de modificadores creado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const toggleModifierGroup = (groupId: string) => {
    setSelectedModifierGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    );
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
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Package className="text-[color:var(--color-accent)]" size={28} />
          <h1 className="font-display text-2xl font-semibold text-[color:var(--color-fg)]">Productos</h1>
          <span className="rounded-full bg-[color:var(--color-accent-soft)] px-3 py-0.5 text-sm font-semibold text-[color:var(--color-accent)]">
            {filteredProducts.length}
          </span>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          Nuevo producto
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-[color:var(--color-fg-subtle)]" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)] py-2.5 pr-3 pl-10 text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </div>
        <Select
          options={[{ value: '', label: 'Todas las categorías' }, ...categoryOptions]}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-56"
        />
      </div>

      {/* Product rows */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-10 text-center text-[color:var(--color-fg-subtle)]">
          {search || filterCategory ? 'No se encontraron productos con esos filtros.' : 'No hay productos. Crea el primero.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]">
          <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto] items-center gap-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-inset)]/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-subtle)] sm:grid">
            <div>Producto</div>
            <div>Categoría</div>
            <div className="text-right">Precio</div>
            <div>Posición</div>
            <div>Estado</div>
            <div className="w-[72px]"></div>
          </div>
          <div className="divide-y divide-[color:var(--color-border)]">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="grid grid-cols-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-[color:var(--color-bg-inset)]/40 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]"
              >
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold text-[color:var(--color-fg)] line-clamp-1">
                    {product.name}
                  </p>
                  {product.description && (
                    <p className="mt-0.5 text-xs text-[color:var(--color-fg-subtle)] line-clamp-1">
                      {product.description}
                    </p>
                  )}
                  {product.modifier_groups && product.modifier_groups.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {product.modifier_groups.map((mg) => (
                        <span
                          key={mg.id}
                          className="rounded-full bg-[color:var(--color-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-accent)]"
                        >
                          {mg.modifier_group?.name ?? '—'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-sm text-[color:var(--color-fg-muted)]">
                  {product.category?.name ?? '—'}
                </div>
                <div className="font-mono text-base font-semibold tabular-nums text-[color:var(--color-fg)] sm:text-right">
                  ${Number(product.price).toFixed(2)}
                </div>
                <div className="font-mono text-sm tabular-nums text-[color:var(--color-fg-subtle)]">
                  #{product.sort_order}
                </div>
                <Badge variant={product.is_active ? 'success' : 'danger'}>
                  {product.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
                <div className="flex gap-1 justify-self-end">
                  <button
                    onClick={() => openEdit(product)}
                    aria-label={`Editar ${product.name}`}
                    className="rounded-lg p-2 text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-inset)] hover:text-[color:var(--color-accent)]"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(product)}
                    aria-label={`Eliminar ${product.name}`}
                    className="rounded-lg p-2 text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-inset)] hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Ej: Taco al pastor"
            />
            <Input
              label="Precio"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[color:var(--color-fg-muted)]">Línea de negocio</label>
            <div className="flex gap-2">
              {availableBusinessLines.map((bl) => (
                <button
                  key={bl.id}
                  type="button"
                  onClick={() => setForm({ ...form, business_line_id: bl.id, category_id: '' })}
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

          <Select
            label="Categoría"
            options={categories
              .filter((c) => c.business_line_id === form.business_line_id)
              .map((c) => ({ value: c.id, label: c.name }))}
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            placeholder="Seleccionar categoría"
          />

          <Input
            label="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descripción opcional (para referencia interna)"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Posición"
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              min={0}
              helper="Menor número = aparece primero dentro de la categoría"
            />
            <div className="flex items-end gap-3 pb-1">
              <label className="flex items-center gap-2 text-sm text-[color:var(--color-fg-muted)]">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="accent-[color:var(--color-accent)]"
                />
                Activo
              </label>
            </div>
          </div>

          {/* Modifier Groups */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[color:var(--color-fg-muted)]">Grupos de modificadores</label>
            {modifierGroups.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {modifierGroups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleModifierGroup(g.id)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      selectedModifierGroups.includes(g.id)
                        ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]'
                        : 'border-[color:var(--color-border-strong)] text-[color:var(--color-fg-muted)] hover:border-[color:var(--color-border-strong)]'
                    }`}
                  >
                    {g.name}
                    {g.modifiers && (
                      <span className="ml-1 text-xs opacity-60">({g.modifiers.length})</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {!showNewGroup ? (
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowNewGroup(true)}>
                <Plus size={14} />
                Crear nuevo grupo
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg)]/50 p-4">
                <Input
                  label="Nombre del grupo"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ej: Tipo de carne"
                />
                <div className="space-y-2">
                  <label className="block text-xs text-[color:var(--color-fg-muted)]">Modificadores</label>
                  {newGroupModifiers.map((mod, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        className="flex-1 rounded-lg border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)] px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
                        placeholder="Nombre"
                        value={mod.name}
                        onChange={(e) => {
                          const updated = [...newGroupModifiers];
                          updated[idx] = { ...mod, name: e.target.value };
                          setNewGroupModifiers(updated);
                        }}
                      />
                      <input
                        className="w-24 rounded-lg border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)] px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
                        type="number"
                        step="0.01"
                        placeholder="$0.00"
                        value={mod.price_override}
                        onChange={(e) => {
                          const updated = [...newGroupModifiers];
                          updated[idx] = { ...mod, price_override: e.target.value };
                          setNewGroupModifiers(updated);
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() =>
                      setNewGroupModifiers([...newGroupModifiers, { name: '', price_override: '0' }])
                    }
                  >
                    <Plus size={14} />
                    Agregar modificador
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setShowNewGroup(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" type="button" onClick={handleCreateModifierGroup}>
                    Crear grupo
                  </Button>
                </div>
              </div>
            )}
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

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar producto"
        message={`Estas seguro de eliminar "${deleteConfirm?.name}"? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
