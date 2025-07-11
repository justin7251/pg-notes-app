import { useState } from 'react';

// Assume this is the base URL for your new shipping service
const SHIPPING_SERVICE_BASE_URL = 'http://localhost:8001/api/v1';

export default function ShipmentForm({ note, onShipmentCreated, onShipmentError }) {
  const [carrier, setCarrier] = useState('ups'); // Default to UPS
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Default package details for a "note" - can be customized if needed
  const [packageWeightKg, setPackageWeightKg] = useState(0.1);
  const [packageLengthCm, setPackageLengthCm] = useState(10);
  const [packageWidthCm, setPackageWidthCm] = useState(5);
  const [packageHeightCm, setPackageHeightCm] = useState(1);

  if (!note || !note.is_shippable || !note.recipient_name) {
    return <p className="text-sm text-gray-600">Note is not marked as shippable or recipient address is incomplete.</p>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const token = localStorage.getItem('jwt');
    if (!token) {
      setError('Authentication required to ship.');
      if (onShipmentError) onShipmentError('Authentication required.');
      setIsLoading(false);
      return;
    }

    const shipmentRequest = {
      note_id: note.id,
      carrier: carrier,
      package_weight_kg: parseFloat(packageWeightKg),
      package_length_cm: parseFloat(packageLengthCm),
      package_width_cm: parseFloat(packageWidthCm),
      package_height_cm: parseFloat(packageHeightCm),
    };

    try {
      const res = await fetch(`${SHIPPING_SERVICE_BASE_URL}/shipments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Assuming shipping service validates this JWT
        },
        body: JSON.stringify(shipmentRequest),
      });

      const responseData = await res.json();

      if (!res.ok) {
        const errorMsg = responseData.detail || `Failed to create shipment. Status: ${res.status}`;
        throw new Error(errorMsg);
      }

      // responseData should be the ShipmentResponse model from the backend
      if (onShipmentCreated) onShipmentCreated(responseData);

    } catch (err) {
      console.error("Shipment creation error:", err);
      setError(err.message);
      if (onShipmentError) onShipmentError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg shadow-md mt-4">
      <h3 className="text-lg font-semibold">Create Shipment for Note: {note.title}</h3>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}

      <div>
        <label htmlFor="carrier" className="block text-sm font-medium text-gray-700">Shipping Carrier</label>
        <select
          id="carrier"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          className="mt-1 block w-full input-style"
        >
          <option value="ups">UPS</option>
          <option value="royal_mail" disabled>Royal Mail (Not Implemented)</option>
          {/* Add other carriers here as they are implemented */}
        </select>
      </div>

      {/* Optional: Allow overriding default package dimensions/weight if needed */}
      <details className="text-sm">
        <summary className="cursor-pointer text-indigo-600 hover:text-indigo-800">Customize Package Details (defaults are for a small note)</summary>
        <div className="mt-2 space-y-2">
          <div>
            <label htmlFor="packageWeightKg" className="block text-xs font-medium">Weight (kg)</label>
            <input type="number" id="packageWeightKg" value={packageWeightKg} onChange={e => setPackageWeightKg(e.target.value)} step="0.01" className="mt-1 block w-full input-style text-xs"/>
          </div>
          <div>
            <label htmlFor="packageLengthCm" className="block text-xs font-medium">Length (cm)</label>
            <input type="number" id="packageLengthCm" value={packageLengthCm} onChange={e => setPackageLengthCm(e.target.value)} step="0.1" className="mt-1 block w-full input-style text-xs"/>
          </div>
          <div>
            <label htmlFor="packageWidthCm" className="block text-xs font-medium">Width (cm)</label>
            <input type="number" id="packageWidthCm" value={packageWidthCm} onChange={e => setPackageWidthCm(e.target.value)} step="0.1" className="mt-1 block w-full input-style text-xs"/>
          </div>
          <div>
            <label htmlFor="packageHeightCm" className="block text-xs font-medium">Height (cm)</label>
            <input type="number" id="packageHeightCm" value={packageHeightCm} onChange={e => setPackageHeightCm(e.target.value)} step="0.1" className="mt-1 block w-full input-style text-xs"/>
          </div>
        </div>
      </details>


      <button
        type="submit"
        disabled={isLoading || carrier === "royal_mail"}
        className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
      >
        {isLoading ? 'Processing Shipment...' : `Ship with ${carrier.toUpperCase()}`}
      </button>
      <style jsx>{`
        .input-style {
          display: block;
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #D1D5DB; /* gray-300 */
          border-radius: 0.375rem; /* rounded-md */
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
        }
        .input-style:focus {
          outline: none;
          border-color: #6366F1; /* indigo-500 */
          box-shadow: 0 0 0 0.125rem #A5B4FC; /* ring-indigo-500 with opacity */
        }
      `}</style>
    </form>
  );
}
