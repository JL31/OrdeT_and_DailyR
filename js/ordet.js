// Variables globales
let editingItem = null;
let editingType = null;
const sujetOrder = ["Terminé", "En attente", "En validation", "En revue", "En cours", "A démarrer"];
const revueOrder = ["Faite", "En cours", "A faire"];
const foldedByDefault = ["Terminé", "Faite"]; // Catégories pliées par défaut

const storage = window.unifiedStorage;

// Gestion des modals
function initModals() {
  document.querySelectorAll('.modal-background, .modal-close').forEach(el => {
    el.addEventListener('click', () => {
      el.closest('.modal').classList.remove('is-active');
    });
  });
}

function showModal(modalId) {
  document.getElementById(modalId).classList.add('is-active');
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.remove('is-active');
}

// Rendu des sections
function renderAll() {
  renderSection("sujets-container", storage.getSujets(), "sujet");
  renderSection("revues-container", storage.getRevues(), "revue");
}

function renderSection(containerId, grouped, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  const order = type === "sujet" ? sujetOrder : revueOrder;

  for (const status of order) {
    if (!grouped[status] || grouped[status].length === 0) continue;
    const items = grouped[status];

    const group = document.createElement("div");
    group.className = "group";

    // Plier par défaut si dans la liste foldedByDefault
    if (foldedByDefault.includes(status)) {
      group.classList.add("is-collapsed");
    }

    const header = document.createElement("div");
    header.className = "group-header";
    
    const arrow = document.createElement("span");
    arrow.className = "arrow";
    arrow.innerHTML = "▼";

    header.appendChild(arrow);
    header.appendChild(document.createTextNode(` ${status} (${items.length})`));

    header.onclick = () => {
      group.classList.toggle("is-collapsed");
    };

    const content = document.createElement("div");
    content.className = "group-content";

    for (const item of items.sort((a, b) => new Date(a.date_ajout) - new Date(b.date_ajout))) {
      const line = document.createElement("div");
      line.className = "line";

      const badge = document.createElement("span");
      let badgeClass = item.statut.replace(/\s+/g, '').toLowerCase();
      badge.className = `badge ${badgeClass}`;
      badge.textContent = item.statut;

      const link = document.createElement("a");
      link.className = "line-link has-text-link";
      link.href = `${storage.getUrl()}/${item.jira}`;
      link.target = "_blank";
      link.textContent = item.jira;

      const resume = document.createElement("span");
      resume.className = "line-resume";
      resume.textContent = item.resume;

      const commentaire = document.createElement("span");
      commentaire.className = "line-comment has-text-grey";
      commentaire.textContent = item.commentaire || "-";

      line.appendChild(badge);
      line.appendChild(link);
      line.appendChild(resume);
      line.appendChild(commentaire);

      badge.onclick = (e) => {
        e.stopPropagation();
        editingItem = item;
        editingType = type;
        const modal = document.getElementById(`modal-${type}`);
        const form = modal.querySelector("form");
        form.statut.value = item.statut;
        form.jira.value = item.jira;
        form.resume.value = item.resume;
        form.commentaire.value = item.commentaire || '';
        showModal(`modal-${type}`);
      };

      content.appendChild(line);
    }

    group.appendChild(header);
    group.appendChild(content);
    container.appendChild(group);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  initModals();
  renderAll();

  // Navbar actions
  document.getElementById('navbar-add-sujet').onclick = () => {
    editingItem = null;
    editingType = "sujet";
    document.getElementById("form-sujet").reset();
    showModal("modal-sujet");
  };

  document.getElementById('navbar-add-revue').onclick = () => {
    editingItem = null;
    editingType = "revue";
    document.getElementById("form-revue").reset();
    showModal("modal-revue");
  };

  document.getElementById('navbar-jira-url').onclick = () => {
    document.getElementById("jira-url-id").value = storage.getUrl();
    showModal("modal-set-jira-url");
  };

  document.getElementById('navbar-export').onclick = () => {
    storage.exportData();
  };

  document.getElementById('navbar-import-file').onchange = (e) => {
    if (e.target.files[0]) {
      storage.importData(e.target.files[0]);
    }
  };

  // Définir l'URL du projet Jira
  const btn = document.getElementById('set-jira-url');

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const url = document.getElementById("jira-url-id").value;
    storage.setUrl(url);
    hideModal("modal-set-jira-url");
  });

  // Forms
  document.getElementById("form-sujet").onsubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = {
      statut: form.get('statut'),
      jira: form.get('jira').trim(),
      resume: form.get('resume').trim(),
      commentaire: form.get('commentaire').trim(),
    };

    if (editingItem && editingType === "sujet") {
      storage.updateSujet(editingItem.id, data);
    } else {
      storage.addSujet(data);
    }

    editingItem = null;
    editingType = null;
    renderAll();
    hideModal("modal-sujet");
  };

  document.getElementById("form-revue").onsubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = {
      statut: form.get('statut'),
      jira: form.get('jira').trim(),
      resume: form.get('resume').trim(),
      commentaire: form.get('commentaire').trim(),
    };

    if (editingItem && editingType === "revue") {
      storage.updateRevue(editingItem.id, data);
    } else {
      storage.addRevue(data);
    }

    editingItem = null;
    editingType = null;
    renderAll();
    hideModal("modal-revue");
  };

  // Burger menu pour mobile
  const burger = document.querySelector('.navbar-burger');
  const menu = document.querySelector('.navbar-menu');
  
  if (burger) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('is-active');
      menu.classList.toggle('is-active');
    });
  }
});
