import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, 'db.json');

export const readDatabase = (): any => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Create default database structure if it doesn't exist
      const defaultDB = {
        patients: [],
        appointments: [],
        billing: [],
        history: [],
        dialysisFlowCharts: [],
        haemodialysisRecords: []
      };
      writeDatabase(defaultDB);
      return defaultDB;
    }
    
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    throw new Error('Failed to read database');
  }
};

export const writeDatabase = (data: any): void => {
  try {
    // Ensure the directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing database:', error);
    throw new Error('Failed to write database');
  }
};

export const backupDatabase = (): string => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, `db-backup-${timestamp}.json`);
    
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, backupPath);
      return backupPath;
    }
    
    throw new Error('Database file does not exist');
  } catch (error) {
    console.error('Error backing up database:', error);
    throw new Error('Failed to backup database');
  }
};

export const restoreDatabase = (backupPath: string): void => {
  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file does not exist');
    }
    
    fs.copyFileSync(backupPath, DB_PATH);
  } catch (error) {
    console.error('Error restoring database:', error);
    throw new Error('Failed to restore database');
  }
};

// Utility: Check for duplicate patient IDs
export const findDuplicatePatientIds = (): string[] => {
  const db = readDatabase();
  const seen = new Set();
  const duplicates = new Set();
  for (const patient of db.patients || []) {
    if (seen.has(patient.id)) {
      duplicates.add(patient.id);
    } else {
      seen.add(patient.id);
    }
  }
  return Array.from(duplicates);
};

// Utility: Fix duplicate patient IDs (assigns new unique IDs to duplicates)
export const fixDuplicatePatientIds = (): number => {
  const db = readDatabase();
  const idMap = new Map();
  let fixed = 0;
  for (const patient of db.patients || []) {
    if (idMap.has(patient.id)) {
      // Generate a new unique ID for this patient
      const dateStr = (patient.catheterInsertionDate || '').replace(/-/g, '');
      let serial = 1;
      let newId = `${dateStr}/${String(serial).padStart(3, '0')}`;
      const existingIds = new Set(db.patients.map(p => p.id));
      while (existingIds.has(newId)) {
        serial++;
        newId = `${dateStr}/${String(serial).padStart(3, '0')}`;
      }
      patient.id = newId;
      fixed++;
      idMap.set(newId, true);
    } else {
      idMap.set(patient.id, true);
    }
  }
  writeDatabase(db);
  return fixed;
}; 