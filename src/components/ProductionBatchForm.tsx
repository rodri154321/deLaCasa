import { useEffect, useState } from 'react';
import { fetchRecipes, createProductionBatch, ProductionCostInput } from '../services/productionService';
import { safeToFixed } from '../utils/formatters';

const initialCost: ProductionCostInput = {
  type: 'other',
  amount: 0,
  description: '',
};

export default function ProductionBatchForm() {
  const [recipes, setRecipes] = useState([] as Array<{ id: string; name: string }>);
  const [recipeId, setRecipeId] = useState('');
  const [quantityProduced, setQuantityProduced] = useState(1);
  const [costs, setCosts] = useState<ProductionCostInput[]>([{ ...initialCost }]);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRecipes()
      .then((data) => setRecipes(data.map((recipe) => ({ id: recipe.id, name: recipe.name }))))
      .catch(console.error);
  }, []);

  const addCostLine = () => {
    setCosts((current) => [...current, { ...initialCost }]);
  };

  const updateCostLine = (index: number, field: keyof ProductionCostInput, value: string | number) => {
    setCosts((current) =>
      current.map((cost, idx) =>
        idx === index ? { ...cost, [field]: field === 'amount' ? Number(value) : value } : cost
      )
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await createProductionBatch(recipeId, quantityProduced, notes, costs);
      setMessage(`Batch created: ${result.batch_id}. Total cost: ${safeToFixed(result.total_cost)}`);
      setRecipeId('');
      setQuantityProduced(1);
      setCosts([{ ...initialCost }]);
      setNotes('');
    } catch (error) {
      setMessage('Failed to create production batch.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="card-header">
        <h2 className="text-2xl font-bold text-[#344033]">Crear Lote de Produccion</h2>
        <p className="mt-1 text-sm text-[#6b7c54]">Selecciona la receta y registra los costos asociados.</p>
      </div>

      <div className="card-body space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <label className="block">
            <span className="form-label">Receta</span>
            <select value={recipeId} onChange={(event) => setRecipeId(event.target.value)} required className="form-input">
              <option value="">Seleccionar receta</option>
              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="form-label">Cantidad producida</span>
            <input
              type="number"
              min="1"
              value={quantityProduced}
              onChange={(event) => setQuantityProduced(Number(event.target.value))}
              required
              className="form-input"
            />
          </label>
        </div>

        <div className="form-section space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-bold text-[#344033]">Costos adicionales</h3>
            <button type="button" onClick={addCostLine} className="btn-secondary">
              Agregar costo
            </button>
          </div>

          <div className="space-y-3">
            {costs.map((cost, index) => (
              <div key={index} className="order-item-row rounded-xl border border-[#e3e8d6] bg-white p-3">
                <input
                  placeholder="Tipo"
                  value={cost.type}
                  onChange={(event) => updateCostLine(index, 'type', event.target.value)}
                  required
                  className="form-input"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Monto"
                  value={cost.amount}
                  onChange={(event) => updateCostLine(index, 'amount', event.target.value)}
                  required
                  className="form-input"
                />
                <input
                  placeholder="Descripcion"
                  value={cost.description ?? ''}
                  onChange={(event) => updateCostLine(index, 'description', event.target.value)}
                  className="form-input"
                />
              </div>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="form-label">Notas</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="form-input" />
        </label>

        <div className="flex justify-end border-t border-[#e3e8d6] pt-5">
          <button type="submit" disabled={isSubmitting || !recipeId} className="btn-primary">
            {isSubmitting ? 'Creando...' : 'Crear Lote'}
          </button>
        </div>

        {message && <p className="form-message">{message}</p>}
      </div>
    </form>
  );
}
