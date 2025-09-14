const STORAGE_KEY = "dailyr_data";

let dailyEntries = {
  fait: [],
  afaire: [],
  notes: []
};

let editingItem = null;
let editingSection = null;
let contextEntryMeta = null;

window.onload = async () => {
  document.getElementById("goto-ordet").onclick = () => {
    window.location.href = "ordet.html";
  };

  document.querySelectorAll(".group-header").forEach(header => {
    header.onclick = () => {
      const group = header.parentElement;
      group.classList.toggle("collapsed");
    };
  });

  document.getElementById("add-element").onclick = () => {
    editingItem = null;
    editingSection = null;
    document.getElementById("form-entry").reset();
    document.getElementById("dialog-entry").showModal();
  };

  document.getElementById("form-entry").onsubmit = e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const newSection = form.get("section");
    const entry = {
      reference: form.get("reference") || "-",
      description: form.get("description") || "-",
      commentaire: form.get("commentaire") || "-",
      urgent: form.get("urgent") === "on",
      date_ajout: editingItem?.date_ajout || new Date().toISOString()
    };

    if (editingItem && editingSection) {
      const index = dailyEntries[editingSection].findIndex(item => item.date_ajout === editingItem.date_ajout);
      if (index !== -1) {
        dailyEntries[editingSection].splice(index, 1);
        dailyEntries[newSection].push(entry);
      }
    } else {
      dailyEntries[newSection].push(entry);
    }

    editingItem = null;
    editingSection = null;

    saveData();
    renderAll();
    document.getElementById("dialog-entry").close();
  };

  loadData();
};

// --- Gestion localStorage ---
function loadData() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    dailyEntries = JSON.parse(data);
  }
  renderAll();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dailyEntries));
}

function deleteEntry(section, date_ajout) {
  dailyEntries[section] = dailyEntries[section].filter(item => item.date_ajout !== date_ajout);
  saveData();
}

// --- Export JSON ---
function exportData() {
  const blob = new Blob([JSON.stringify(dailyEntries, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "dailyr_backup.json";
  a.click();
}

// --- Import JSON ---
function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      dailyEntries = imported;
      saveData();
      renderAll();
    } catch (err) {
      alert("Fichier JSON invalide !");
    }
  };
  reader.readAsText(file);
}

// --- Rendu ---
function renderAll() {
  for (const key of ["fait", "afaire", "notes"]) {
    const container = document.getElementById(`${key}-container`);
    container.innerHTML = "";

    dailyEntries[key]
      .sort((a, b) => new Date(a.date_ajout) - new Date(b.date_ajout))
      .forEach(item => {
        const line = document.createElement("div");
        line.className = "line";
        if (item.urgent) line.classList.add("urgent");

        const content = document.createElement("div");
        content.className = "line-content";

        const handleEdit = () => {
          editingItem = item;
          editingSection = key;
          const form = document.getElementById("form-entry");
          form.section.value = key;
          form.reference.value = item.reference;
          form.description.value = item.description;
          form.commentaire.value = item.commentaire;
          form.urgent.checked = item.urgent;
          document.getElementById("dialog-entry").showModal();
        };

        const grid = document.createElement("div");
        grid.className = "grid-two-cols";

        const refLabel = document.createElement("div");
        refLabel.className = "label-col clickable";
        refLabel.innerHTML = "Référence";
        refLabel.onclick = handleEdit;

        const refValue = document.createElement("div");
        refValue.textContent = item.reference;

        grid.appendChild(refLabel);
        grid.appendChild(refValue);

        const descRow = document.createElement("div");
        descRow.className = "grid-two-cols";
        const descLabel = document.createElement("div");
        descLabel.className = "label-col clickable";
        descLabel.innerHTML = "Description";
        descLabel.onclick = handleEdit;
        const descValue = document.createElement("div");
        descValue.textContent = item.description;
        descRow.appendChild(descLabel);
        descRow.appendChild(descValue);

        const comRow = document.createElement("div");
        comRow.className = "grid-two-cols";
        const comLabel = document.createElement("div");
        comLabel.className = "label-col clickable";
        comLabel.innerHTML = "Commentaire";
        comLabel.onclick = handleEdit;
        const comValue = document.createElement("div");
        comValue.textContent = item.commentaire;
        comRow.appendChild(comLabel);
        comRow.appendChild(comValue);

        content.appendChild(grid);
        content.appendChild(descRow);
        content.appendChild(comRow);
        line.appendChild(content);

        // Bouton de suppression
        const trashBtn = document.createElement("button");
        trashBtn.className = "delete-icon";
        trashBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 3V4H4V6H5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V6H20V4H15V3H9ZM7 6H17V19H7V6Z" /></svg>`;
        trashBtn.onclick = () => {
          contextEntryMeta = { section: key, date_ajout: item.date_ajout };
          document.getElementById("confirm-delete").showModal();
        };
        line.appendChild(trashBtn);

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

document.getElementById("confirm-delete-btn").onclick = () => {
  if (!contextEntryMeta) return;
  const { section, date_ajout } = contextEntryMeta;
  deleteEntry(section, date_ajout);
  renderAll();
  document.getElementById("confirm-delete").close();
};

// Boutons Import/Export (prévoir un input type="file" dans le HTML pour l'import)
document.getElementById("export-btn").onclick = exportData;
document.getElementById("import-file").onchange = (e) => importData(e.target.files[0]);
