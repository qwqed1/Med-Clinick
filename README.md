бек на node.js и postgres
используется pnpm (и что вы мне сделаете)
pnpm init; pnpm i; 

ну и для запуска:
node src/index.js

рекомендую прочитать что_я_умею.md
.env Антона:
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=12345
DB_DATABASE=medical_db

# JWT
JWT_SECRET=supersecret_jwt_key
JWT_TTL=7d

# Первичный суперадмин (создастся при первом старте, если отсутствует)
SUPERADMIN_LOGIN=admin
SUPERADMIN_PASSWORD=admin
