---
applyTo: '**'
---

**Context :**
Je souhaite une application web qui me permet de gérer des fichiers uploadé dans un azure blob container.
Pour le moment seul des fichiers pdf seront uploadé (donc pas de besoin d'une previsualisation).
Pas d'authentification utilisateur n'est necessaire pour l'acces a cette application.


**Technique:**
- L'application sera développée en NodeJs / Html / Javascript
- Acces au Azure Blob Container avec un Service Principal (ClientId et ClientSecret)
- utilise le Azure SDK pour NodeJs pour gerer les blobs (upload, liste, suppression, gestion des tags)
- L'application sera déployée dans une Azure WebApp Linux via un pipeline Azure Devops (donc pas besoin de serveur nodejs express)
- Le backend est nodejs (utilise la derniere version LTS) avec le azure sdk pour les manioulations des blobs
- Le frontend est en Html / Javascript avec Bootstrap et Datatables pour l'affichage de la liste des fichiers


**Fonctionnalités:**
Cette application doit pouvoir:
- Lister les fichiers contenus dans mon Container (dans un sous dossier précis).
    Colonnes : Nom du blob, url du blob, tags du blob sous format badge, lien qui permet d'ouvrir le fichier dans une nouvelle fenetre
- permettre d'uploader des fichiers dans le dossier de container
- permettre de supprimer un fichier uploadé dans ce container
- permettre pour chaque fichier (blob) uploadé de gerer (ajouter, modifier, supprimer) ses Tags

**UI:**
- utilise le theme Bootstrap (derniere version)
- pour la liste des fichiers utilise le composant Datatables (derniere version) avec filtre sur les colonnes


**Securité:**
- Tous les elements spécifique a Azure doievent etre en variable d'environement comme
 Le Storage Account, les acces du Service Principal, le nom du blob conatainer, le doosier d'upload

 **Deploiement:**
 Pour le pipeline Azure Devops, utilise le meme que celui ci : https://raw.githubusercontent.com/mikaelkrief/az-webapp-manager/refs/heads/main/azure-pipelines.yml

