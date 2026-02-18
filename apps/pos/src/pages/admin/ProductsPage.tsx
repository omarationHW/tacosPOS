import { useState, useMemo } from 'react';
import { Package, Plus, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProducts, useModifierGroups, type ProductWithRelations } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ProductForm {
  name: string;
  description: string;
  price: string;
  category_id: string;
  is_active: boolean;
  sort_order: number;
}

const emptyForm: ProductForm = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  is_active: true,
  sort_order: 0,
};

export function ProductsPage() {
  const { products, loading, createProduct, updateProduct, deleteProduct } = useProducts();
  const { categories } = useCategories();
  const { groups: modifierGroups, createGroup: createModifierGroup } = useModifierGroups();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithRelations | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedModifierGroups, setSelectedModifierGroups] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<ProductWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // New modifier group inline creation
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupModifiers, setNewGroupModifiers] = useState<{ name: string; price_override: string }[]>([
    { name: '', price_override: '0' },
  ]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !filterCategory || p.category_id === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [products, search, filterCategory]);

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sort_order: products.length });
    setImageFile(null);
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
    });
    setImageFile(null);
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
    setSaving(true);
    try {
      const productData = {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        category_id: form.category_id,
        is_active: form.is_active,
        sort_order: form.sort_order,
      };

      if (editing) {
        await updateProduct(editing.id, productData, imageFile, selectedModifierGroups);
        toast.success('Producto actualizado');
      } else {
        await createProduct(productData, imageFile, selectedModifierGroups);
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
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="text-amber-500" size={28} />
          <h1 className="text-2xl font-bold text-gray-100">Productos</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          Nuevo producto
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 py-2.5 pr-3 pl-10 text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <Select
          options={[{ value: '', label: 'Todas las categorías' }, ...categoryOptions]}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Product Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800"
          >
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="h-36 w-full object-cover"
              />
            ) : (
              <div className="flex h-36 items-center justify-center bg-gray-700/50">
                <Package size={40} className="text-gray-600" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-gray-100 truncate">{product.name}</h3>
                  <p className="text-sm text-gray-400">{product.category?.name}</p>
                </div>
                <span className="ml-2 text-lg font-bold text-amber-500">
                  ${Number(product.price).toFixed(2)}
                </span>
              </div>
              {product.description && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{product.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <Badge variant={product.is_active ? 'success' : 'danger'}>
                  {product.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(product)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-amber-500"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(product)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center text-gray-500">
          {search || filterCategory ? 'No se encontraron productos con esos filtros.' : 'No hay productos. Crea el primero.'}
        </div>
      )}

      {/* Product Form Modal */}
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

          <Select
            label="Categoría"
            options={categoryOptions}
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            placeholder="Seleccionar categoría"
          />

          <Input
            label="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descripción opcional"
          />

          <ImageUpload
            value={editing?.image_url ?? null}
            onChange={(file) => setImageFile(file)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Orden"
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              min={0}
            />
            <div className="flex items-end gap-3 pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="accent-amber-500"
                />
                Activo
              </label>
            </div>
          </div>

          {/* Modifier Groups */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Grupos de modificadores</label>
            {modifierGroups.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {modifierGroups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleModifierGroup(g.id)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      selectedModifierGroups.includes(g.id)
                        ? 'border-amber-500 bg-amber-500/20 text-amber-500'
                        : 'border-gray-600 text-gray-400 hover:border-gray-500'
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
              <div className="space-y-3 rounded-lg border border-gray-600 bg-gray-800/50 p-4">
                <Input
                  label="Nombre del grupo"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ej: Tipo de carne"
                />
                <div className="space-y-2">
                  <label className="block text-xs text-gray-400">Modificadores</label>
                  {newGroupModifiers.map((mod, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-amber-500 focus:outline-none"
                        placeholder="Nombre"
                        value={mod.name}
                        onChange={(e) => {
                          const updated = [...newGroupModifiers];
                          updated[idx] = { ...mod, name: e.target.value };
                          setNewGroupModifiers(updated);
                        }}
                      />
                      <input
                        className="w-24 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-amber-500 focus:outline-none"
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
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setShowNewGroup(false)}
                  >
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar producto"
        message={`¿Estás seguro de eliminar "${deleteConfirm?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
