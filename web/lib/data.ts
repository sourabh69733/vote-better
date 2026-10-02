import fs from 'fs';
import path from 'path';

export function getCandidateById(id: string) {
  try {
    const dataPath = path.join(process.cwd(), 'public/data/candidates', `${id}.json`);
    const fileContents = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error(`Error loading candidate ${id}:`, error);
    return null;
  }
}

export function getConstituencyById(id: string) {
  try {
    const dataPath = path.join(process.cwd(), 'public/data/constituencies', `${id}.json`);
    const fileContents = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error(`Error loading constituency ${id}:`, error);
    return null;
  }
}

export function lookupPinCode(pincode: string) {
  try {
    const dataPath = path.join(process.cwd(), 'public/data/pin_lookup.json');
    const fileContents = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(fileContents);
    return data[pincode] || null;
  } catch (error) {
    console.error(`Error looking up pin code ${pincode}:`, error);
    return null;
  }
}

export function getAllCandidates() {
  try {
    const dirPath = path.join(process.cwd(), 'public/data/candidates');
    const fileNames = fs.readdirSync(dirPath);
    const candidates = fileNames
      .filter((fileName) => fileName.endsWith('.json'))
      .map((fileName) => {
        const id = fileName.replace(/\.json$/, '');
        return getCandidateById(id);
      })
      .filter(Boolean);
    return candidates;
  } catch (error) {
    console.error('Error loading all candidates:', error);
    return [];
  }
}

export function searchCandidates(query: string) {
  const candidates = getAllCandidates();
  if (!query) return candidates;
  const q = query.toLowerCase();
  return candidates.filter((c: { name?: string; constituency?: { name?: string }; party?: string }) =>
    c.name?.toLowerCase().includes(q) ||
    c.constituency?.name?.toLowerCase().includes(q) ||
    c.party?.toLowerCase().includes(q)
  );
}
