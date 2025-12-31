'use client';

export type SpecialityCode = 'LMD' | 'RTW' | 'ING' | 'SIQ' | 'STIC' | 'PRO';

export type LevelCode =
  | 'LMD1'
  | 'LMD2'
  | 'LMD3SI'
  | 'LMD3ISIL'
  | 'RTW1'
  | 'RTW2'
  | 'RTW3'
  | 'ING1'
  | 'ING2'
  | 'ING3'
  | 'ING4'
  | 'M1SIQ'
  | 'M2SIQ'
  | 'M1STIC'
  | 'M2STIC'
  | 'PRO1'
  | 'PRO2'
  | 'PRO3';

export type SemesterCode = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6';

export type LevelInfo = {
  code: LevelCode;
  label: string;
  speciality: SpecialityCode;
};

export const SPECIALITIES: Array<{ code: SpecialityCode; label: string }> = [
  { code: 'LMD', label: 'LMD' },
  { code: 'RTW', label: 'RTW' },
  { code: 'ING', label: 'ING' },
  { code: 'SIQ', label: 'SIQ' },
  { code: 'STIC', label: 'STIC' },
  { code: 'PRO', label: 'PRO' }
];

export const LEVELS: LevelInfo[] = [
  { code: 'LMD1', label: 'Licence — LMD1', speciality: 'LMD' },
  { code: 'LMD2', label: 'Licence — LMD2', speciality: 'LMD' },
  { code: 'LMD3SI', label: 'Licence — LMD3SI', speciality: 'LMD' },
  { code: 'LMD3ISIL', label: 'Licence — LMD3ISIL', speciality: 'LMD' },

  { code: 'RTW1', label: 'Licence — RTW1', speciality: 'RTW' },
  { code: 'RTW2', label: 'Licence — RTW2', speciality: 'RTW' },
  { code: 'RTW3', label: 'Licence — RTW3', speciality: 'RTW' },

  { code: 'ING1', label: 'Ingenieur — ING1', speciality: 'ING' },
  { code: 'ING2', label: 'Ingenieur — ING2', speciality: 'ING' },
  { code: 'ING3', label: 'Ingenieur — ING3', speciality: 'ING' },
  { code: 'ING4', label: 'Ingenieur — ING4', speciality: 'ING' },

  { code: 'M1SIQ', label: 'Master — M1SIQ', speciality: 'SIQ' },
  { code: 'M2SIQ', label: 'Master — M2SIQ', speciality: 'SIQ' },
  { code: 'M1STIC', label: 'Master — M1STIC', speciality: 'STIC' },
  { code: 'M2STIC', label: 'Master — M2STIC', speciality: 'STIC' },

  { code: 'PRO1', label: 'PRO — PRO1', speciality: 'PRO' },
  { code: 'PRO2', label: 'PRO — PRO2', speciality: 'PRO' },
  { code: 'PRO3', label: 'PRO — PRO3', speciality: 'PRO' }
];

export function levelsForSpeciality(speciality: SpecialityCode) {
  return LEVELS.filter((level) => level.speciality === speciality);
}

export function getLevelInfo(level: LevelCode) {
  return LEVELS.find((l) => l.code === level);
}

export type ModuleCatalogEntry = {
  level: LevelCode;
  semester: SemesterCode;
  name: string;
};

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  // Licence
  { level: 'LMD1', semester: 'S1', name: 'General Electricity' },
  { level: 'LMD1', semester: 'S1', name: 'Open Source (LMD & Pro)' },
  { level: 'LMD1', semester: 'S1', name: 'Machine Structure 1' },
  { level: 'LMD1', semester: 'S1', name: 'Algorithmics and Date Structures 1' },
  { level: 'LMD1', semester: 'S2', name: 'RTW1' },

  { level: 'RTW2', semester: 'S3', name: 'Object Oriented Programming and Frameworks' },
  { level: 'RTW2', semester: 'S3', name: 'E-Business 2025-2026' },
  { level: 'RTW2', semester: 'S3', name: 'Mobile Networks' },
  { level: 'RTW2', semester: 'S3', name: 'Web Development' },
  { level: 'RTW2', semester: 'S3', name: 'Databases' },
  { level: 'RTW2', semester: 'S4', name: 'Data mining' },

  { level: 'LMD3ISIL', semester: 'S5', name: 'Advanced Web Programming' },
  { level: 'LMD3ISIL', semester: 'S5', name: 'Numerical Economy and Strategic Foresight' },
  { level: 'LMD3ISIL', semester: 'S5', name: 'Human Computer Interaction' },
  { level: 'LMD3ISIL', semester: 'S5', name: 'Decision Support System' },
  { level: 'LMD3ISIL', semester: 'S5', name: 'Information Systems Administration' },
  { level: 'LMD3ISIL', semester: 'S5', name: "Système d'Information Distribué" },
  { level: 'LMD3ISIL', semester: 'S5', name: 'Genie Logiciel' },

  { level: 'RTW3', semester: 'S5', name: 'Mobile Applications Devloppment' },
  { level: 'RTW3', semester: 'S5', name: 'Web marketing' },
  { level: 'RTW3', semester: 'S5', name: 'Social Media Communication' },
  { level: 'RTW3', semester: 'S5', name: "Système d'information géographique" },
  { level: 'RTW3', semester: 'S5', name: 'Multimedia Development' },

  // Ingenieur
  { level: 'ING1', semester: 'S1', name: 'Algebra 01' },
  { level: 'ING1', semester: 'S1', name: 'Writing skills and Office' },
  { level: 'ING1', semester: 'S1', name: 'Introduction to Operating Systems 1' },
  { level: 'ING1', semester: 'S1', name: 'Machine Structure' },
  { level: 'ING1', semester: 'S1', name: 'Algorithmic and data structure 1' },
  { level: 'ING1', semester: 'S2', name: 'Analysis 1' },

  { level: 'ING2', semester: 'S3', name: 'Algorithms and Data Structures 3' },
  { level: 'ING2', semester: 'S3', name: 'Introduction to information systems' },
  { level: 'ING2', semester: 'S3', name: 'Probability and Statistics 2' },
  { level: 'ING2', semester: 'S3', name: 'Object-Oriented Programming 1' },
  { level: 'ING2', semester: 'S3', name: 'Mathematical Analysis III' },

  { level: 'ING3', semester: 'S5', name: 'Fundamentals of AI - PW' },
  { level: 'ING3', semester: 'S5', name: 'Dynamic and Linear Programming' },
  { level: 'ING3', semester: 'S5', name: 'NUMERICAL ANALYSIS' },
  { level: 'ING3', semester: 'S5', name: 'Compilation' },
  { level: 'ING3', semester: 'S5', name: 'Foundations of Artificial Intelligence' },
  { level: 'ING3', semester: 'S5', name: 'Software Engineering 2025 2026' },
  { level: 'ING3', semester: 'S5', name: 'Architecture and Administration of Databases' },

  { level: 'ING4', semester: 'S1', name: 'Techniques de rédaction' },
  { level: 'ING4', semester: 'S1', name: 'Recherche opérationnelle' },
  { level: 'ING4', semester: 'S1', name: 'Représentation des Connaissances et Raisonnement' },
  { level: 'ING4', semester: 'S1', name: 'Mdélisation et Simulation' },
  { level: 'ING4', semester: 'S1', name: 'Machine Learning' },
  { level: 'ING4', semester: 'S1', name: 'Business Intelligence' },
  { level: 'ING4', semester: 'S1', name: 'High Performance Computing' },

  // Master
  { level: 'M1SIQ', semester: 'S1', name: 'Systèmes Experts' },

  { level: 'M1STIC', semester: 'S1', name: "Analyse et traitement d’image 1" },
  { level: 'M1STIC', semester: 'S1', name: 'Technologies du web intelligent' },
  { level: 'M1STIC', semester: 'S1', name: "Technique de l'Intelligence Artificeille" },
  { level: 'M1STIC', semester: 'S1', name: 'Réseaux Sans Fil et de Mobiles 25-26' },
  { level: 'M1STIC', semester: 'S1', name: 'Models of Computation' },
  { level: 'M1STIC', semester: 'S1', name: 'Gestion de Projets & Entrepreneuriat' },
  { level: 'M1STIC', semester: 'S1', name: 'Advanced Databases' },

  { level: 'M2SIQ', semester: 'S3', name: 'Recherche opérationnelle avancée' },
  { level: 'M2SIQ', semester: 'S3', name: 'Architecture Parallèle' },
  { level: 'M2SIQ', semester: 'S3', name: 'parallel algorithm' },
  { level: 'M2SIQ', semester: 'S3', name: 'Méthodologie de La recherche Scientifique' },
  { level: 'M2SIQ', semester: 'S3', name: 'Advanced Software Engineering' },
  { level: 'M2SIQ', semester: 'S3', name: 'Méthodes Formelles pour le Parallélisme' },
  { level: 'M2SIQ', semester: 'S3', name: 'Bases de données avancées' },

  { level: 'M2STIC', semester: 'S3', name: 'َApprentissage Automatique 25-26' },
  { level: 'M2STIC', semester: 'S3', name: 'Analyse de données massives' },
  { level: 'M2STIC', semester: 'S3', name: 'Intelligence Artificielle et Reconnaissance de Formes' },
  { level: 'M2STIC', semester: 'S3', name: 'Scientific research methodology' },
  { level: 'M2STIC', semester: 'S3', name: 'Les méthodes bio-inspirées' },
  { level: 'M2STIC', semester: 'S3', name: 'Knowledge Engineering' },
  { level: 'M2STIC', semester: 'S3', name: "Techniques d'optimisation" },
  { level: 'M2STIC', semester: 'S3', name: 'Development of distributed applications' }
];

export function getDefaultModulesForLevel(level: LevelCode) {
  return MODULE_CATALOG.filter((entry) => entry.level === level);
}

export function toModuleCode(level: LevelCode, semester: SemesterCode, name: string) {
  const slug = name
    .normalize('NFKD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^a-zA-Z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '')
    .toUpperCase()
    .slice(0, 24);
  return `${level}-${semester}-${slug || 'MODULE'}`;
}
