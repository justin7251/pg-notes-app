import { useState, useEffect } from 'react';

export default function NoteEditor({ noteToEdit, onSave, onCancel }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isShippable, setIsShippable] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientAddressLine1, setRecipientAddressLine1] = useState('');
  const [recipientAddressLine2, setRecipientAddressLine2] = useState('');
  const [recipientCity, setRecipientCity] = useState('');
  const [recipientPostalCode, setRecipientPostalCode] = useState('');
  const [recipientCountry, setRecipientCountry] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (noteToEdit) {
      setTitle(noteToEdit.title || '');
      setContent(noteToEdit.content || '');
      setIsShippable(noteToEdit.is_shippable || false);
      setRecipientName(noteToEdit.recipient_name || '');
      setRecipientAddressLine1(noteToEdit.recipient_address_line1 || '');
      setRecipientAddressLine2(noteToEdit.recipient_address_line2 || '');
      setRecipientCity(noteToEdit.recipient_city || '');
      setRecipientPostalCode(noteToEdit.recipient_postal_code || '');
      setRecipientCountry(noteToEdit.recipient_country || '');
    } else {
      // Reset form for new note
      setTitle('');
      setContent('');
      setIsShippable(false);
      setRecipientName('');
      setRecipientAddressLine1('');
      setRecipientAddressLine2('');
      setRecipientCity('');
      setRecipientPostalCode('');
      setRecipientCountry('');
    }
  }, [noteToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const token = localStorage.getItem('jwt');
    if (!token) {
      setError('Authentication required.');
      setIsLoading(false);
      return;
    }

    const noteData = {
      title,
      content,
      is_shippable: isShippable,
      recipient_name: recipientName,
      recipient_address_line1: recipientAddressLine1,
      recipient_address_line2: recipientAddressLine2,
      recipient_city: recipientCity,
      recipient_postal_code: recipientPostalCode,
      recipient_country: recipientCountry,
    };

    // PostgREST uses 'Prefer: resolution=merge-duplicates' for upsert or 'Prefer: return=representation' for returning the created/updated row
    // For PATCH, it only updates fields provided. For POST, it creates.
    const method = noteToEdit ? 'PATCH' : 'POST';
    const url = noteToEdit
      ? `http://localhost:3000/notes?id=eq.${noteToEdit.id}`
      : 'http://localhost:3000/notes';

    try {
      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=representation', // Ask PostgREST to return the created/updated object
        },
        body: JSON.stringify(noteData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to save note. Status: ${res.status}`);
      }

      const savedNote = await res.json(); // PostgREST returns an array, take the first element
      onSave(savedNote[0] || savedNote); // Handle if PostgREST returns single object or array

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg shadow-md">
      <h2 className="text-xl font-semibold">{noteToEdit ? 'Edit Note' : 'Create New Note'}</h2>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows="4"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required
        />
      </div>

      <div className="flex items-center">
        <input
          id="isShippable"
          type="checkbox"
          checked={isShippable}
          onChange={(e) => setIsShippable(e.target.checked)}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor="isShippable" className="ml-2 block text-sm text-gray-900">
          This note can be shipped
        </label>
      </div>

      {isShippable && (
        <div className="space-y-4 p-4 border-t mt-4">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Recipient Shipping Address</h3>
          <div>
            <label htmlFor="recipientName" className="block text-sm font-medium">Recipient Name</label>
            <input type="text" id="recipientName" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="mt-1 block w-full input-style" required={isShippable}/>
          </div>
          <div>
            <label htmlFor="recipientAddressLine1" className="block text-sm font-medium">Address Line 1</label>
            <input type="text" id="recipientAddressLine1" value={recipientAddressLine1} onChange={(e) => setRecipientAddressLine1(e.target.value)} className="mt-1 block w-full input-style" required={isShippable}/>
          </div>
          <div>
            <label htmlFor="recipientAddressLine2" className="block text-sm font-medium">Address Line 2 (Optional)</label>
            <input type="text" id="recipientAddressLine2" value={recipientAddressLine2} onChange={(e) => setRecipientAddressLine2(e.target.value)} className="mt-1 block w-full input-style"/>
          </div>
          <div>
            <label htmlFor="recipientCity" className="block text-sm font-medium">City</label>
            <input type="text" id="recipientCity" value={recipientCity} onChange={(e) => setRecipientCity(e.target.value)} className="mt-1 block w-full input-style" required={isShippable}/>
          </div>
          <div>
            <label htmlFor="recipientPostalCode" className="block text-sm font-medium">Postal Code</label>
            <input type="text" id="recipientPostalCode" value={recipientPostalCode} onChange={(e) => setRecipientPostalCode(e.target.value)} className="mt-1 block w-full input-style" required={isShippable}/>
          </div>
          <div>
            <label htmlFor="recipientCountry" className="block text-sm font-medium">Country (2-letter code, e.g., US, GB)</label>
            <input type="text" id="recipientCountry" value={recipientCountry} onChange={(e) => setRecipientCountry(e.target.value)} maxLength="2" className="mt-1 block w-full input-style" required={isShippable}/>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancel</button>}
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : (noteToEdit ? 'Save Changes' : 'Create Note')}
        </button>
      </div>
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
