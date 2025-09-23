// Gestionnaire de stockage unifié avec structure normalisée
const UNIFIED_STORAGE_KEY = "unified_app_data";

class UnifiedStorage {
  constructor() {
    this.data = {
      nextId: 1,
      items: {}, // Tous les éléments stockés par ID
      categories: {
        sujets: {
          "Terminé": [],
          "En attente": [],
          "En validation": [],
          "En revue": [],
          "En cours": [],
          "A démarrer": []
        },
        revues: {
          "Faite": [],
          "En cours": [],
          "A faire": []
        },
        dailyEntries: {
          fait: [],
          afaire: [],
          notes: []
        }
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
        // S'assurer que nextId est défini
        if (!this.data.nextId) {
          this.data.nextId = this.calculateNextId();
        }
      } catch (e) {
        console.error("Erreur lors du chargement des données:", e);
      }
    }
    
    // Migration depuis l'ancien format
    this.migrateOldData();
  }

  calculateNextId() {
    const existingIds = Object.keys(this.data.items).map(id => parseInt(id)).filter(id => !isNaN(id));
    return existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
  }

  migrateOldData() {
    let needsMigration = false;

    // Migration depuis l'ancien format unified_storage ou ordet_data
    const ordenData = localStorage.getItem("ordet_data");
    if (ordenData) {
      try {
        const parsed = JSON.parse(ordenData);
        if (parsed.sujets) {
          parsed.sujets.forEach(sujet => this.migrateItem(sujet, 'sujet'));
          needsMigration = true;
        }
        if (parsed.revues) {
          parsed.revues.forEach(revue => this.migrateItem(revue, 'revue'));
          needsMigration = true;
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
        Object.keys(parsed).forEach(section => {
          if (parsed[section] && Array.isArray(parsed[section])) {
            parsed[section].forEach(entry => this.migrateItem(entry, 'daily', section));
            needsMigration = true;
          }
        });
      } catch (e) {
        console.error("Erreur migration dailyr_data:", e);
      }
    }

    // Migration depuis l'ancien format de ce même storage
    if (this.data.sujets && Array.isArray(this.data.sujets)) {
      this.data.sujets.forEach(sujet => this.migrateItem(sujet, 'sujet'));
      delete this.data.sujets;
      needsMigration = true;
    }

    if (this.data.revues && Array.isArray(this.data.revues)) {
      this.data.revues.forEach(revue => this.migrateItem(revue, 'revue'));
      delete this.data.revues;
      needsMigration = true;
    }

    if (this.data.dailyEntries && Object.values(this.data.dailyEntries).some(arr => Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object')) {
      Object.keys(this.data.dailyEntries).forEach(section => {
        if (Array.isArray(this.data.dailyEntries[section])) {
          this.data.dailyEntries[section].forEach(entry => {
            if (typeof entry === 'object') {
              this.migrateItem(entry, 'daily', section);
            }
          });
          this.data.dailyEntries[section] = this.data.dailyEntries[section].filter(item => typeof item === 'string');
        }
      });
      needsMigration = true;
    }

    if (needsMigration) {
      this.save();
    }
  }

  migrateItem(item, type, section = null) {
    // Générer un nouvel ID si nécessaire
    const id = item.id || this.generateId().toString();
    
    // Stocker l'élément avec son type
    this.data.items[id] = {
      ...item,
      id,
      type,
      date_ajout: item.date_ajout || new Date().toISOString()
    };

    // Ajouter l'ID dans la bonne catégorie
    if (type === 'sujet' && item.statut && this.data.categories.sujets[item.statut]) {
      if (!this.data.categories.sujets[item.statut].includes(id)) {
        this.data.categories.sujets[item.statut].push(id);
      }
    } else if (type === 'revue' && item.statut && this.data.categories.revues[item.statut]) {
      if (!this.data.categories.revues[item.statut].includes(id)) {
        this.data.categories.revues[item.statut].push(id);
      }
    } else if (type === 'daily' && section && this.data.categories.dailyEntries[section]) {
      if (!this.data.categories.dailyEntries[section].includes(id)) {
        this.data.categories.dailyEntries[section].push(id);
      }
    }
  }

  generateId() {
    return this.data.nextId++;
  }

  save() {
    localStorage.setItem(UNIFIED_STORAGE_KEY, JSON.stringify(this.data));
  }

  setUrl(nouvelleUrl) {
    this.data.url = nouvelleUrl;
    this.save();
  }

  getUrl() {
    return this.data.url.replace(/\/+$/, '');
  }

  // Méthodes pour les sujets
  addSujet(sujet) {
    const id = this.generateId().toString();
    const item = {
      ...sujet,
      id,
      type: 'sujet',
      date_ajout: new Date().toISOString()
    };
    
    this.data.items[id] = item;
    this.data.categories.sujets[sujet.statut].push(id);
    this.save();
    return item;
  }

  updateSujet(id, updates) {
    const item = this.data.items[id];
    if (!item || item.type !== 'sujet') return null;

    const oldStatut = item.statut;
    const newStatut = updates.statut;

    // Mettre à jour l'élément
    Object.assign(item, updates);

    // Si le statut change, déplacer dans la bonne catégorie
    if (oldStatut !== newStatut) {
      this.data.categories.sujets[oldStatut] = this.data.categories.sujets[oldStatut].filter(itemId => itemId !== id);
      this.data.categories.sujets[newStatut].push(id);
    }

    this.save();
    return item;
  }

  deleteSujet(id) {
    const item = this.data.items[id];
    if (!item || item.type !== 'sujet') return;

    // Retirer de la catégorie
    this.data.categories.sujets[item.statut] = this.data.categories.sujets[item.statut].filter(itemId => itemId !== id);
    
    // Supprimer l'élément
    delete this.data.items[id];
    this.save();
  }

  getSujets() {
    const result = {};
    Object.keys(this.data.categories.sujets).forEach(statut => {
      result[statut] = this.data.categories.sujets[statut].map(id => this.data.items[id]).filter(Boolean);
    });
    return result;
  }

  // Méthodes pour les revues
  addRevue(revue) {
    const id = this.generateId().toString();
    const item = {
      ...revue,
      id,
      type: 'revue',
      date_ajout: new Date().toISOString()
    };
    
    this.data.items[id] = item;
    this.data.categories.revues[revue.statut].push(id);
    this.save();
    return item;
  }

  updateRevue(id, updates) {
    const item = this.data.items[id];
    if (!item || item.type !== 'revue') return null;

    const oldStatut = item.statut;
    const newStatut = updates.statut;

    Object.assign(item, updates);

    if (oldStatut !== newStatut) {
      this.data.categories.revues[oldStatut] = this.data.categories.revues[oldStatut].filter(itemId => itemId !== id);
      this.data.categories.revues[newStatut].push(id);
    }

    this.save();
    return item;
  }

  deleteRevue(id) {
    const item = this.data.items[id];
    if (!item || item.type !== 'revue') return;

    this.data.categories.revues[item.statut] = this.data.categories.revues[item.statut].filter(itemId => itemId !== id);
    delete this.data.items[id];
    this.save();
  }

  getRevues() {
    const result = {};
    Object.keys(this.data.categories.revues).forEach(statut => {
      result[statut] = this.data.categories.revues[statut].map(id => this.data.items[id]).filter(Boolean);
    });
    return result;
  }

  // Méthodes pour les entrées daily
  addDailyEntry(section, entry) {
    const id = this.generateId().toString();
    const item = {
      ...entry,
      id,
      type: 'daily',
      section,
      date_ajout: new Date().toISOString()
    };
    
    this.data.items[id] = item;
    this.data.categories.dailyEntries[section].push(id);
    this.save();
    return item;
  }

  updateDailyEntry(oldSection, id, newSection, updates) {
    const item = this.data.items[id];
    if (!item || item.type !== 'daily') return null;

    Object.assign(item, updates);
    item.section = newSection;

    if (oldSection !== newSection) {
      this.data.categories.dailyEntries[oldSection] = this.data.categories.dailyEntries[oldSection].filter(itemId => itemId !== id);
      this.data.categories.dailyEntries[newSection].push(id);
    }

    this.save();
    return item;
  }

  deleteDailyEntry(section, id) {
    const item = this.data.items[id];
    if (!item || item.type !== 'daily') return;

    this.data.categories.dailyEntries[section] = this.data.categories.dailyEntries[section].filter(itemId => itemId !== id);
    delete this.data.items[id];
    this.save();
  }

  getDailyEntries() {
    const result = {};
    Object.keys(this.data.categories.dailyEntries).forEach(section => {
      result[section] = this.data.categories.dailyEntries[section].map(id => this.data.items[id]).filter(Boolean);
    });
    return result;
  }

  // Méthodes utilitaires
  getItemById(id) {
    return this.data.items[id];
  }

  getAllItems() {
    return Object.values(this.data.items);
  }

  getAllTasks() {
    return Object.values(this.data.items).filter(item => 
      item.type === 'sujet' || item.type === 'revue' || item.type === 'daily'
    );
  }

  searchAll(query) {
    const results = [];
    query = query.toLowerCase();

    Object.values(this.data.items).forEach(item => {
      const searchFields = [
        item.jira,
        item.reference,
        item.resume,
        item.description,
        item.commentaire
      ].filter(Boolean);

      if (searchFields.some(field => field.toLowerCase().includes(query))) {
        results.push({ ...item, source: item.type });
      }
    });

    return results;
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
        if (!this.data.nextId) {
          this.data.nextId = this.calculateNextId();
        }
        this.save();
        window.location.reload();
      } catch (err) {
        alert("Fichier JSON invalide !");
      }
    };
    reader.readAsText(file);
  }
}

// Instance globale
window.unifiedStorage = new UnifiedStorage();

console.log("Unified Storage Manager (Refactored) loaded");
