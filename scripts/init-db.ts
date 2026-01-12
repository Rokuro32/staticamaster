#!/usr/bin/env tsx

/**
 * Script d'initialisation de la base de données SQLite
 * Usage: npm run db:init
 */

import fs from 'fs';
import path from 'path';

// Créer le répertoire data s'il n'existe pas
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✓ Répertoire data/ créé');
}

// Créer le répertoire questions s'il n'existe pas
const questionsDir = path.join(dataDir, 'questions');
if (!fs.existsSync(questionsDir)) {
  fs.mkdirSync(questionsDir, { recursive: true });
  console.log('✓ Répertoire data/questions/ créé');
}

// Initialiser la base de données
import { initializeDatabase, createUser, closeDatabase } from '../src/lib/db';

try {
  console.log('Initialisation de la base de données...');
  initializeDatabase();
  console.log('✓ Schéma de la base de données créé');

  // Créer un utilisateur de démonstration
  const demoStudent = createUser('Étudiant Démo', 'student');
  console.log(`✓ Utilisateur étudiant créé: ${demoStudent.name} (${demoStudent.id})`);

  const demoTeacher = createUser('Enseignant Démo', 'teacher');
  console.log(`✓ Utilisateur enseignant créé: ${demoTeacher.name} (${demoTeacher.id})`);

  closeDatabase();
  console.log('\n✅ Base de données initialisée avec succès!');
  console.log(`   Fichier: ${path.join(dataDir, 'database.sqlite')}`);
} catch (error) {
  console.error('❌ Erreur lors de l\'initialisation:', error);
  process.exit(1);
}
