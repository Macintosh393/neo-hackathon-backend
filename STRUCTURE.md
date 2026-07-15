```
time-manager-backend/
├── node_modules/
├── prisma/
│   ├── schema.prisma          # Наша затверджена схема БД
│   └── migrations/            # Автоматично згенеровані міграції
├── src/
│   ├── config/
│   │   └── env.js             # Завантаження та перевірка змінних оточення (dotenv)
│   ├── controllers/           # Тонкі контролери (тільки приймають req і віддають res)
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── project.controller.js
│   │   ├── session.controller.js
│   │   └── dashboard.controller.js
│   ├── middlewares/
│   │   ├── auth.middleware.js # Перевірка токенів доступу
│   │   └── error.middleware.js# Глобальний обробник помилок (Catch-all)
│   ├── routes/                # Визначення маршрутів (Express Router)
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── project.routes.js
│   │   ├── session.routes.js
│   │   ├── dashboard.routes.js
│   │   └── index.js           # Головний роутер, який об'єднує всі інші
│   ├── services/              # Товсті сервіси (Вся бізнес-логіка живе тут)
│   │   ├── ai/
│   │   │   └── AiAdapter.js   # Патерн Адаптер для інтеграції з Gemini API
│   │   ├── calendar/
│   │   │   └── googleCalendar.service.js # Робота з Google API (freebusy, tokens)
│   │   ├── scheduling/
│   │   │   └── greedyScheduler.js # Наш алгоритм розстановки сесій
│   │   └── project.service.js # Логіка парсингу JSON та запису в БД
│   ├── validators/            # Celebrate / Joi схеми валідації
│   │   ├── user.validator.js
│   │   ├── project.validator.js
│   │   └── session.validator.js
│   ├── jobs/
│   │   └── cron.js            # Нічний крон-джоб для перепланування (node-cron)
│   ├── app.js                 # Налаштування Express, підключення роутів та celebrate errors
│   └── server.js              # Точка входу: запуск сервера на порту 3000
├── .env                       # Секрети (не йдуть у гіт)
├── .gitignore
├── INSTRUCTIONS.md            # Наш головний промпт для агента
├── API_SCHEMAS.md             # Опис JSON-контрактів
└── package.json
```