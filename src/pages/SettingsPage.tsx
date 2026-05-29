import { useState } from 'react';
import { parseCsvOrders, importOrders, type ParsedOrder } from '../services/csvImportService';
import { useAppStore } from '../store/useAppStore';

export default function SettingsPage() {
  const { loadOrders } = useAppStore();
  const [csvContent, setCsvContent] = useState('');
  const [parsedOrders, setParsedOrders] = useState<ParsedOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      setCsvContent(content);
      setError(null);

      const orders = await parseCsvOrders(content);
      setParsedOrders(orders);
    } catch (err) {
      setError((err as Error).message);
      setParsedOrders([]);
    }
  };

  const handleImport = async () => {
    if (parsedOrders.length === 0) return;

    setImporting(true);
    setError(null);

    try {
      await importOrders(parsedOrders);
      setImportedCount(parsedOrders.length);
      setParsedOrders([]);
      await loadOrders();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Configuración</h1>
        <p className="text-gray-600 text-base md:text-lg">Importar órdenes históricas desde CSV</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800">
          {error}
        </div>
      )}

      {importedCount > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800">
          Se importaron {importedCount} órdenes correctamente
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Importar desde CSV</h2>
        </div>

        <div className="card-body space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar archivo CSV
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
            />
          </div>

          {parsedOrders.length > 0 && (
            <>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-left">Cantidad</th>
                      <th className="px-3 py-2 text-left">Presentación</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                      <th className="px-3 py-2 text-left">Pagado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedOrders.map((order, i) => (
                      <tr key={i} className="border-t border-gray-200">
                        <td className="px-3 py-2">{order.customerName}</td>
                        <td className="px-3 py-2">{order.quantity}</td>
                        <td className="px-3 py-2">{order.presentationName}</td>
                        <td className="px-3 py-2">{order.status === 'delivered' ? 'Entregado' : 'Pendiente'}</td>
                        <td className="px-3 py-2">{order.paymentStatus === 'paid' ? 'Sí' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="btn-primary"
                >
                  {importing ? 'Importando...' : `Importar ${parsedOrders.length} órdenes`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}