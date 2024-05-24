const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

// Configurar o banco de dados SQLite persistente
const db = new sqlite3.Database('chat.db');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, username TEXT, textmessage TEXT)");
});

// Configurar o servidor WebSocket
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    const id = uuidv4();

    db.run("INSERT INTO messages (id, username, textmessage) VALUES (?, ?, ?)", [id, data.username, data.textmessage], (err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log(`Message inserted with ID: ${id}`);
    });

    // Broadcast the message to all connected clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ id, username: data.username, textmessage: data.textmessage }));
      }
    });
  });

  ws.send(JSON.stringify({ message: 'Welcome to the chat!' }));
});

console.log('WebSocket server is running on ws://localhost:8080');
