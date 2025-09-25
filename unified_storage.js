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
          "A démarrer": [],
          "Inconnue": []
        },
        revues: {
          "Faite": [],
          "En cours": [],
          "A faire": [],
          "Inconnue": []
        },
        dailyEntries: {
          fait: [],
          afaire: [],
          notes: [],
          Inconnue: []
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
        if (!this.data.nextId) {
          this.data.nextId = this.calculateNextId();
        }
      } catch (e) {
        console.error("Erreur lors du chargement des données:", e);
      }
    }
    this.migrateOldData();
  }

  calculateNextId() {
    const existingIds = Object.keys(this.data.items).map(id => parseInt(id)).filter(id => !isNaN(id));
    return existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
  }

  migrateOldData() {
    let needsMigration = false;

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
    const id = item.id || this.generateId().toString();
    const statut = item.statut || "Inconnue";

    this.data.items[id] = {
      ...item,
      id,
      type,
      date_ajout: item.date_ajout || new Date().toISOString()
    };

    if (type === 'sujet') {
      const target = this.data.categories.sujets[statut] ? statut : "Inconnue";
      if (!this.data.categories.sujets[target].includes(id)) {
        this.data.categories.sujets[target].push(id);
      }
    } else if (type === 'revue') {
      const target = this.data.categories.revues[statut] ? statut : "Inconnue";
      if (!this.data.categories.revues[target].includes(id)) {
        this.data.categories.revues[target].push(id);
      }
    } else if (type === 'daily') {
      const target = this.data.categories.dailyEntries[section] ? section : "Inconnue";
      if (!this.data.categories.dailyEntries[target].includes(id)) {
        this.data.categories.dailyEntries[target].push(id);
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

  // --- Nouvelle méthode générique ---
  addItem(type, sectionOrStatut, data) {
    const id = this.generateId().toString();
    const item = {
      ...data,
      id,
      type,
      date_ajout: new Date().toISOString()
    };
    this.data.items[id] = item;

    if (type === "sujet") {
      const statut = this.data.categories.sujets[sectionOrStatut] ? sectionOrStatut : "Inconnue";
      this.data.categories.sujets[statut].push(id);
    } else if (type === "revue") {
      const statut = this.data.categories.revues[sectionOrStatut] ? sectionOrStatut : "Inconnue";
      this.data.categories.revues[statut].push(id);
    } else if (type === "daily") {
      const section = this.data.categories.dailyEntries[sectionOrStatut] ? sectionOrStatut : "Inconnue";
      item.section = section;
      this.data.categories.dailyEntries[section].push(id);
    }

    this.save();
    return item;
  }

  // --- Suppression centralisée ---
  deleteItem(id) {
    const item = this.data.items[id];
    if (!item) return;

    if (item.type === "sujet") {
      Object.keys(this.data.categories.sujets).forEach(statut => {
        this.data.categories.sujets[statut] = this.data.categories.sujets[statut].filter(x => x !== id);
      });
    } else if (item.type === "revue") {
      Object.keys(this.data.categories.revues).forEach(statut => {
        this.data.categories.revues[statut] = this.data.categories.revues[statut].filter(x => x !== id);
      });
    } else if (item.type === "daily") {
      Object.keys(this.data.categories.dailyEntries).forEach(section => {
        this.data.categories.dailyEntries[section] = this.data.categories.dailyEntries[section].filter(x => x !== id);
      });
    }

    delete this.data.items[id];
    this.save();
  }

  // --- Recherche robuste ---
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

      if (searchFields.some(field => String(field).toLowerCase().includes(query))) {
        results.push({ ...item, source: item.type });
      }
    });

    return results;
  }

  // --- Import avec fusion profonde ---
  importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);

        // Fusion des items
        Object.values(imported.items || {}).forEach(item => {
          this.data.items[item.id] = item;
        });

        // Fusion des catégories
        ["sujets", "revues"].forEach(type => {
          if (imported.categories?.[type]) {
            Object.keys(imported.categories[type]).forEach(statut => {
              if (!this.data.categories[type][statut]) {
                this.data.categories[type][statut] = [];
              }
              imported.categories[type][statut].forEach(id => {
                if (this.data.items[id] && !this.data.categories[type][statut].includes(id)) {
                  this.data.categories[type][statut].push(id);
                }
              });
            });
          }
        });

        if (imported.categories?.dailyEntries) {
          Object.keys(imported.categories.dailyEntries).forEach(section => {
            if (!this.data.categories.dailyEntries[section]) {
              this.data.categories.dailyEntries[section] = [];
            }
            imported.categories.dailyEntries[section].forEach(id => {
              if (this.data.items[id] && !this.data.categories.dailyEntries[section].includes(id)) {
                this.data.categories.dailyEntries[section].push(id);
              }
            });
          });
        }

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

  exportData() {
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `unified_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  }

    // --- Wrappers de compatibilité ---

  addSujet(sujet) {
    return this.addItem("sujet", sujet.statut, sujet);
  }

  updateSujet(id, updates) {
    const item = this.data.items[id];
    if (!item || item.type !== 'sujet') return null;
    const oldStatut = item.statut;
    const newStatut = updates.statut;

    Object.assign(item, updates);
    if (oldStatut !== newStatut) {
      const oldList = this.data.categories.sujets[oldStatut] || [];
      this.data.categories.sujets[oldStatut] = oldList.filter(x => x !== id);
      const target = this.data.categories.sujets[newStatut] ? newStatut : "Inconnue";
      this.data.categories.sujets[target].push(id);
    }
    this.save();
    return item;
  }

  deleteSujet(id) {
    this.deleteItem(id);
  }

  getSujets() {
    const result = {};
    Object.keys(this.data.categories.sujets).forEach(statut => {
      result[statut] = this.data.categories.sujets[statut].map(id => this.data.items[id]).filter(Boolean);
    });
    return result;
  }

  addRevue(revue) {
    return this.addItem("revue", revue.statut, revue);
  }

  updateRevue(id, updates) {
    const item = this.data.items[id];
    if (!item || item.type !== 'revue') return null;
    const oldStatut = item.statut;
    const newStatut = updates.statut;

    Object.assign(item, updates);
    if (oldStatut !== newStatut) {
      const oldList = this.data.categories.revues[oldStatut] || [];
      this.data.categories.revues[oldStatut] = oldList.filter(x => x !== id);
      const target = this.data.categories.revues[newStatut] ? newStatut : "Inconnue";
      this.data.categories.revues[target].push(id);
    }
    this.save();
    return item;
  }

  deleteRevue(id) {
    this.deleteItem(id);
  }

  getRevues() {
    const result = {};
    Object.keys(this.data.categories.revues).forEach(statut => {
      result[statut] = this.data.categories.revues[statut].map(id => this.data.items[id]).filter(Boolean);
    });
    return result;
  }

  addDailyEntry(section, entry) {
    return this.addItem("daily", section, entry);
  }

  updateDailyEntry(oldSection, id, newSection, updates) {
    const item = this.data.items[id];
    if (!item || item.type !== 'daily') return null;

    Object.assign(item, updates);
    item.section = newSection;

    if (oldSection !== newSection) {
      this.data.categories.dailyEntries[oldSection] = (this.data.categories.dailyEntries[oldSection] || []).filter(x => x !== id);
      const target = this.data.categories.dailyEntries[newSection] ? newSection : "Inconnue";
      this.data.categories.dailyEntries[target].push(id);
    }
    this.save();
    return item;
  }

  deleteDailyEntry(section, id) {
    this.deleteItem(id);
  }

  getDailyEntries() {
    const result = {};
    Object.keys(this.data.categories.dailyEntries).forEach(section => {
      result[section] = this.data.categories.dailyEntries[section].map(id => this.data.items[id]).filter(Boolean);
    });
    return result;
  }
}

// Instance globale
window.unifiedStorage = new UnifiedStorage();

console.log("Unified Storage Manager (Refactored + Improvements) loaded");
