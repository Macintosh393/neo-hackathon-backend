``` javascript 
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // Використовуємо PostgreSQL
  url      = env("DATABASE_URL")
}

model User {
  id                 String   @id @default(uuid())
  email              String   @unique
  googleRefreshToken String?  // Токен для фонового доступу до календаря
  persona            Json?    // Збереження відповідей опитування (JSONB у Postgres)
  createdAt          DateTime @default(now())
  
  courses            Course[]
}

model Course {
  id        String    @id @default(uuid())
  userId    String
  name      String    // Автоматично витягується з JSON
  
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  projects  Project[]

  // Композитний унікальний індекс: 
  // Один користувач не може мати два предмети з абсолютно однаковою назвою.
  // Це допоможе бекенду робити безпечний upsert при завантаженні файлу.
  @@unique([userId, name]) 
}

model Project {
  id                  String   @id @default(uuid())
  courseId            String
  title               String
  description         String?
  deadline            DateTime
  estimatedDifficulty String?  // Наприклад: "easy", "medium", "hard" (з JSON)
  
  course              Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  sessions            StudySession[]

  // Захист від дублювання: якщо користувач двічі завантажить той самий JSON,
  // база не створить проєкт з такою ж назвою в межах одного предмета.
  @@unique([courseId, title]) 
}

enum SessionStatus {
  SCHEDULED
  COMPLETED
  MISSED
}

model StudySession {
  id                 String    @id @default(uuid())
  projectId          String
  title              String    // Згенеровано ШІ (напр., "Проєктування архітектури")
  durationMinutes    Int       // Тривалість у хвилинах
  startTime          DateTime? // Заповнюється бекенд-алгоритмом
  endTime            DateTime? // Заповнюється бекенд-алгоритмом
  status             SessionStatus @default(SCHEDULED) // SCHEDULED, COMPLETED, MISSED
  isCompromised      Boolean   @default(false)
  compromiseReason   String?

  project            Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Індекси для швидкого пошуку сесій у межах конкретних дат (для Календаря)
  @@index([projectId])
  @@index([startTime])
  @@index([status])
}
```