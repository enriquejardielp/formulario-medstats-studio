import { ClinicalForm, RecordEntry, FavoriteSection } from '../types/clinical';
import { CLINICAL_TEMPLATES } from '../data/templates';
import { DEFAULT_FAVORITE_SECTIONS } from '../data/favoriteSections';
import { generateSampleRecords } from './exporter';

const FORMS_KEY = 'cliniform_saved_forms_v1';
const ACTIVE_FORM_ID_KEY = 'cliniform_active_form_id_v1';
const RECORDS_PREFIX = 'cliniform_records_';

export function getSavedForms(): ClinicalForm[] {
  try {
    const raw = localStorage.getItem(FORMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading forms from storage:', e);
  }

  // Initial default: copy templates to storage
  const defaults = [...CLINICAL_TEMPLATES];
  saveForms(defaults);
  return defaults;
}

export function saveForms(forms: ClinicalForm[]) {
  try {
    localStorage.setItem(FORMS_KEY, JSON.stringify(forms));
  } catch (e) {
    console.error('Error saving forms:', e);
  }
}

export function getActiveFormId(forms: ClinicalForm[]): string {
  const saved = localStorage.getItem(ACTIVE_FORM_ID_KEY);
  if (saved && forms.some((f) => f.id === saved)) {
    return saved;
  }
  return forms[0]?.id || CLINICAL_TEMPLATES[0].id;
}

export function setActiveFormId(id: string) {
  localStorage.setItem(ACTIVE_FORM_ID_KEY, id);
}

export function getRecordsForForm(form: ClinicalForm): RecordEntry[] {
  const key = `${RECORDS_PREFIX}${form.id}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading records for form:', form.id, e);
  }

  // Pre-seed first form with 4 realistic sample records if first time
  if (form.id === CLINICAL_TEMPLATES[0].id) {
    const initial = generateSampleRecords(form, 4);
    saveRecordsForForm(form.id, initial);
    return initial;
  }

  return [];
}

export function saveRecordsForForm(formId: string, records: RecordEntry[]) {
  const key = `${RECORDS_PREFIX}${formId}`;
  try {
    localStorage.setItem(key, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving records for form:', formId, e);
  }
}

// Favorite Sections Storage
const FAVORITE_SECTIONS_KEY = 'cliniform_favorite_sections_v1';

export function getFavoriteSections(): FavoriteSection[] {
  try {
    const raw = localStorage.getItem(FAVORITE_SECTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading favorite sections from storage:', e);
  }

  // Initial default: copy default favorite sections to storage
  const defaults = [...DEFAULT_FAVORITE_SECTIONS];
  saveFavoriteSections(defaults);
  return defaults;
}

export function saveFavoriteSections(sections: FavoriteSection[]) {
  try {
    localStorage.setItem(FAVORITE_SECTIONS_KEY, JSON.stringify(sections));
  } catch (e) {
    console.error('Error saving favorite sections:', e);
  }
}

export function addFavoriteSection(newSection: FavoriteSection): FavoriteSection[] {
  const current = getFavoriteSections();
  const existsIdx = current.findIndex((s) => s.id === newSection.id || s.title.toLowerCase() === newSection.title.toLowerCase());
  let updated: FavoriteSection[];
  if (existsIdx >= 0) {
    updated = current.map((s, idx) => (idx === existsIdx ? newSection : s));
  } else {
    updated = [newSection, ...current];
  }
  saveFavoriteSections(updated);
  return updated;
}

export function deleteFavoriteSection(id: string): FavoriteSection[] {
  const current = getFavoriteSections();
  const updated = current.filter((s) => s.id !== id);
  saveFavoriteSections(updated);
  return updated;
}

