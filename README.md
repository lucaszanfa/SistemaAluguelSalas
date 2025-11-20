# Sistema de Aluguel de Salas (Protótipo)

Este repositório contém um protótipo simples de sistema de aluguel de salas usando:
- Backend: Node.js + Express (arquivo `server.js`) com armazenamento em `db.json` (JSON file server)
- Frontend: `index.html` (single page) servido pelo próprio Express

Funcionalidades implementadas
- Login (simples, credenciais em `db.json`)
- Listar salas, buscar por nome, filtrar por capacidade e por data
- Reservar sala para uma data específica
- Favoritar / desfavoritar sala

Usuários de teste
- `admin@exemplo.com` / `senha`
- `joao@exemplo.com` / `1234`

Como executar (Windows PowerShell)
1. Instale dependências:
```powershell
npm install
```
2. Iniciar o servidor (será servido em `http://localhost:3000`):
```powershell
npm start
```
3. Abra `http://localhost:3000` no navegador para usar a interface.

API (endpoints principais)
- `POST /api/login` — body: `{ "email": "...", "password": "..." }` → retorna `{ user, token }`
- `GET /api/rooms` — query: `search`, `capacity`, `date` → lista de salas
- `POST /api/rooms/:id/reserve` — body: `{ userId, date }` → cria reserva
- `GET /api/reservations` — query: `userId` → lista reservas do usuário
- `POST /api/favorites` — body: `{ userId, roomId }` → toggle favorito
- `GET /api/favorites` — query: `userId` → lista de salas favoritas

Observações
- Este é um protótipo educacional: autenticação é minimalista (token = userId salvo no `localStorage`).
- Datas são tratadas como strings `YYYY-MM-DD` — não há verificação de timezone.
- O armazenamento é feito em `db.json` no disco; o protótipo não implementa concorrência/lock.

Próximos passos sugeridos
- Melhorar autenticação (JWT), validação de pedidos e tratamento de erros
- Adicionar interface mais completa para gerenciar reservas (calendário)
- Adicionar testes automatizados (unit + integração)

---
Feito com ❤️ — protótipo entregue pelo assistente.
