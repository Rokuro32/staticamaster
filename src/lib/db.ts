// Connexion et gestion de la base de données SQLite

import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { User, Session, Attempt, CompetencyProgress } from '@/types/progress';
import type { CompetencyTag, ModuleId } from '@/types/question';

// Chemin de la base de données
const DB_PATH = path.join(process.cwd(), 'data', 'database.sqlite');

// Singleton pour la connexion
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

// Initialisation du schéma
export function initializeDatabase(): void {
  const database = getDatabase();

  database.exec(`
    -- Utilisateurs
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'student' CHECK(role IN ('student', 'teacher')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Sessions de quiz
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      module_id INTEGER NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      score REAL,
      question_count INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Tentatives individuelles
    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      user_answer TEXT,
      is_correct INTEGER DEFAULT 0,
      score REAL DEFAULT 0,
      time_spent INTEGER DEFAULT 0,
      feedback TEXT,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    -- Progression par compétence
    CREATE TABLE IF NOT EXISTS competency_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      competency_tag TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      successes INTEGER DEFAULT 0,
      last_attempt DATETIME,
      UNIQUE(user_id, competency_tag),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Index pour les performances
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id);
    CREATE INDEX IF NOT EXISTS idx_competency_user ON competency_progress(user_id);
  `);
}

// ==================== USERS ====================

export function createUser(name: string, role: 'student' | 'teacher' = 'student'): User {
  const database = getDatabase();
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  database.prepare(`
    INSERT INTO users (id, name, role, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, name, role, createdAt);

  return { id, name, role, createdAt };
}

export function getUser(id: string): User | null {
  const database = getDatabase();
  const row = database.prepare(`
    SELECT id, name, role, created_at as createdAt
    FROM users WHERE id = ?
  `).get(id) as User | undefined;

  return row || null;
}

export function getUserByName(name: string): User | null {
  const database = getDatabase();
  const row = database.prepare(`
    SELECT id, name, role, created_at as createdAt
    FROM users WHERE name = ?
  `).get(name) as User | undefined;

  return row || null;
}

export function getOrCreateUser(name: string, role: 'student' | 'teacher' = 'student'): User {
  const existing = getUserByName(name);
  if (existing) return existing;
  return createUser(name, role);
}

export function getAllUsers(): User[] {
  const database = getDatabase();
  return database.prepare(`
    SELECT id, name, role, created_at as createdAt
    FROM users ORDER BY created_at DESC
  `).all() as User[];
}

// ==================== SESSIONS ====================

export function createSession(userId: string, moduleId: ModuleId): Session {
  const database = getDatabase();
  const id = uuidv4();
  const startedAt = new Date().toISOString();

  database.prepare(`
    INSERT INTO sessions (id, user_id, module_id, started_at, question_count, correct_count)
    VALUES (?, ?, ?, ?, 0, 0)
  `).run(id, userId, moduleId, startedAt);

  return {
    id,
    userId,
    moduleId,
    startedAt,
    questionCount: 0,
    correctCount: 0,
  };
}

export function completeSession(sessionId: string, score: number): void {
  const database = getDatabase();
  const completedAt = new Date().toISOString();

  database.prepare(`
    UPDATE sessions
    SET completed_at = ?, score = ?
    WHERE id = ?
  `).run(completedAt, score, sessionId);
}

export function updateSessionCounts(sessionId: string, questionCount: number, correctCount: number): void {
  const database = getDatabase();

  database.prepare(`
    UPDATE sessions
    SET question_count = ?, correct_count = ?
    WHERE id = ?
  `).run(questionCount, correctCount, sessionId);
}

export function getSession(id: string): Session | null {
  const database = getDatabase();
  const row = database.prepare(`
    SELECT id, user_id as userId, module_id as moduleId,
           started_at as startedAt, completed_at as completedAt,
           score, question_count as questionCount, correct_count as correctCount
    FROM sessions WHERE id = ?
  `).get(id) as Session | undefined;

  return row || null;
}

export function getUserSessions(userId: string, limit = 20): Session[] {
  const database = getDatabase();
  return database.prepare(`
    SELECT id, user_id as userId, module_id as moduleId,
           started_at as startedAt, completed_at as completedAt,
           score, question_count as questionCount, correct_count as correctCount
    FROM sessions
    WHERE user_id = ?
    ORDER BY started_at DESC
    LIMIT ?
  `).all(userId, limit) as Session[];
}

// ==================== ATTEMPTS ====================

export function recordAttempt(
  sessionId: string,
  questionId: string,
  userAnswer: object,
  isCorrect: boolean,
  score: number,
  timeSpent: number,
  feedback: object
): Attempt {
  const database = getDatabase();
  const id = uuidv4();
  const attemptedAt = new Date().toISOString();

  database.prepare(`
    INSERT INTO attempts (id, session_id, question_id, user_answer, is_correct, score, time_spent, feedback, attempted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    sessionId,
    questionId,
    JSON.stringify(userAnswer),
    isCorrect ? 1 : 0,
    score,
    timeSpent,
    JSON.stringify(feedback),
    attemptedAt
  );

  return {
    id,
    sessionId,
    questionId,
    userAnswer: JSON.stringify(userAnswer),
    isCorrect,
    score,
    timeSpent,
    feedback: JSON.stringify(feedback),
    attemptedAt,
  };
}

export function getSessionAttempts(sessionId: string): Attempt[] {
  const database = getDatabase();
  return database.prepare(`
    SELECT id, session_id as sessionId, question_id as questionId,
           user_answer as userAnswer, is_correct as isCorrect,
           score, time_spent as timeSpent, feedback, attempted_at as attemptedAt
    FROM attempts
    WHERE session_id = ?
    ORDER BY attempted_at ASC
  `).all(sessionId) as Attempt[];
}

// ==================== COMPETENCY PROGRESS ====================

export function updateCompetencyProgress(
  userId: string,
  competencyTag: CompetencyTag,
  isSuccess: boolean
): void {
  const database = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  // Upsert
  database.prepare(`
    INSERT INTO competency_progress (id, user_id, competency_tag, attempts, successes, last_attempt)
    VALUES (?, ?, ?, 1, ?, ?)
    ON CONFLICT(user_id, competency_tag) DO UPDATE SET
      attempts = attempts + 1,
      successes = successes + ?,
      last_attempt = ?
  `).run(id, userId, competencyTag, isSuccess ? 1 : 0, now, isSuccess ? 1 : 0, now);
}

export function getUserCompetencyProgress(userId: string): CompetencyProgress[] {
  const database = getDatabase();
  const rows = database.prepare(`
    SELECT id, user_id as userId, competency_tag as competencyTag,
           attempts, successes, last_attempt as lastAttempt
    FROM competency_progress
    WHERE user_id = ?
    ORDER BY competency_tag
  `).all(userId) as Array<Omit<CompetencyProgress, 'masteryLevel'>>;

  // Add mastery level calculation
  return rows.map(row => {
    const { calculateMasteryLevel } = require('@/types/progress');
    return {
      ...row,
      masteryLevel: calculateMasteryLevel(row.attempts, row.successes),
    };
  });
}

// ==================== STATISTICS ====================

export function getUserStats(userId: string) {
  const database = getDatabase();

  // Total sessions and scores
  const sessionStats = database.prepare(`
    SELECT
      COUNT(*) as totalSessions,
      AVG(score) as averageScore,
      SUM(question_count) as totalQuestions,
      SUM(correct_count) as totalCorrect
    FROM sessions
    WHERE user_id = ? AND completed_at IS NOT NULL
  `).get(userId) as {
    totalSessions: number;
    averageScore: number | null;
    totalQuestions: number;
    totalCorrect: number;
  };

  // Stats per module
  const moduleStats = database.prepare(`
    SELECT
      module_id as moduleId,
      COUNT(*) as sessions,
      AVG(score) as averageScore,
      SUM(question_count) as totalQuestions,
      SUM(correct_count) as correctAnswers
    FROM sessions
    WHERE user_id = ? AND completed_at IS NOT NULL
    GROUP BY module_id
    ORDER BY module_id
  `).all(userId);

  return {
    ...sessionStats,
    moduleStats,
  };
}

export function getAllStudentStats() {
  const database = getDatabase();

  return database.prepare(`
    SELECT
      u.id as oderId,
      u.name,
      COUNT(DISTINCT s.id) as totalSessions,
      AVG(s.score) as averageScore,
      SUM(s.question_count) as totalQuestions,
      SUM(s.correct_count) as totalCorrect,
      MAX(s.completed_at) as lastActivity
    FROM users u
    LEFT JOIN sessions s ON u.id = s.user_id AND s.completed_at IS NOT NULL
    WHERE u.role = 'student'
    GROUP BY u.id
    ORDER BY u.name
  `).all();
}

// ==================== EXPORT ====================

export function exportUserData(userId: string): object {
  const user = getUser(userId);
  if (!user) throw new Error('User not found');

  const sessions = getUserSessions(userId, 1000);
  const attempts: Attempt[] = [];

  for (const session of sessions) {
    attempts.push(...getSessionAttempts(session.id));
  }

  const competencyProgress = getUserCompetencyProgress(userId);
  const stats = getUserStats(userId);

  return {
    exportedAt: new Date().toISOString(),
    user,
    sessions,
    attempts,
    competencyProgress,
    stats,
  };
}

export function exportAllData(): object {
  const database = getDatabase();

  const users = getAllUsers();
  const sessions = database.prepare(`
    SELECT id, user_id as userId, module_id as moduleId,
           started_at as startedAt, completed_at as completedAt,
           score, question_count as questionCount, correct_count as correctCount
    FROM sessions ORDER BY started_at DESC
  `).all();

  const attempts = database.prepare(`
    SELECT id, session_id as sessionId, question_id as questionId,
           user_answer as userAnswer, is_correct as isCorrect,
           score, time_spent as timeSpent, feedback, attempted_at as attemptedAt
    FROM attempts ORDER BY attempted_at DESC
  `).all();

  const competencyProgress = database.prepare(`
    SELECT id, user_id as userId, competency_tag as competencyTag,
           attempts, successes, last_attempt as lastAttempt
    FROM competency_progress
  `).all();

  return {
    exportedAt: new Date().toISOString(),
    users,
    sessions,
    attempts,
    competencyProgress,
  };
}

// Fermer la connexion proprement
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
