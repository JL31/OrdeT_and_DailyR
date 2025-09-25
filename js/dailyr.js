// Variables globales
let editingItem = null;
let editingSection = null;
let contextEntryMeta = null;
let selectedTask = null;

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

// Rendu des données
function renderAll() {
  const dailyEntries = storage.getDailyEntries();
  for (const section of ["fait", "afaire", "notes"]) {
    const container = document.getElementById(`${section}-container`);
    container.innerHTML = "";

    if (!dailyEntries[section]) continue;

    dailyEntries[section]
      .sort((a, b) => new Date(a.date_ajout) - new Date(b.date_ajout))
      .forEach(item => {
        const line = document.createElement("div");
        line.className = "line";
        if (item.urgent) line.classList.add("urgent");

        const content = document.createElement("div");
        content.className = "line-content";

        const handleEdit = () => {
          editingItem = item;
          editingSection = section;
          const form = document.getElementById("form-entry");
          form.section.value = section;
          form.reference.value = item.reference || '';
          form.description.value = item.description || '';
          form.commentaire.value = item.commentaire || '';
          form.urgent.checked = item.urgent || false;
          showModal("modal-entry");
        };

        // Statut avec badge si lié à une tâche (par ID ou par référence Jira)
        let linkedTask = null;
        if (item.linkedTaskId) {
          linkedTask = storage.getItemById(item.linkedTaskId);
        }
        // Si pas trouvé par ID, chercher par référence Jira
        if (!linkedTask && item.reference) {
          linkedTask = storage.getAllTasks().find(t => t.jira === item.reference);
        }

        if (linkedTask && linkedTask.statut) {
          const statusRow = document.createElement("div");
          statusRow.className = "grid-row";
          const statusLabel = document.createElement("div");
          statusLabel.className = "label-col";
          statusLabel.textContent = "Statut :";
          statusLabel.onclick = handleEdit;
          
          const statusValue = document.createElement("div");
          statusValue.className = "value-col";

          const badge = document.createElement("span");
          const badgeClass = linkedTask.statut.replace(/\s+/g, '').toLowerCase();
          badge.className = `badge ${badgeClass}`;
          badge.textContent = linkedTask.statut;
          statusValue.appendChild(badge);

          statusRow.appendChild(statusLabel);
          statusRow.appendChild(statusValue);
          content.appendChild(statusRow);
        }

        // Référence avec lien Jira si applicable
        if (item.reference) {
          const refRow = document.createElement("div");
          refRow.className = "grid-row";
          const refLabel = document.createElement("div");
          refLabel.className = "label-col";
          refLabel.textContent = "Référence :";
          refLabel.onclick = handleEdit;
          
          const refValue = document.createElement("div");
          refValue.className = "value-col";

          // Créer le lien Jira
          const baseUrl = storage.getUrl();
          if (baseUrl && item.reference) {
            const link = document.createElement("a");
            link.className = "jira-link";
            link.href = `${baseUrl}/${item.reference}`;
            link.target = "_blank";
            link.textContent = item.reference;
            refValue.appendChild(link);
          } else {
            const span = document.createElement("span");
            span.className = "has-text-weight-semibold";
            span.textContent = item.reference;
            refValue.appendChild(span);
          }

          refRow.appendChild(refLabel);
          refRow.appendChild(refValue);
          content.appendChild(refRow);
        }

        // Tâche liée (si différente de la référence)
        if (linkedTask && linkedTask.resume && linkedTask.jira !== item.reference) {
          const taskRow = document.createElement("div");
          taskRow.className = "grid-row";

          const taskLabel = document.createElement("div");
          taskLabel.className = "label-col";
          taskLabel.textContent = "Tâche liée :";
          taskLabel.onclick = handleEdit;

          const taskValue = document.createElement("div");
          taskValue.className = "value-col";
          taskValue.textContent = linkedTask.resume;

          taskRow.appendChild(taskLabel);
          taskRow.appendChild(taskValue);
          content.appendChild(taskRow);
        }

        // Description
        const descRow = document.createElement("div");
        descRow.className = "grid-row";
        const descLabel = document.createElement("div");
        descLabel.className = "label-col";
        descLabel.textContent = "Description :";
        descLabel.onclick = handleEdit;
        const descValue = document.createElement("div");
        descValue.className = "value-col";
        descValue.textContent = item.description || '-';
        descRow.appendChild(descLabel);
        descRow.appendChild(descValue);
        content.appendChild(descRow);

        // Commentaire
        if (item.commentaire) {
          const comRow = document.createElement("div");
          comRow.className = "grid-row";
          const comLabel = document.createElement("div");
          comLabel.className = "label-col";
          comLabel.textContent = "Commentaire :";
          comLabel.onclick = handleEdit;
          const comValue = document.createElement("div");
          comValue.className = "value-col has-text-grey";
          comValue.textContent = item.commentaire;
          comRow.appendChild(comLabel);
          comRow.appendChild(comValue);
          content.appendChild(comRow);
        }

        line.appendChild(content);

        // Bouton de suppression
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.onclick = () => {
          contextEntryMeta = { section, id: item.id };
          showModal("modal-confirm-delete");
        };

        line.appendChild(deleteBtn);

        // Filigrane urgent
        if (item.urgent) {
          const watermark = document.createElement("div");
          watermark.className = "urgent-watermark";
          watermark.textContent = "URGENT";
          line.appendChild(watermark);
        }
        container.appendChild(line);
      });
  }
}

// Affichage des tâches disponibles
function renderTaskSelector(filter = '') {
  const container = document.getElementById('task-list');
  container.innerHTML = '';

  const items = filter 
    ? storage.searchAll(filter) 
    : storage.getAllTasks();

  items.forEach(item => {
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item';
    taskItem.onclick = () => selectTask(item, taskItem);

    const preview = document.createElement('div');
    preview.className = 'task-preview';

    // Badge pour statut si existant
    if (item.statut) {
      const badge = document.createElement('span');
      let badgeClass = item.statut.replace(/\s+/g, '').toLowerCase();
      badge.className = `badge ${badgeClass}`;
      badge.textContent = item.statut;
      preview.appendChild(badge);
    }

    const ref = item.jira || item.reference || 'Sans référence';
    const desc = item.resume || item.description || '-';
    const commentaire = item.commentaire || 'Pas de commentaire';
    const source = item.source || 'daily';

    const info = document.createElement('div');
    info.innerHTML = `
      <div><strong>${ref}</strong> - ${desc}</div>
      <div class="has-text-grey is-size-7">${commentaire}</div>
      <div class="has-text-grey is-size-7"><em>Source: ${source}</em></div>
    `;
    preview.appendChild(info);
    taskItem.appendChild(preview);

    container.appendChild(taskItem);
  });
}

function selectTask(task, element) {
  // Désélectionner l'ancien élément
  document.querySelectorAll('.task-item.selected').forEach(el => {
    el.classList.remove('selected');
  });

  // Sélectionner le nouveau
  element.classList.add('selected');
  selectedTask = task;
  document.getElementById('add-selected-task').disabled = false;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  initModals();
  renderAll();

  // Headers des groupes (collapse/expand)
  document.querySelectorAll(".group-header").forEach(header => {
    header.onclick = () => {
      const group = header.parentElement;
      group.classList.toggle("is-collapsed");
    };
  });

  // Actions de la navbar
  document.getElementById('navbar-add-entry').onclick = () => {
    editingItem = null;
    editingSection = null;
    document.getElementById("form-entry").reset();
    showModal("modal-entry");
  };

  document.getElementById('navbar-add-from-task').onclick = () => {
    selectedTask = null;
    document.getElementById('task-search').value = '';
    document.getElementById('add-selected-task').disabled = true;
    renderTaskSelector();
    showModal("modal-task-selector");
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

  // Recherche dans les tâches
  document.getElementById('task-search').oninput = (e) => {
    renderTaskSelector(e.target.value);
    selectedTask = null;
    document.getElementById('add-selected-task').disabled = true;
  };

  // Ajouter une tâche sélectionnée
  document.getElementById('add-selected-task').onclick = () => {
    if (!selectedTask) return;
    
    const section = document.getElementById('target-section').value;
    const entry = {
      reference: selectedTask.jira,
      description: selectedTask.resume,
      commentaire: selectedTask.commentaire || '',
      linkedTaskId: selectedTask.id,
      urgent: false
    };

    storage.addDailyEntry(section, entry);
    renderAll();
    hideModal("modal-task-selector");
  };

  // Définir l'URL du projet Jira
  const btn = document.getElementById('set-jira-url');
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const url = document.getElementById("jira-url-id").value;
    storage.setUrl(url);
    hideModal("modal-set-jira-url");
  });

  // Formulaire principal
  document.getElementById("form-entry").onsubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const newSection = form.get("section");
    const entry = {
      reference: form.get("reference") || "",
      description: form.get("description") || "",
      commentaire: form.get("commentaire") || "",
      urgent: form.get("urgent") === "on"
    };

    if (editingItem && editingSection) {
      storage.updateDailyEntry(editingSection, editingItem.id, newSection, entry);
    } else {
      storage.addDailyEntry(newSection, entry);
    }

    editingItem = null;
    editingSection = null;
    renderAll();
    hideModal("modal-entry");
  };

  // Confirmation de suppression
  document.getElementById("confirm-delete-btn").onclick = () => {
    if (!contextEntryMeta) return;
    const { section, id } = contextEntryMeta;
    storage.deleteDailyEntry(section, id);
    renderAll();
    hideModal("modal-confirm-delete");
    contextEntryMeta = null;
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
