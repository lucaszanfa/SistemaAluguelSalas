const express = require("express");
const cors = require("cors");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// --- MySQL ---
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "reserva_salas",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});

async function query(sql, params = {}) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Helpers
async function isAdmin(userId) {
  if (!userId) return false;
  const rows = await query(
    "SELECT id FROM users WHERE id = :id AND is_admin = 1",
    { id: userId }
  );
  return rows.length > 0;
}

async function getRoomWithAvailability(roomId, date) {
  const roomRows = await query("SELECT * FROM rooms WHERE id = :id", { id: roomId });
  if (!roomRows.length) return null;
  const room = roomRows[0];
  if (date) {
    const conflict = await query(
      "SELECT id FROM reservations WHERE room_id = :r AND date = :d LIMIT 1",
      { r: roomId, d: date }
    );
    room.available = conflict.length === 0;
  }
  return room;
}

// --- Public/auth routes ---
app.post("/api/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email e senha sao necessarios" });

  const rows = await query(
    "SELECT id, name, email, is_admin FROM users WHERE email = :email AND password = :password",
    { email, password }
  );
  if (!rows.length) return res.status(401).json({ error: "Credenciais invalidas" });

  const user = rows[0];
  const token = String(user.id);
  res.json({ user: { id: user.id, name: user.name, email: user.email, is_admin: user.is_admin, isAdmin: !!user.is_admin }, token });
}));

app.post("/api/register", asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "Nome, email e senha sao obrigatorios" });

  const exists = await query("SELECT id FROM users WHERE email = :email", { email });
  if (exists.length) return res.status(409).json({ error: "Este email ja esta cadastrado" });

  const result = await query(
    "INSERT INTO users (name, email, password, is_admin) VALUES (:name, :email, :password, 0)",
    { name, email, password }
  );
  const id = result.insertId;
  res.status(201).json({ user: { id, name, email }, token: String(id) });
}));

// Rooms list with availability filter
app.get("/api/rooms", asyncHandler(async (req, res) => {
  const { search = "", capacity, date } = req.query;
  const where = [];
  const params = {};
  if (search) {
    where.push("LOWER(name) LIKE :search");
    params.search = `%${String(search).toLowerCase()}%`;
  }
  if (capacity) {
    where.push("capacity >= :cap");
    params.cap = Number(capacity);
  }

  const sql = `SELECT * FROM rooms${where.length ? " WHERE " + where.join(" AND ") : ""}`;
  const rooms = await query(sql, params);

  if (date) {
    const busy = await query(
      "SELECT room_id FROM reservations WHERE date = :d GROUP BY room_id",
      { d: date }
    );
    const busySet = new Set(busy.map(r => r.room_id));
    rooms.forEach(r => { r.available = !busySet.has(r.id); });
  }

  res.json(rooms);
}));

// Room by id
app.get('/api/rooms/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { date } = req.query;
  const room = await getRoomWithAvailability(id, date);
  if (!room) return res.status(404).json({ error: 'Sala nao encontrada' });
  res.json(room);
}));

// Reserve room
app.post("/api/rooms/:id/reserve", asyncHandler(async (req, res) => {
  const roomId = Number(req.params.id);
  const { userId, date, time } = req.body || {};
  if (!userId || !date) return res.status(400).json({ error: "userId e date sao necessarios" });

  const room = await getRoomWithAvailability(roomId);
  if (!room) return res.status(404).json({ error: "Sala nao encontrada" });

  const conflict = await query(
    "SELECT id FROM reservations WHERE room_id = :roomId AND date = :date AND (time IS NULL OR :time IS NULL OR time = :time) LIMIT 1",
    { roomId, date, time: time || null }
  );
  if (conflict.length) return res.status(409).json({ error: "Sala ja reservada nessa data" });

  const result = await query(
    "INSERT INTO reservations (room_id, user_id, date, time) VALUES (:roomId, :userId, :date, :time)",
    { roomId, userId, date, time: time || null }
  );
  const newRes = { id: result.insertId, roomId, userId, date, time: time || null };
  res.json({ message: "Reserva realizada com sucesso", reservation: newRes });
}));

// Reservations list
app.get("/api/reservations", asyncHandler(async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    const all = await query(
      `SELECT rv.*, r.name AS roomName
       FROM reservations rv
       LEFT JOIN rooms r ON r.id = rv.room_id`
    );
    return res.json(all);
  }
  const rows = await query(
    `SELECT rv.*, r.name AS roomName
     FROM reservations rv
     LEFT JOIN rooms r ON r.id = rv.room_id
     WHERE rv.user_id = :id
     ORDER BY rv.date DESC`,
    { id: userId }
  );
  res.json(rows);
}));

// Cancel reservation (user or admin)
app.delete('/api/reservations/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { userId, adminId } = req.body || req.query || {};
  const rows = await query("SELECT * FROM reservations WHERE id = :id", { id });
  if (!rows.length) return res.status(404).json({ error: 'Reserva nao encontrada' });
  const rv = rows[0];

  // allow admin or owner
  const isAdm = await isAdmin(adminId);
  if (!isAdm && String(rv.user_id) !== String(userId)) {
    return res.status(403).json({ error: 'Permissao negada' });
  }

  await query("DELETE FROM reservations WHERE id = :id", { id });
  res.json({ message: 'Reserva cancelada' });
}));

// Reservation by id
app.get('/api/reservations/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const rows = await query("SELECT * FROM reservations WHERE id = :id", { id });
  if (!rows.length) return res.status(404).json({ error: 'Reserva nao encontrada' });
  res.json(rows[0]);
}));

// User by id
app.get('/api/user/:id', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const rows = await query(
    "SELECT id, name, email, is_admin FROM users WHERE id = :id",
    { id }
  );
  if (!rows.length) return res.status(404).json({ error: 'Usuario nao encontrado' });
  const u = rows[0];
  res.json({ ...u, isAdmin: !!u.is_admin });
}));

// Favorites toggle
app.post("/api/favorites", asyncHandler(async (req, res) => {
  const { userId, roomId } = req.body || {};
  if (!userId || !roomId) return res.status(400).json({ error: "userId e roomId sao necessarios" });

  const exists = await query(
    "SELECT id FROM favorites WHERE user_id = :u AND room_id = :r",
    { u: userId, r: roomId }
  );
  if (exists.length) {
    await query("DELETE FROM favorites WHERE user_id = :u AND room_id = :r", { u: userId, r: roomId });
    return res.json({ message: "Removido dos favoritos" });
  }

  await query(
    "INSERT INTO favorites (user_id, room_id) VALUES (:u, :r)",
    { u: userId, r: roomId }
  );
  res.json({ message: "Adicionado aos favoritos" });
}));

// Favorites list
app.get("/api/favorites", asyncHandler(async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    const favs = await query("SELECT * FROM favorites");
    return res.json(favs);
  }
  const rooms = await query(
    `SELECT r.* FROM favorites f
     JOIN rooms r ON r.id = f.room_id
     WHERE f.user_id = :u`,
    { u: userId }
  );
  res.json(rooms);
}));

// Reviews
app.get('/api/rooms/:id/reviews', asyncHandler(async (req, res) => {
  const roomId = Number(req.params.id);
  const rows = await query(
    `SELECT rv.id, rv.room_id AS roomId, rv.user_id AS userId, rv.rating, rv.comment, rv.created_at AS createdAt,
            u.name AS userName
     FROM reviews rv
     LEFT JOIN users u ON u.id = rv.user_id
     WHERE rv.room_id = :roomId
     ORDER BY rv.created_at DESC`,
    { roomId }
  );
  res.json(rows);
}));

app.post('/api/rooms/:id/reviews', asyncHandler(async (req, res) => {
  const roomId = Number(req.params.id);
  const { userId, rating, comment } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId obrigatorio" });
  const room = await getRoomWithAvailability(roomId);
  if (!room) return res.status(404).json({ error: "Sala nao encontrada" });

  const users = await query("SELECT id, name FROM users WHERE id = :id", { id: userId });
  if (!users.length) return res.status(404).json({ error: "Usuario nao encontrado" });

  const rate = Number(rating);
  if (!rate || rate < 1 || rate > 5) return res.status(400).json({ error: "rating deve ser entre 1 e 5" });
  const text = String(comment || "").trim();
  if (!text) return res.status(400).json({ error: "Comentario obrigatorio" });

  const result = await query(
    "INSERT INTO reviews (room_id, user_id, rating, comment, created_at) VALUES (:roomId, :userId, :rating, :comment, NOW())",
    { roomId, userId, rating: rate, comment: text }
  );

  res.status(201).json({
    message: "Avaliacao registrada",
    review: {
      id: result.insertId,
      roomId,
      userId,
      rating: rate,
      comment: text,
      createdAt: new Date().toISOString(),
      userName: users[0].name
    }
  });
}));

// --------- Admin endpoints ---------
app.get('/api/admin/users', asyncHandler(async (req, res) => {
  const { adminId } = req.query;
  if (!await isAdmin(adminId)) return res.status(403).json({ error: 'Acesso negado' });
  const users = await query("SELECT id, name, email, is_admin FROM users");
  res.json(users);
}));

app.get('/api/admin/reservations', asyncHandler(async (req, res) => {
  const { adminId } = req.query;
  if (!await isAdmin(adminId)) return res.status(403).json({ error: 'Acesso negado' });
  const rows = await query(
    `SELECT rv.*, r.name AS roomName
     FROM reservations rv
     LEFT JOIN rooms r ON r.id = rv.room_id
     ORDER BY rv.date DESC, rv.id DESC`
  );
  res.json(rows);
}));

app.delete('/api/admin/reservations/:id', asyncHandler(async (req, res) => {
  const reservationId = Number(req.params.id);
  const { adminId } = req.body || req.query || {};
  if (!await isAdmin(adminId)) return res.status(403).json({ error: 'Acesso negado' });
  const exists = await query("SELECT id FROM reservations WHERE id = :id", { id: reservationId });
  if (!exists.length) return res.status(404).json({ error: 'Reserva nao encontrada' });
  await query("DELETE FROM reservations WHERE id = :id", { id: reservationId });
  res.json({ message: 'Reserva cancelada' });
}));

app.post('/api/admin/rooms', asyncHandler(async (req, res) => {
  const { adminId, name, capacity, price, available, image, address, features } = req.body || {};
  if (!await isAdmin(adminId)) return res.status(403).json({ error: 'Acesso negado' });
  if (!name) return res.status(400).json({ error: 'Nome da sala e necessario' });
  const result = await query(
    `INSERT INTO rooms (name, capacity, price, available, image, address, features)
     VALUES (:name, :cap, :price, :av, :img, :addr, :feat)`,
    {
      name,
      cap: Number(capacity || 0),
      price: Number(price || 0),
      av: available !== undefined ? (available ? 1 : 0) : 1,
      img: image || null,
      addr: address || null,
      feat: features ? JSON.stringify(features) : null
    }
  );
  const [room] = await query("SELECT * FROM rooms WHERE id = :id", { id: result.insertId });
  res.json({ message: 'Sala criada', room });
}));

app.put('/api/admin/rooms/:id', asyncHandler(async (req, res) => {
  const roomId = Number(req.params.id);
  const { adminId, name, capacity, price, available, image, address, features } = req.body || {};
  if (!await isAdmin(adminId)) return res.status(403).json({ error: 'Acesso negado' });
  const exists = await query("SELECT id FROM rooms WHERE id = :id", { id: roomId });
  if (!exists.length) return res.status(404).json({ error: 'Sala nao encontrada' });

  const fields = [];
  const params = { id: roomId };
  if (name !== undefined) { fields.push("name = :name"); params.name = name; }
  if (capacity !== undefined) { fields.push("capacity = :cap"); params.cap = Number(capacity); }
  if (price !== undefined) { fields.push("price = :price"); params.price = Number(price); }
  if (available !== undefined) { fields.push("available = :av"); params.av = available ? 1 : 0; }
  if (image !== undefined) { fields.push("image = :img"); params.img = image || null; }
  if (address !== undefined) { fields.push("address = :addr"); params.addr = address || null; }
  if (features !== undefined) { fields.push("features = :feat"); params.feat = features ? JSON.stringify(features) : null; }

  if (!fields.length) return res.status(400).json({ error: "Nada para atualizar" });

  await query(`UPDATE rooms SET ${fields.join(", ")} WHERE id = :id`, params);
  const [room] = await query("SELECT * FROM rooms WHERE id = :id", { id: roomId });
  res.json({ message: 'Sala atualizada', room });
}));

app.delete('/api/admin/rooms/:id', asyncHandler(async (req, res) => {
  const roomId = Number(req.params.id);
  const { adminId } = req.body || req.query || {};
  if (!await isAdmin(adminId)) return res.status(403).json({ error: 'Acesso negado' });
  const exists = await query("SELECT id FROM rooms WHERE id = :id", { id: roomId });
  if (!exists.length) return res.status(404).json({ error: 'Sala nao encontrada' });
  await query("DELETE FROM rooms WHERE id = :id", { id: roomId });
  res.json({ message: 'Sala removida' });
}));

// Static
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'pages')));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
