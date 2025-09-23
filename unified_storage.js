// Gestionnaire de stockage unifié
const UNIFIED_STORAGE_KEY = "unified_app_data";

class UnifiedStorage {
  constructor() {
    this.data = {
      sujets: [],
      revues: [],
      dailyEntries: {
        fait: [],
        afaire: [],
        notes: []
      },
      url: ''
    };
    this.load();
  }

  load() {
    const stored = localStorage.getItem(UNIFIED_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.data = { ...this.data, ...parsed };
      } catch (e) {
        console.error("Erreur lors du chargement des données:", e);
      }
    }
    
    // Migration depuis les anciens stockages
    this.migrateOldData();
  }

  migrateOldData() {
    // Migration depuis ordet_data
    const ordenData = localStorage.getItem("ordet_data");
    if (ordenData) {
      try {
        const parsed = JSON.parse(ordenData);
        if (parsed.sujets && !this.data.sujets.length) {
          this.data.sujets = parsed.sujets;
        }
        if (parsed.revues && !this.data.revues.length) {
          this.data.revues = parsed.revues;
        }
      } catch (e) {
        console.error("Erreur migration ordet_data:", e);
      }
    }

    // Migration depuis dailyr_data
    const dailyrData = localStorage.getItem("dailyr_data");
    if (dailyrData) {
      try {
        const parsed = JSON.parse(dailyrData);
        if (parsed && Object.keys(parsed).length > 0 && 
            Object.keys(this.data.dailyEntries).every(key => this.data.dailyEntries[key].length === 0)) {
          this.data.dailyEntries = parsed;
        }
      } catch (e) {
        console.error("Erreur migration dailyr_data:", e);
      }
    }

    // Sauvegarder après migration
    this.save();
  }

  save() {
    localStorage.setItem(UNIFIED_STORAGE_KEY, JSON.stringify(this.data));
  }

  setUrl(nouvelleUrl) {
    this.data.url = nouvelleUrl;
    this.save();
  }

  getUrl() {
    return this.data.url.replace(/\/+$/, ''); // remove trailing slashes at then end (if necessary)
  }

  // Méthodes pour les sujets
  addSujet(sujet) {
    sujet.id = sujet.id || Date.now().toString();
    sujet.date_ajout = sujet.date_ajout || new Date().toISOString();
    sujet.type = 'sujet';
    this.data.sujets.push(sujet);
    this.save();
    return sujet;
  }

  updateSujet(id, updates) {
    const index = this.data.sujets.findIndex(s => s.id === id);
    if (index !== -1) {
      // Mise à jour en place pour éviter la duplication
      Object.assign(this.data.sujets[index], updates);
      this.save();
      return this.data.sujets[index];
    }
    return null;
  }

  deleteSujet(id) {
    this.data.sujets = this.data.sujets.filter(s => s.id !== id);
    this.save();
  }

  getSujets() {
    return this.data.sujets;
  }

  // Méthodes pour les revues
  addRevue(revue) {
    revue.id = revue.id || Date.now().toString();
    revue.date_ajout = revue.date_ajout || new Date().toISOString();
    revue.type = 'revue';
    this.data.revues.push(revue);
    this.save();
    return revue;
  }

  updateRevue(id, updates) {
    const index = this.data.revues.findIndex(r => r.id === id);
    if (index !== -1) {
      // Mise à jour en place pour éviter la duplication
      Object.assign(this.data.revues[index], updates);
      this.save();
      return this.data.revues[index];
    }
    return null;
  }

  deleteRevue(id) {
    this.data.revues = this.data.revues.filter(r => r.id !== id);
    this.save();
  }

  getRevues() {
    return this.data.revues;
  }

  // Méthodes pour les entrées daily
  addDailyEntry(section, entry) {
    entry.id = entry.id || Date.now().toString();
    entry.date_ajout = entry.date_ajout || new Date().toISOString();
    this.data.dailyEntries[section].push(entry);
    this.save();
    return entry;
  }

  updateDailyEntry(oldSection, id, newSection, updates) {
    const index = this.data.dailyEntries[oldSection].findIndex(e => e.id === id);
    if (index !== -1) {
      const entry = this.data.dailyEntries[oldSection][index];
      // Mise à jour des propriétés
      Object.assign(entry, updates);
      
      // Si changement de section, déplacer l'élément
      if (oldSection !== newSection) {
        // Retirer de l'ancienne section
        this.data.dailyEntries[oldSection].splice(index, 1);
        // Ajouter dans la nouvelle section
        this.data.dailyEntries[newSection].push(entry);
      }
      
      this.save();
      return entry;
    }
    return null;
  }

  deleteDailyEntry(section, id) {
    this.data.dailyEntries[section] = this.data.dailyEntries[section].filter(e => e.id !== id);
    this.save();
  }

  getDailyEntries() {
    return this.data.dailyEntries;
  }

  // Méthodes d'export/import
  exportData() {
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `unified_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  }

  importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        this.data = { ...this.data, ...imported };
        this.save();
        window.location.reload(); // Recharger la page pour afficher les nouvelles données
      } catch (err) {
        alert("Fichier JSON invalide !");
      }
    };
    reader.readAsText(file);
  }

  // Recherche unifiée
  searchAll(query) {
    const results = [];
    query = query.toLowerCase();

    // Chercher dans les sujets
    this.data.sujets.forEach(sujet => {
      if (sujet.jira.toLowerCase().includes(query) || 
          sujet.resume.toLowerCase().includes(query) || 
          sujet.commentaire.toLowerCase().includes(query)) {
        results.push({ ...sujet, source: 'sujet' });
      }
    });

    // Chercher dans les revues
    this.data.revues.forEach(revue => {
      if (revue.jira.toLowerCase().includes(query) || 
          revue.resume.toLowerCase().includes(query) || 
          revue.commentaire.toLowerCase().includes(query)) {
        results.push({ ...revue, source: 'revue' });
      }
    });

    // Chercher dans les daily entries
    Object.keys(this.data.dailyEntries).forEach(section => {
      this.data.dailyEntries[section].forEach(entry => {
        if ((entry.reference && entry.reference.toLowerCase().includes(query)) ||
            (entry.description && entry.description.toLowerCase().includes(query)) ||
            (entry.commentaire && entry.commentaire.toLowerCase().includes(query))) {
          results.push({ ...entry, source: 'daily', section });
        }
      });
    });

    return results;
  }

  getAllTasks() {
    return [
      ...this.data.sujets,
      ...this.data.revues,
      ...this.data.dailyEntries.fait,
      ...this.data.dailyEntries.afaire,
      ...this.data.dailyEntries.notes
    ];
  }

}

// Instance globale
window.unifiedStorage = new UnifiedStorage();

console.log("Unified Storage Manager loaded");
