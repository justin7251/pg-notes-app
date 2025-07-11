import { useState, useEffect } from 'react';

const SHIPPING_SERVICE_BASE_URL = 'http://localhost:8001/api/v1';

export default function ShipmentStatusDisplay({ initialShipment, noteTitle }) {
  const [shipment, setShipment] = useState(initialShipment);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setShipment(initialShipment); // Update if the initial prop changes
  }, [initialShipment]);

  const handleRefreshStatus = async () => {
    if (!shipment || !shipment.shipment_id) return;

    setError('');
    setIsLoading(true);
    const token = localStorage.getItem('jwt');
    if (!token) {
      setError('Authentication required.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${SHIPPING_SERVICE_BASE_URL}/shipments/${shipment.shipment_id}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to refresh shipment status.');
      }
      setShipment(prev => ({ ...prev, ...data, updated_at: data.updated_at || new Date().toISOString() })); // Merge new status
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadLabel = async () => {
    if (!shipment || !shipment.shipment_id) return;
    setError('');
    const token = localStorage.getItem('jwt');
    if (!token) {
      setError('Authentication required.');
      return;
    }

    // This endpoint needs to be created in the backend (shipping_service)
    // It should fetch the label_data (base64) from the DB, decode it,
    // and serve it with the correct content type (e.g., image/gif, application/pdf, application/zpl)
    // For ZPL/EPL, the browser might just download it. For images/PDF, it might display or download.
    const labelUrl = `${SHIPPING_SERVICE_BASE_URL}/shipments/${shipment.shipment_id}/label`;

    try {
        const response = await fetch(labelUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({ detail: "Failed to download label. Invalid response from server."}));
            throw new Error(errData.detail || "Failed to download label.");
        }

        // Determine filename and type from Content-Disposition and Content-Type headers if available
        // const disposition = response.headers.get('content-disposition');
        // let filename = `label-${shipment.tracking_number || shipment.shipment_id}.dat`; // Default filename
        // if (disposition && disposition.indexOf('attachment') !== -1) {
        //     const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        //     const matches = filenameRegex.exec(disposition);
        //     if (matches != null && matches[1]) {
        //         filename = matches[1].replace(/['"]/g, '');
        //     }
        // }
        // For simplicity, using a generic name and assuming PDF for now.
        // Backend should set Content-Type and Content-Disposition appropriately.

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        // Use a more specific extension based on actual label type if known (e.g. .gif, .pdf, .zpl)
        link.setAttribute('download', `shipping-label-${shipment.tracking_number || shipment.shipment_id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

    } catch (err) {
        setError(`Label download failed: ${err.message}`);
    }
  };


  if (!shipment) {
    return <p className="text-sm text-gray-500">No shipment details available for this note yet.</p>;
  }

  return (
    <div className="p-4 border rounded-lg shadow-md mt-6 bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">Shipment Details for: <span className="font-normal">{noteTitle || 'Note'}</span></h3>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-3" role="alert">{error}</div>}

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <p><strong>Shipment ID:</strong></p><p className="truncate">{shipment.shipment_id}</p>
        <p><strong>Carrier:</strong></p><p className="uppercase">{shipment.carrier}</p>
        <p><strong>Carrier ID:</strong></p><p className="truncate">{shipment.carrier_shipment_id || 'N/A'}</p>
        <p><strong>Tracking #:</strong></p><p className="truncate">{shipment.tracking_number || 'N/A'}</p>
        <p><strong>Status:</strong></p><p className="font-medium">{shipment.status}</p>
        {shipment.last_known_event && (
            <>
                <p><strong>Last Event:</strong></p><p>{shipment.last_known_event}</p>
            </>
        )}
        <p><strong>Created:</strong></p><p>{new Date(shipment.created_at).toLocaleString()}</p>
        <p><strong>Last Updated:</strong></p><p>{new Date(shipment.updated_at).toLocaleString()}</p>
      </div>

      <div className="mt-4 flex space-x-3">
        <button
          onClick={handleRefreshStatus}
          disabled={isLoading || !shipment.tracking_number}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Refreshing...' : 'Refresh Status'}
        </button>
        {/* Enable download button if label_data was likely stored (even if label_image_url is null) */}
        {/* This assumes the backend /label endpoint knows how to serve it. */}
        {/* A more robust check might be if shipment.has_label_data is true (a field you could add) */}
        <button
          onClick={handleDownloadLabel}
          disabled={!shipment.shipment_id} // Simplistic check, assumes label might exist
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          Download Label
        </button>
      </div>
    </div>
  );
}
