from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
import json
import os

app = FastAPI()

# Autoriser toutes les origines pour le frontend local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fichiers de données
ORDET_FILE: str = "ordet.json"
DAILYR_FILE: str = "dailyr.json"

# Modèles pour validation des données
class OrdetData(BaseModel):
    sujets: List[Dict]
    revues: List[Dict]

class DailyRData(BaseModel):
    fait: List[Dict]
    afaire: List[Dict]
    notes: List[Dict]

class DeleteRequest(BaseModel):
    section: str
    date_ajout: str


# Fonctions utilitaires pour lecture/écriture
def read_json(path: str, default: dict) -> dict:
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(default, f, indent=2, ensure_ascii=False)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def write_json(path: str, data: dict):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# --- ROUTES POUR ORDET ---
@app.get("/ordet")
def get_ordet():
    return read_json(ORDET_FILE, {"sujets": [], "revues": []})

@app.post("/ordet")
async def save_ordet(data: OrdetData):
    write_json(ORDET_FILE, data.dict())
    return {"status": "ok"}


# --- ROUTES POUR DAILYR ---
@app.get("/dailyr")
def get_dailyr():
    return read_json(DAILYR_FILE, {"fait": [], "afaire": [], "notes": []})

@app.post("/dailyr")
async def save_dailyr(data: DailyRData):
    write_json(DAILYR_FILE, data.dict())
    return {"status": "ok"}

@app.post("/dailyr/delete")
async def delete_dailyr_entry(req: DeleteRequest):
    if not os.path.exists(DAILYR_FILE):
        return {"status": "file not found"}

    with open(DAILYR_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    if req.section not in data:
        return {"status": "invalid section"}

    data[req.section] = [entry for entry in data[req.section] if entry["date_ajout"] != req.date_ajout]

    with open(DAILYR_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return {"status": "ok"}
