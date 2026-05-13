import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import RecipeCard from '../components/RecipeCard';
import RecipeForm from '../components/RecipeForm';
import { fetchRecipeById } from '../services/recipeService';
import type { Recipe } from '../services/database';

export default function RecipesPage() {
  const recipes = useAppStore((state) => state.recipes);
  const products = useAppStore((state) => state.products);
  const stock = useAppStore((state) => state.stock);
  const loadRecipes = useAppStore((state) => state.loadRecipes);
  const loadProducts = useAppStore((state) => state.loadProducts);
  const loadStock = useAppStore((state) => state.loadStock);
  const createRecipe = useAppStore((state) => state.createRecipe);
  const updateRecipe = useAppStore((state) => state.updateRecipe);
  const deleteRecipe = useAppStore((state) => state.deleteRecipe);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<(Recipe & {
    products?: { id: string; name: string };
    recipe_ingredients?: Array<{
      id: string;
      quantity: number;
      ingredients?: {
        id: string;
        name: string;
        unit: string;
        cost_per_unit: number;
      };
    }>;
  }) | undefined>();
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    loadRecipes().catch(console.error);
    loadProducts().catch(console.error);
    loadStock().catch(console.error);
  }, [loadRecipes, loadProducts, loadStock]);

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (recipe as any).products?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateRecipe = async (recipeData: any, ingredients: any[]) => {
    try {
      await createRecipe(recipeData, ingredients);
      await loadRecipes();
      setIsCreateModalOpen(false);
      setSuccessMessage('Receta creada exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Create recipe failed:', error);
      throw error;
    }
  };

  const handleUpdateRecipe = async (recipeData: any, ingredients: any[]) => {
    if (editingRecipe) {
      try {
        await updateRecipe(editingRecipe.id, recipeData, ingredients);
        await loadRecipes();
        setEditingRecipe(undefined);
        setSuccessMessage('Receta actualizada exitosamente');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (error) {
        console.error('Update recipe failed:', error);
        throw error;
      }
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta receta?')) {
      await deleteRecipe(id);
      await loadRecipes();
      setSuccessMessage('Receta eliminada exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleEditRecipe = async (recipe: Recipe) => {
    try {
      const fullRecipe = await fetchRecipeById(recipe.id);
      setEditingRecipe(fullRecipe);
    } catch (error) {
      console.error('Error fetching recipe for edit:', error);
    }
  };

  const closeEditModal = () => {
    setEditingRecipe(undefined);
  };

  return (
    <section className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Recetas</h1>
          <p className="page-subtitle">
            Gestiona las fórmulas de producción de tus productos
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary"
        >
          Crear Receta
        </button>
      </div>

      <div className="card p-4">
        <input
          type="text"
          placeholder="Buscar recetas..."
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
      ) : filteredRecipes.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-lg text-[#6b7c54]">
            {searchTerm ? 'No se encontraron recetas' : 'No hay recetas registradas'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary mt-4"
            >
              Crear primera receta
            </button>
          )}
        </div>
      ) : (
        <div className="grid-cards">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onEdit={handleEditRecipe}
              onDelete={handleDeleteRecipe}
            />
          ))}
        </div>
      )}

      <RecipeForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateRecipe}
        isLoading={isLoading}
      />

      <RecipeForm
        recipe={editingRecipe}
        isOpen={!!editingRecipe}
        onClose={closeEditModal}
        onSubmit={handleUpdateRecipe}
        isLoading={isLoading}
      />
    </section>
  );
}
