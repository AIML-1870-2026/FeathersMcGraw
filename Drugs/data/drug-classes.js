/* drug-classes.js — Curated drug class → member drug mapping */

const DRUG_CLASS_MAP = {
  'SSRIs': {
    drugs: ['Fluoxetine', 'Sertraline', 'Escitalopram', 'Paroxetine', 'Citalopram', 'Fluvoxamine'],
    keywords: ['selective serotonin reuptake', 'ssri']
  },
  'NSAIDs': {
    drugs: ['Ibuprofen', 'Naproxen', 'Ketorolac', 'Diclofenac', 'Celecoxib', 'Meloxicam', 'Indomethacin'],
    keywords: ['nonsteroidal anti-inflammatory', 'nsaid', 'cyclooxygenase']
  },
  'Beta Blockers': {
    drugs: ['Metoprolol', 'Atenolol', 'Carvedilol', 'Propranolol', 'Bisoprolol', 'Labetalol', 'Timolol'],
    keywords: ['beta-adrenergic blocker', 'beta blocker', 'adrenergic blocking agent']
  },
  'ACE Inhibitors': {
    drugs: ['Lisinopril', 'Enalapril', 'Ramipril', 'Benazepril', 'Quinapril', 'Fosinopril', 'Captopril'],
    keywords: ['angiotensin converting enzyme', 'ace inhibitor']
  },
  'Statins': {
    drugs: ['Atorvastatin', 'Rosuvastatin', 'Simvastatin', 'Pravastatin', 'Lovastatin', 'Fluvastatin', 'Pitavastatin'],
    keywords: ['hmg-coa reductase', 'statin', 'hydroxymethylglutaryl']
  },
  'Benzodiazepines': {
    drugs: ['Lorazepam', 'Diazepam', 'Clonazepam', 'Alprazolam', 'Temazepam', 'Midazolam', 'Triazolam'],
    keywords: ['benzodiazepine', 'gaba enhancer', 'anxiolytic sedative']
  },
  'Opioids': {
    drugs: ['Oxycodone', 'Hydrocodone', 'Morphine', 'Codeine', 'Fentanyl', 'Tramadol', 'Hydromorphone', 'Buprenorphine'],
    keywords: ['opioid', 'opiate', 'narcotic analgesic', 'mu opioid receptor']
  },
  'Anticoagulants': {
    drugs: ['Warfarin', 'Apixaban', 'Rivaroxaban', 'Dabigatran', 'Heparin', 'Enoxaparin', 'Edoxaban'],
    keywords: ['anticoagulant', 'factor xa inhibitor', 'thrombin inhibitor', 'vitamin k antagonist']
  },
  'Proton Pump Inhibitors': {
    drugs: ['Omeprazole', 'Pantoprazole', 'Esomeprazole', 'Lansoprazole', 'Rabeprazole'],
    keywords: ['proton pump inhibitor', 'ppi', 'h+/k+ atpase']
  },
  'Antipsychotics': {
    drugs: ['Quetiapine', 'Risperidone', 'Haloperidol', 'Olanzapine', 'Aripiprazole', 'Clozapine', 'Ziprasidone'],
    keywords: ['antipsychotic', 'dopamine antagonist', 'neuroleptic', 'typical antipsychotic', 'atypical antipsychotic']
  }
};

const CNS_DEPRESSANT_CLASSES = new Set(['Opioids', 'Benzodiazepines', 'Antipsychotics']);
