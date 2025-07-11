import { useState, useEffect } from 'react';
import Login from './Login';
import NoteEditor from './NoteEditor';
import ShipmentForm from './ShipmentForm';
import ShipmentStatusDisplay from './ShipmentStatusDisplay';

const POSTGREST_URL = 'http://localhost:3000';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('jwt'));
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null); // Note object for editing or shipping
  const [editingNote, setEditingNote] = useState(null); // Note object or true for new note

  // To store shipment details associated with the selectedNote
  const [currentShipment, setCurrentShipment] = useState(null);
  const [error, setError] = useState('');
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  const fetchNotes = async () => {
    if (!isLoggedIn) return;
    setIsLoadingNotes(true);
    setError('');
    const token = localStorage.getItem('jwt');
    try {
      const res = await fetch(`${POSTGREST_URL}/notes?order=created_at.desc`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch notes. Status: ${res.status}`);
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      setError(err.message);
      if (err.message.includes("401") || err.message.includes("JWT")) setIsLoggedIn(false); // Basic auth error check
    } finally {
      setIsLoadingNotes(false);
    }
  };

  // Fetch notes when user logs in
  useEffect(() => {
    if (isLoggedIn) {
      fetchNotes();
    } else {
      setNotes([]); // Clear notes if logged out
      setSelectedNote(null);
      setEditingNote(null);
      setCurrentShipment(null);
    }
  }, [isLoggedIn]);

  // Fetch shipment details for a selected note if it has any
  // This is a simplified way; ideally, you'd fetch shipments linked to the note_id
  // For now, we'll assume a note has at most one active shipment shown, or we load it when needed.
  // This logic might need to be more robust, e.g., fetching from /shipments?note_id=eq.{note.id}
  const fetchShipmentForNote = async (noteId) => {
    const token = localStorage.getItem('jwt');
    // This is a placeholder. We don't have an endpoint to get shipments by note_id yet from shipping_service.
    // And PostgREST /shipments would also work if user_id matches from the JWT.
    // For now, if a shipment is created, `handleShipmentCreated` will set `currentShipment`.
    // This function is more for loading existing shipments if the UI were more complex.
    // Let's assume `currentShipment` is cleared/set appropriately elsewhere.
    console.log("Placeholder: fetchShipmentForNote for noteId:", noteId, "Token:", token);
    // Example:
    // const res = await fetch(`http://localhost:3000/shipments?note_id=eq.${noteId}&order=created_at.desc&limit=1`, {
    //   headers: { 'Authorization': `Bearer ${token}` },
    // });
    // if (res.ok) { const data = await res.json(); if (data.length > 0) setCurrentShipment(data[0]); }
  };


  const handleLogin = (token) => {
    if (token) setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    setIsLoggedIn(false);
  };

  const handleSaveNote = (savedNote) => {
    if (editingNote && editingNote.id) { // Existing note was edited
      setNotes(notes.map(n => n.id === savedNote.id ? savedNote : n));
    } else { // New note was created
      setNotes([savedNote, ...notes]);
    }
    setEditingNote(null); // Close editor
    setSelectedNote(savedNote); // Select the newly saved/created note
    setCurrentShipment(null); // Clear any previous shipment details
  };

  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setEditingNote(null); // Close editor if open
    setCurrentShipment(null); // Clear previous shipment, will be re-fetched or shown if exists
    // Potentially fetch its shipment details here if not already available
    // fetchShipmentForNote(note.id); // Placeholder
  };

  const handleShipmentCreated = (shipmentData) => {
    console.log("Shipment created/updated:", shipmentData);
    setCurrentShipment(shipmentData);
    // Optionally, re-fetch the note to ensure its data is fresh if shipment impacts it
    // fetchNotes(); // Or update just the selected note
  };

  const handleShipmentError = (errorMessage) => {
    setError(`Shipment Error: ${errorMessage}`);
  };


  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <h1 className="text-3xl font-bold text-indigo-700">My Shippable Notes</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Notes List */}
        <div className="md:col-span-1">
          <h2 className="text-xl font-semibold mb-3">Notes</h2>
          <button
            onClick={() => { setEditingNote({}); setSelectedNote(null); setCurrentShipment(null); }} // Empty object for new note
            className="w-full mb-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            + Create New Note
          </button>
          {isLoadingNotes && <p>Loading notes...</p>}
          <ul className="space-y-2">
            {notes.map(note => (
              <li
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`p-3 rounded-md cursor-pointer hover:bg-indigo-100 ${selectedNote?.id === note.id ? 'bg-indigo-200 shadow-lg' : 'bg-gray-100'}`}
              >
                <h3 className="font-medium text-indigo-800 truncate">{note.title || 'Untitled Note'}</h3>
                <p className="text-xs text-gray-500">{new Date(note.created_at).toLocaleDateString()}</p>
                {note.is_shippable && <span className="text-xs font-semibold text-purple-600">(Shippable)</span>}
              </li>
            ))}
          </ul>
        </div>

        {/* Column 2: Editor or Selected Note Details */}
        <div className="md:col-span-2">
          {editingNote ? (
            <NoteEditor
              noteToEdit={editingNote.id ? editingNote : null} // Pass note if editing, null for new
              onSave={handleSaveNote}
              onCancel={() => setEditingNote(null)}
            />
          ) : selectedNote ? (
            <div className="p-4 border rounded-lg shadow bg-white">
              <h2 className="text-2xl font-semibold mb-2">{selectedNote.title}</h2>
              <p className="text-gray-700 whitespace-pre-wrap mb-4">{selectedNote.content}</p>
              <div className="text-sm text-gray-500 mb-4">
                <p>Created: {new Date(selectedNote.created_at).toLocaleString()}</p>
                <p>Shippable: {selectedNote.is_shippable ? 'Yes' : 'No'}</p>
                {selectedNote.is_shippable && (
                  <div className="mt-2 pl-2 border-l-2 border-indigo-200">
                    <p>Recipient: {selectedNote.recipient_name}</p>
                    <p>Address: {selectedNote.recipient_address_line1}, {selectedNote.recipient_address_line2}</p>
                    <p>{selectedNote.recipient_city}, {selectedNote.recipient_postal_code}, {selectedNote.recipient_country}</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setEditingNote(selectedNote)}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 mr-2"
              >
                Edit Note
              </button>

              {/* Shipment Section for Selected Note */}
              {selectedNote.is_shippable && selectedNote.recipient_name && (
                <ShipmentForm
                  note={selectedNote}
                  onShipmentCreated={handleShipmentCreated}
                  onShipmentError={handleShipmentError}
                />
              )}

              {currentShipment && currentShipment.note_id === selectedNote.id && (
                <ShipmentStatusDisplay
                  initialShipment={currentShipment}
                  noteTitle={selectedNote.title}
                />
              )}
               {/* If no currentShipment but we want to show existing ones, we'd need to fetch them here */}

            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Select a note to view or edit, or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
