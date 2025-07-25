# Utilisation du backend

## Introduction
Pour utiliser le backend vous pouvez soit :
* lancer le serveur manuellement, auquel cas il vous faudra initialiser via le script SHELL prévu à cet effet ;
* utiliser docker afin de lancer le seveur.

A noter que le serveur tournera sur le port `8000`.

## Utilisation "manuelle"
L'étape préalable est de lancer le script SHELL d'initialisation en entrant, via un terminal, la commande suivante 
`. ./init.sh`

Ensuite, toujours dans le terminal, vous pourrez lancer le serveur via la commande :
`uvicorn main:app --reload`

## Utilisation via docker
Vous pouvez soit :
- utiliser des commandes docker "classiques" ;
- utiliser docker-compose.

Dans tous les cas un makefil existe pour simplifier l'usage.

Voici les principales commandes pour l'utilisation avec **docker** :
- make build : construit l'image
- make run : lance les containers
- make stop : stoppe les containers
- make docker-restart : redémarrage
- make docker-clean : nettoyage des images et des containers
- make docker-logs : affichage des logs

Voici les principales commandes pour l'utilisation avec **docker_compose** :
- make up : construit l'image et lance les containers
- make down : stoppe les containers
- make logs : affichage des logs
- make restart : redémarrage
- make clean : nettoyage des images et des containers
