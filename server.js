const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();

// Configurar o banco de dados SQLite persistente
const db = new sqlite3.Database('chat.db');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, textmessage TEXT)");
});

// Configurar o servidor WebSocket
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (error) {
      console.error('Invalid JSON:', error);
      ws.send(JSON.stringify({ error: 'Invalid JSON format' }));
      return;
    }

    if (data.type === 'history_request') {
      db.all("SELECT * FROM messages", (err, rows) => {
        if (err) {
          console.error('Database fetch error:', err.message);
          ws.send(JSON.stringify({ error: 'Database error' }));
          return;
        }
        ws.send(JSON.stringify({ type: 'history', messages: rows }));
      });
      return;
    }

    const { username, textmessage } = data;

    if (!username || !textmessage) {
      ws.send(JSON.stringify({ error: 'Username and message text are required' }));
      return;
    }

    db.run("INSERT INTO messages (username, textmessage) VALUES (?, ?)", [username, textmessage], function(err) {
      if (err) {
        console.error('Database insert error:', err.message);
        ws.send(JSON.stringify({ error: 'Database error' }));
        return;
      }

      const id = this.lastID; // Get the auto-generated ID

      console.log(`Message inserted with ID: ${id}`);

      // Broadcast the message to all connected clients
      const newMessage = { id, username, textmessage };
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(newMessage));
        }
      });
    });
  });

  ws.send(JSON.stringify({ message: 'Welcome to the chat!' }));
});

console.log('WebSocket server is running on ws://localhost:8080');
