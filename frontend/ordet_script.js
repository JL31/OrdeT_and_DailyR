const STORAGE_KEY = "ordet_data";

let sujets = [];
let revues = [];
let editingItem = null;
let editingType = null;
const sujetOrder = ["Terminé", "En attente", "En validation", "En revue", "En cours", "A démarrer"];
const revueOrder = ["Faite", "En cours", "A faire"];
const url = "https://jira.portal.TUTU.com/browse";

function loadData() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    const parsed = JSON.parse(data);
    sujets = parsed.sujets || [];
    revues = parsed.revues || [];
  }
  renderAll();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ sujets, revues }));
}

function addOrUpdateSujet(data) {
  if (editingItem && editingType === "sujet") {
    const index = sujets.findIndex(s => s.date_ajout === editingItem.date_ajout);
    if (index !== -1) {
      sujets[index] = { ...data, date_ajout: editingItem.date_ajout };
    }
  } else {
    sujets.push({ ...data, date_ajout: new Date().toISOString() });
  }
  editingItem = null;
  editingType = null;
  saveData();
  renderAll();
}

function addOrUpdateRevue(data) {
  if (editingItem && editingType === "revue") {
    const index = revues.findIndex(r => r.date_ajout === editingItem.date_ajout);
    if (index !== -1) {
      revues[index] = { ...data, date_ajout: editingItem.date_ajout };
    }
  } else {
    revues.push({ ...data, date_ajout: new Date().toISOString() });
  }
  editingItem = null;
  editingType = null;
  saveData();
  renderAll();
}

function renderAll() {
  renderSection("sujets-container", groupByStatus(sujets), "", "sujet");
  renderSection("revues-container", groupByStatus(revues), "", "revue");
}

function groupByStatus(items) {
  const map = {};
  for (const item of items.sort((a, b) => new Date(a.date_ajout) - new Date(b.date_ajout))) {
    if (!map[item.statut]) map[item.statut] = [];
    map[item.statut].push(item);
  }
  return map;
}

function renderSection(containerId, grouped, defaultCollapsed, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  const order = type === "sujet" ? sujetOrder : revueOrder;

  for (const status of order) {
    if (!grouped[status]) continue;
    const items = grouped[status];

    const group = document.createElement("div");
    group.className = "group" + (status === defaultCollapsed ? " collapsed" : "");

    const header = document.createElement("div");
    header.className = "group-header";
    const arrow = document.createElement("span");
    arrow.className = "arrow";
    arrow.textContent = "▾";

    header.appendChild(arrow);
    header.appendChild(document.createTextNode(status));

    header.onclick = () => {
      group.classList.toggle("collapsed");
    };

    const content = document.createElement("div");
    content.className = "group-content";

    for (const item of items) {
      const line = document.createElement("div");
      line.className = "line";

      const badge = document.createElement("span");
      let badgeClass = item.statut.replace(/\s+/g, '').toLowerCase();
      badge.className = `badge ${badgeClass}`;
      badge.textContent = item.statut;

      const link = document.createElement("a");
      link.href = `${url}/${item.jira}`;
      link.target = "_blank";
      link.textContent = item.jira;

      const resume = document.createElement("span");
      resume.textContent = item.resume;

      const commentaire = document.createElement("span");
      commentaire.textContent = item.commentaire;

      line.appendChild(badge);
      line.appendChild(link);
      line.appendChild(resume);
      line.appendChild(commentaire);

      badge.onclick = (e) => {
        e.stopPropagation();
        editingItem = item;
        editingType = type;
        const dialog = document.getElementById(`dialog-${type}`);
        const form = dialog.querySelector("form");
        form.statut.value = item.statut;
        form.jira.value = item.jira;
        form.resume.value = item.resume;
        form.commentaire.value = item.commentaire;
        dialog.showModal();
      };

      content.appendChild(line);
    }

    group.appendChild(header);
    group.appendChild(content);
    container.appendChild(group);
  }
}

// --- Export JSON ---
function exportData() {
  const blob = new Blob([JSON.stringify({ sujets, revues }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ordet_backup.json";
  a.click();
}

// --- Import JSON ---
function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      sujets = imported.sujets || [];
      revues = imported.revues || [];
      saveData();
      renderAll();
    } catch (err) {
      alert("Fichier JSON invalide !");
    }
  };
  reader.readAsText(file);
}

// Init
window.onload = loadData;
document.getElementById("goto-dailyr").onclick = () => {
  window.location.href = "dailyr.html";
};
document.getElementById("export-btn").onclick = exportData;
document.getElementById("import-file").onchange = (e) => importData(e.target.files[0]);

// Ouvrir les dialogs pour ajouter
document.getElementById("add-sujet").onclick = () => {
  editingItem = null;
  editingType = "sujet";
  document.getElementById("form-sujet").reset();
  document.getElementById("dialog-sujet").showModal();
};

document.getElementById("add-revue").onclick = () => {
  editingItem = null;
  editingType = "revue";
  document.getElementById("form-revue").reset();
  document.getElementById("dialog-revue").showModal();
};

// Soumission form Sujet
document.getElementById("form-sujet").onsubmit = (e) => {
  e.preventDefault();
  const form = e.target;
  addOrUpdateSujet({
    statut: form.statut.value,
    jira: form.jira.value.trim(),
    resume: form.resume.value.trim(),
    commentaire: form.commentaire.value.trim(),
  });
  document.getElementById("dialog-sujet").close();
};

// Soumission form Revue
document.getElementById("form-revue").onsubmit = (e) => {
  e.preventDefault();
  const form = e.target;
  addOrUpdateRevue({
    statut: form.statut.value,
    jira: form.jira.value.trim(),
    resume: form.resume.value.trim(),
    commentaire: form.commentaire.value.trim(),
  });
  document.getElementById("dialog-revue").close();
};
