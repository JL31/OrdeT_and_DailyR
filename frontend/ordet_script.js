const API_URL = "http://localhost:8000/ordet";

let sujets = [];
let revues = [];
let editingItem = null;
let editingType = null;
const sujetOrder = ["Terminé", "En attente", "En validation", "En revue", "En cours", "A démarrer"];
const revueOrder = ["Faite", "En cours", "A faire"];
const url = "https://jira.portal.TUTU.com/browse";

async function loadData() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    sujets = data.sujets || [];
    revues = data.revues || [];
    renderAll();
  } catch (error) {
    console.error("Erreur de chargement des données:", error);
  }
}

async function saveData() {
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sujets, revues }),
    });
  } catch (error) {
    console.error("Erreur de sauvegarde:", error);
  }
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
      // IMPORTANT : le statut correspond exactement aux classes CSS !
      let badgeClass = item.statut;
      badgeClass = badgeClass.replace(/\s+/g, '').toLowerCase();
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
        e.stopPropagation(); // empêche la propagation à la ligne
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

// Formulaire Sujet
document.getElementById("add-sujet").onclick = () => {
  editingItem = null;
  editingType = "sujet";
  const dialog = document.getElementById("dialog-sujet");
  dialog.querySelector("form").reset();
  dialog.showModal();
};

document.getElementById("form-sujet").onsubmit = (e) => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  addOrUpdateSujet(data);
  document.getElementById("dialog-sujet").close();
};

// Formulaire Revue
document.getElementById("add-revue").onclick = () => {
  editingItem = null;
  editingType = "revue";
  const dialog = document.getElementById("dialog-revue");
  dialog.querySelector("form").reset();
  dialog.showModal();
};

document.getElementById("form-revue").onsubmit = (e) => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  addOrUpdateRevue(data);
  document.getElementById("dialog-revue").close();
};

window.onload = loadData;

document.getElementById("goto-dailyr").onclick = () => {
  window.location.href = "dailyr.html";
};
