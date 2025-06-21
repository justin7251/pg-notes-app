import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import './App.css'

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState([]);
  const [noteContent, setNoteContent] = useState("");

  useEffect(() => {
    if (token) {
      fetchNotes();
    }
  }, [token]);

  const login = async () => {
    const res = await fetch(`${API_URL}/rpc/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
      setUserId(data.user_id);
    }
  };

  const fetchNotes = async () => {
    const res = await fetch(`${API_URL}/notes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setNotes(data);
  };

  const createNote = async () => {
    const res = await fetch(`${API_URL}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ content: noteContent, user_id: userId })
    });
    if (res.ok) {
      setNoteContent("");
      fetchNotes();
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-10 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <h1 className="text-xl font-bold">Login</h1>
            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button onClick={login}>Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-10 space-y-4">
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-bold mb-2">New Note</h2>
          <Input
            placeholder="Write something..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
          />
          <Button className="mt-2" onClick={createNote}>
            Add Note
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {notes.map((note) => (
          <Card key={note.id}>
            <CardContent className="p-4">
              <p>{note.content}</p>
              <small className="text-muted-foreground">
                {new Date(note.created_at).toLocaleString()}
              </small>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default App
