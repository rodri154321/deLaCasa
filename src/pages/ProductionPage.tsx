import ProductionBatchForm from '../components/ProductionBatchForm';

export default function ProductionPage() {
  return (
    <section className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Produccion</h1>
          <p className="page-subtitle">Registra lotes y costos adicionales de elaboracion.</p>
        </div>
      </div>
      <ProductionBatchForm />
    </section>
  );
}
