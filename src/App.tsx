/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { ClinicalForm, RecordEntry, FavoriteSection } from './types/clinical';
import {
  getSavedForms,
  saveForms,
  getActiveFormId,
  setActiveFormId,
  getRecordsForForm,
  saveRecordsForForm,
  getFavoriteSections,
  addFavoriteSection,
  deleteFavoriteSection,
} from './utils/storage';
import { generateSampleRecords } from './utils/exporter';
import { Navbar } from './components/Navbar';
import { IntakeForm } from './components/IntakeForm';
import { DataTable } from './components/DataTable';
import { FormBuilder } from './components/FormBuilder';
import { ExportView } from './components/ExportView';
import { MergeView } from './components/MergeView';
import { TemplateSelectorModal } from './components/TemplateSelectorModal';
import { Sparkles, HelpCircle, Star } from 'lucide-react';

export default function App() {
  const [forms, setForms] = useState<ClinicalForm[]>(() => getSavedForms());
  const [activeFormId, setActiveFormIdState] = useState<string>(() =>
    getActiveFormId(forms)
  );
  const [activeTab, setActiveTab] = useState<'intake' | 'records' | 'builder' | 'export' | 'merge'>('intake');
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [showHelperBanner, setShowHelperBanner] = useState(true);
  const [favoriteSections, setFavoriteSections] = useState<FavoriteSection[]>(() =>
    getFavoriteSections()
  );

  // Active form object
  const activeForm = useMemo(() => {
    return forms.find((f) => f.id === activeFormId) || forms[0];
  }, [forms, activeFormId]);

  // Records for active form
  const [records, setRecords] = useState<RecordEntry[]>(() => {
    const initialForm = forms.find((f) => f.id === activeFormId) || forms[0];
    return getRecordsForForm(initialForm);
  });

  // Whenever activeFormId changes, reload its records
  useEffect(() => {
    if (activeForm) {
      const recs = getRecordsForForm(activeForm);
      setRecords(recs);
      setActiveFormId(activeForm.id);
    }
  }, [activeForm]);

  // Handle saving new case
  const handleSaveRecord = (newEntry: RecordEntry, _andNext: boolean) => {
    const updated = [...records, newEntry];
    setRecords(updated);
    saveRecordsForForm(activeForm.id, updated);
  };

  // Handle updating existing case
  const handleUpdateRecord = (updatedRec: RecordEntry) => {
    const updated = records.map((r) => (r.id === updatedRec.id ? updatedRec : r));
    setRecords(updated);
    saveRecordsForForm(activeForm.id, updated);
  };

  // Handle delete one record
  const handleDeleteRecord = (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    saveRecordsForForm(activeForm.id, updated);
  };

  // Handle delete all records
  const handleDeleteAllRecords = () => {
    setRecords([]);
    saveRecordsForForm(activeForm.id, []);
  };

  // Handle saving form schema
  const handleSaveForm = (updatedForm: ClinicalForm) => {
    const updatedForms = forms.map((f) => (f.id === updatedForm.id ? updatedForm : f));
    setForms(updatedForms);
    saveForms(updatedForms);
  };

  // Handle creating new form
  const handleCreateNewForm = (title: string, prefix: string) => {
    const newForm: ClinicalForm = {
      id: 'form-' + Date.now(),
      title,
      description: 'Formulario clínico personalizado para captura de datos.',
      category: 'general',
      codePrefix: prefix,
      sections: ['Datos Principales', 'Observaciones'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fields: [
        {
          id: 'f_' + Date.now(),
          name: 'edad',
          label: 'Edad del Sujeto',
          type: 'number',
          section: 'Datos Principales',
          required: true,
          unit: 'años',
        },
        {
          id: 'f_' + (Date.now() + 1),
          name: 'sexo',
          label: 'Sexo',
          type: 'radio',
          section: 'Datos Principales',
          options: ['Femenino', 'Masculino'],
          required: true,
        },
      ],
    };

    const newFormsList = [newForm, ...forms];
    setForms(newFormsList);
    saveForms(newFormsList);
    setActiveFormIdState(newForm.id);
    setActiveTab('builder');
  };

  // Handle selecting template from modal
  const handleSelectTemplate = (template: ClinicalForm) => {
    // Check if already in forms
    const exists = forms.find((f) => f.id === template.id);
    if (!exists) {
      const updatedForms = [...forms, template];
      setForms(updatedForms);
      saveForms(updatedForms);
    }
    setActiveFormIdState(template.id);
    setActiveTab('intake');
  };

  // Handle applying merge
  const handleApplyMerge = (mergedRecords: RecordEntry[], newFields?: string[]) => {
    setRecords(mergedRecords);
    saveRecordsForForm(activeForm.id, mergedRecords);

    // If external file brought new columns not present in form, add them cleanly
    if (newFields && newFields.length > 0) {
      const existingNames = new Set(activeForm.fields.map((f) => f.name));
      const fieldsToAdd = newFields.filter((col) => !existingNames.has(col));

      if (fieldsToAdd.length > 0) {
        const appendedFields = fieldsToAdd.map((colName, i) => ({
          id: 'f_ext_' + Date.now() + '_' + i,
          name: colName,
          label: colName.replace(/_/g, ' ').toUpperCase(),
          type: 'text' as const,
          section: activeForm.sections[0] || 'General',
          required: false,
        }));

        const updatedForm: ClinicalForm = {
          ...activeForm,
          fields: [...activeForm.fields, ...appendedFields],
          updatedAt: new Date().toISOString(),
        };

        handleSaveForm(updatedForm);
      }
    }
  };

  // Handle saving a new or modified favorite section
  const handleSaveNewFavoriteSection = (newSec: FavoriteSection) => {
    const updated = addFavoriteSection(newSec);
    setFavoriteSections(updated);
  };

  // Handle deleting a favorite section
  const handleDeleteFavoriteSection = (id: string) => {
    const updated = deleteFavoriteSection(id);
    setFavoriteSections(updated);
  };

  // Quick helper to generate sample records
  const handleAddSampleCases = () => {
    const samples = generateSampleRecords(activeForm, 5);
    const updated = [...records, ...samples];
    setRecords(updated);
    saveRecordsForForm(activeForm.id, updated);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeForm={activeForm}
        forms={forms}
        onSelectForm={(id) => setActiveFormIdState(id)}
        onOpenTemplatesModal={() => setIsTemplatesModalOpen(true)}
        recordCount={records.length}
      />

      {/* Health Sciences Ergonomics Banner (Closable) */}
      {showHelperBanner && activeTab === 'intake' && (
        <div className="bg-teal-900 text-teal-100 text-xs py-2 px-4 border-b border-teal-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-300 shrink-0" />
              <span>
                <strong>Flujo Ágil para Ciencias de la Salud:</strong> Rellena caso por caso con validación clínica y fórmulas automáticas (IMC, PAM, Braden). Presiona{' '}
                <kbd className="px-1 py-0.5 bg-teal-800 border border-teal-700 rounded font-mono text-[10px]">
                  Ctrl+Enter
                </kbd>{' '}
                para guardar y pasar al siguiente inmediatamente.
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleAddSampleCases}
                className="text-[11px] font-semibold text-teal-200 hover:text-white underline"
                title="Generar 5 registros de prueba aleatorios"
              >
                + Generar 5 casos de prueba
              </button>
              <button
                onClick={() => setShowHelperBanner(false)}
                className="text-teal-400 hover:text-white"
                title="Ocultar aviso"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main App Content Viewport */}
      <main className="flex-1 pb-16">
        {activeTab === 'intake' && (
          <IntakeForm
            form={activeForm}
            records={records}
            onSaveRecord={handleSaveRecord}
            onGoToRecords={() => setActiveTab('records')}
          />
        )}

        {activeTab === 'records' && (
          <DataTable
            form={activeForm}
            records={records}
            onUpdateRecord={handleUpdateRecord}
            onDeleteRecord={handleDeleteRecord}
            onDeleteAll={handleDeleteAllRecords}
            onGoToIntake={() => setActiveTab('intake')}
          />
        )}

        {activeTab === 'builder' && (
          <FormBuilder
            form={activeForm}
            onSaveForm={handleSaveForm}
            onCreateNewForm={handleCreateNewForm}
            favoriteSections={favoriteSections}
            onSaveNewFavoriteSection={handleSaveNewFavoriteSection}
            onDeleteFavoriteSection={handleDeleteFavoriteSection}
          />
        )}

        {activeTab === 'export' && <ExportView form={activeForm} records={records} />}

        {activeTab === 'merge' && (
          <MergeView
            form={activeForm}
            currentRecords={records}
            onApplyMerge={handleApplyMerge}
            onGoToRecords={() => setActiveTab('records')}
          />
        )}
      </main>

      {/* Clinical Template Selector Modal */}
      <TemplateSelectorModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        activeTemplateId={activeForm.id}
      />

      {/* Subtle Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">CliniForm</span>
            <span>·</span>
            <span>Diseñado para médicos, enfermeros e investigadores</span>
            <span>·</span>
            <span>Exportación 100% compatible con AG-Grid, Excel, SPSS y R</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Almacenamiento local seguro en el navegador (Sin fugas de datos de pacientes)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
