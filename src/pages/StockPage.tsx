import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import IngredientCard from '../components/IngredientCard';
import IngredientForm from '../components/IngredientForm';
import type { Ingredient } from '../services/database';

export default function StockPage() {
  const stock = useAppStore((state) => state.stock);
  const loadStock = useAppStore((state) => state.loadStock);
  const createIngredient = useAppStore((state) => state.createIngredient);
  const updateIngredient = useAppStore((state) => state.updateIngredient);
  const deleteIngredient = useAppStore((state) => state.deleteIngredient);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | undefined>();
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    loadStock().catch(console.error);
  }, [loadStock]);

  const filteredIngredients = stock.filter((ingredient) =>
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ingredient.supplier || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = stock.filter(ingredient => ingredient.current_stock <= ingredient.minimum_stock).length;

  const handleCreateIngredient = async (ingredientData: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await createIngredient(ingredientData);
      await loadStock();
      setIsCreateModalOpen(false);
      setSuccessMessage('Ingrediente creado exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Create ingredient failed:', error);
      throw error;
    }
  };

  const handleUpdateIngredient = async (ingredientData: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingIngredient) {
      try {
        await updateIngredient(editingIngredient.id, ingredientData);
        await loadStock();
        setEditingIngredient(undefined);
        setSuccessMessage('Ingrediente actualizado exitosamente');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (error) {
        console.error('Update ingredient failed:', error);
        throw error;
      }
    }
  };

  const handleDeleteIngredient = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este ingrediente?')) {
      await deleteIngredient(id);
      await loadStock();
      setSuccessMessage('Ingrediente eliminado exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleEditIngredient = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
  };

  const closeEditModal = () => {
    setEditingIngredient(undefined);
  };

  return (
    <section className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ingredientes</h1>
          {lowStockCount > 0 && (
            <p className="mt-1 text-sm font-semibold text-red-700">
              ⚠️ {lowStockCount} ingrediente{lowStockCount !== 1 ? 's' : ''} con stock bajo
            </p>
          )}
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary"
        >
          Crear Ingrediente
        </button>
      </div>

      <div className="card p-4">
        <input
          type="text"
          placeholder="Buscar ingredientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8e9a6d] border-t-transparent"></div>
        </div>
      ) : filteredIngredients.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-lg text-[#6b7c54]">
            {searchTerm ? 'No se encontraron ingredientes' : 'No hay ingredientes registrados'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary mt-4"
            >
              Crear primer ingrediente
            </button>
          )}
        </div>
      ) : (
        <div className="grid-cards">
          {filteredIngredients.map((ingredient) => (
            <IngredientCard
              key={ingredient.id}
              ingredient={ingredient}
              onEdit={handleEditIngredient}
              onDelete={handleDeleteIngredient}
            />
          ))}
        </div>
      )}

      <IngredientForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateIngredient}
        isLoading={isLoading}
      />

      <IngredientForm
        ingredient={editingIngredient}
        isOpen={!!editingIngredient}
        onClose={closeEditModal}
        onSubmit={handleUpdateIngredient}
        isLoading={isLoading}
      />
    </section>
  );
}
