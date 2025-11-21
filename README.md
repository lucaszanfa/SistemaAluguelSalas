# 📌 ReservaSalas

Sistema web completo para aluguel e gestão de salas com:
- Reservas por data e horário
- Favoritos
- Painel administrativo
- Avaliações com nota e comentários

---

## 🧩 Requisitos

- **Node.js 18+**
- **MySQL 8+**
- **NPM**

---

## ⚙️ Configuração

### 1️⃣ Criar banco de dados
```sql
CREATE DATABASE reserva_salas;
2️⃣ Criar tabelas principais
sql
Copiar código
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100),
  email VARCHAR(150) UNIQUE,
  senha VARCHAR(255),
  is_admin BOOLEAN DEFAULT FALSE
);

CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100),
  capacidade INT,
  descricao TEXT,
  imagem VARCHAR(255),
  features JSON
);

CREATE TABLE reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  data_reserva DATE NOT NULL,
  horario_inicio TIME,
  horario_fim TIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
3️⃣ Configurar credenciais no .env
env
Copiar código
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=reserva_salas
PORT=3000
4️⃣ Instalar dependências
bash
Copiar código
npm install
5️⃣ Executar o servidor
bash
Copiar código
node server.js
Acesse no navegador:
👉 http://localhost:3000/

🗂️ Estrutura do Projeto

📁 ReservaSalas
├─ server.js              # API Express + MySQL
├─ .env                   # Config do banco e porta
├─ package.json
├─ pages/                 # HTML: home, salas, detalhes, admin...
├─ assets/
│  ├─ js/
│  │   ├─ common.js       # Cabeçalho, modal e integração
│  ├─ css/                # Estilos
│  └─ images/             # Logos e imagens das salas
└─ README.md


🔌 API – Endpoints principais
🔐 Autenticação
POST /api/login
POST /api/register

🏢 Salas
GET /api/rooms
GET /api/rooms/:id
POST /api/rooms/:id/reserve

📅 Reservas
GET /api/reservations
GET /api/reservations/:id

⭐ Favoritos
POST /api/favorites
GET /api/favorites

📝 Avaliações
GET /api/rooms/:id/reviews
POST /api/rooms/:id/reviews

🛠️ Admin
GET /api/admin/users
GET /api/admin/reservations
POST /api/admin/rooms
PUT /api/admin/rooms/:id
DELETE /api/admin/rooms/:id

📜 Licença

Projeto de livre utilização para fins acadêmicos 📚
