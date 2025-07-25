#!/bin/sh

if [ ! -d ".venv" ]
then
    echo

    echo "Création de l'environnement virtuel"
    python3 -m venv .venv
    echo

    echo "Activation de l'environnement virtuel"
    . .venv/bin/activate
    echo

    echo "Installation des dépendances"
    pip install -r requirements.txt
    echo
fi
