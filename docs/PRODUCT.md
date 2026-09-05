# Diaphane

Spécification du produit pour le MVP, reconstruite le 2 septembre 2026 à partir des décisions de la carte [« Le chemin vers le MVP pour le premier client »](https://github.com/JSharles/diaphane/issues/43). Chaque décision est détaillée sur son ticket ; ce fichier dit ce que le produit est, pas comment le code le fait. Le vocabulaire est fixé dans [`CONTEXT.md`](../CONTEXT.md) ; le backlog d'implémentation vit dans les issues GitHub `ready-for-agent`.

## Ce qu'est Diaphane

Un portail où un **développeur** freelance montre à son **client** non technique où en est son projet, sans que le client ait à apprendre un outil ou un vocabulaire. Le client lit des textes écrits pour lui, dans sa langue, à partir de ce que le développeur fait réellement : ses documents, son board de tickets, sa roadmap.

**Premier client** : un ami qui a une entreprise et demande la refonte de son site. Il ne s'intéresse pas à la technique. Aucun autre utilisateur, aucune donnée en production : le produit peut encore casser et refaire.

## Principes

- **Rien d'inventé.** Tout ce que le client lit vient de matière réelle : les documents, le board, les notes du développeur. L'IA reformule et résume ; elle n'ajoute pas. Ce que les documents laissent incertain est publié comme incertain.
- **L'approbation est la seule porte vers le client.** Rien n'atteint le client avant que le développeur ait approuvé, sauf deux exceptions voulues : la tâche en cours (vulgarisée sans relecture) et le repère de la roadmap (déplacé à la main, visible aussitôt).
- **Le geste le plus simple, toujours.** Quand deux façons de faire existent, on prend celle qui demande le moins au développeur, même si elle coûte plus à construire.
- **Aucune méthode imposée.** Le développeur garde son board GitHub, ses pages Notion, ses fichiers. Diaphane s'y connecte ; il ne les remplace pas.
- **Casser et refaire.** Sans utilisateurs en production, on préfère réécrire proprement à rafistoler, et on supprime ce qu'on remplace dans le même changement.

## Les deux publics

Un compte est **développeur** ou **client**, une fois pour toutes. C'est la façon d'arriver qui le dit : un développeur se connecte avec GitHub, un client arrive par une invitation et se donne un mot de passe. Un projet a un développeur, son créateur (le **propriétaire**), et des clients, ses invités. Être **membre** d'un projet donne l'accès ; ce qu'on y voit et ce qu'on peut y faire découle du compte. Un projet n'a qu'un développeur pour le MVP ; plusieurs développeurs par projet et la passation d'un projet à un autre développeur viendront plus tard.

| | Développeur du projet | Client du projet |
|---|---|---|
| Créer un projet | oui | non |
| Modifier le projet (titre, lien de réunion, préférences) | oui | non |
| Connexions et choix (board, racines Notion), base documentaire, document de référence, rubriques, roadmap, approbation | oui | non |
| Inviter et retirer des clients | oui | non |
| Lire le projet publié (rubriques, roadmap, tâche en cours, équipe, réunion) | oui, dans « ce que lit votre client » | oui |
| Son profil | oui | oui |

Décision : [Développeur ou client : marqué une fois ou deux](https://github.com/JSharles/diaphane/issues/49).

## Ce que le client voit

Le côté client est fixé : les écrans existants, en lecture seule. Ce que chaque écran suppose du développeur est la matière de tout le reste de ce document.

| Écran | Ce que le client voit | Ce que ça suppose du développeur |
|---|---|---|
| Liste des projets | Carte du projet, pourcentage d'avancement, statut, bouton réunion | Un board connecté avec des tickets dans le workflow de statut ; un lien de réunion |
| Page projet, fiche développeur | Nom, rôle, contacts | Profil rempli une fois |
| Page projet, réunion | Le lien | Lien de réunion renseigné |
| Page projet, rubriques (onglets) | Une rubrique par sujet, en prose, dans sa langue et son ton | Base documentaire connectée, document de référence généré et relu, rubrique créée et **approuvée** |
| Page projet, roadmap (onglet) | Étapes et sous-étapes, « quand » en texte libre, repère « on est ici » | Même chaîne, plus au moins une étape ; le repère se déplace sans réapprobation |
| Page projet, tâche en cours | Titre vulgarisé, pourquoi, impact, état, estimation de fin | Board connecté, au moins un ticket « in progress » |
| Équipe | Les membres | Invitations acceptées |
| Profil | Ses propres informations | Rien |

**Jour 1** : le client lit les rubriques qui décrivent le projet et la roadmap. Sans les trois gestes du développeur (configurer, connecter, générer), il voit une page vide. **Ensuite** : rien de nouveau à l'écran. La tâche en cours s'allume quand le board a des tickets, les rubriques sont réécrites quand une décision change, le repère avance.

Décision : [Ce que le client voit](https://github.com/JSharles/diaphane/issues/44).

## Le côté développeur

### Connexions et choix

Diaphane se connecte à deux outils, et à rien d'autre pour le MVP : **GitHub** (connexion à Diaphane et board) et **Notion** (pages). Les fichiers uploadés ne demandent aucune connexion.

- **La connexion appartient au développeur**, pas au projet. Elle se fait une fois et vit dans son profil, avec un bouton pour la couper.
- **GitHub** : l'accès en lecture aux projets GitHub est demandé au moment du login, avec l'identité. Un seul consentement, jamais de second aller-retour par projet.
- **Notion** : un bouton « Connecter Notion » ouvre la fenêtre de Notion où le développeur coche les pages à partager, puis revient. Rien à créer, rien à copier. Les pages cochées sont les racines disponibles ; il en coche d'autres en refaisant le même bouton. Notion n'exige aucune revue pour ça.
- **Le projet ne porte que des choix** : quel board, quelles racines Notion. Ils se font dans les cartes du bloc « Connexions » de la page projet. Pas d'assistant à la création.

Décisions : [La connexion des outils](https://github.com/JSharles/diaphane/issues/48), [Notion : revue exigée ?](https://github.com/JSharles/diaphane/issues/56).

### La base documentaire et le document de référence

**Deux entrées** pour le MVP : les **racines Notion** (une page cochée, dont tout le sous-arbre, sous-pages comprises, forme un seul document source) et les **fichiers uploadés** (PDF, Word, images). Le Markdown du dépôt GitHub reviendra avec un deuxième projet ; les issues GitHub n'entrent pas, elles alimentent déjà la tâche en cours par le board.

Un document source est lu une fois pour vérifier qu'il se lit, puis stocké tel quel. Rien n'est extrait ni indexé : chaque écriture du document de référence repart des documents originaux.

**Le document de référence s'écrit tout seul.** Ajouter ou retirer un document le réécrit, en un seul appel au modèle, à partir de tous les documents et de toutes les notes. Il en sort une prose continue en parties nommées, plus les points que les documents ne tranchent pas. Un document qui n'a rien à voir avec le projet est nommé, pas tissé dedans.

**Une note est à la fois une réponse et une correction.** Le développeur répond à un point ouvert là où il apparaît, ou corrige un passage là où il est. Chaque note garde une copie figée de ce qui était à l'écran, et toutes les notes sont rejouées à chaque écriture.

**« Mettre à jour »** : un bouton relit toutes les racines Notion du projet, remplace celles dont le contenu a changé, et réécrit le document de référence une seule fois si au moins une a bougé. Pas de surveillance automatique pour le MVP.

Décision : [La matière première du document de référence](https://github.com/JSharles/diaphane/issues/47).

### Les rubriques

Le développeur définit lui-même les rubriques que lit son client : un nom, une consigne (ce qu'elle doit couvrir), et des réglages éditoriaux (longueur, pédagogie, familiarité technique, ton). Il n'y a pas de liste fixe. Une rubrique est **composée** par l'IA depuis le document de référence seul, jamais depuis les documents bruts, dans la langue du développeur.

Créer ou modifier une rubrique la compose aussitôt. Une réécriture du document de référence marque toutes les rubriques comme à refaire et les laisse en l'état : rien n'est republié dans le dos du développeur. Il revient, recompose ce qu'il veut, relit, approuve.

**Approuver publie.** L'approbation lance la dérivation de la rubrique dans la langue du client, sous son ton, et la publication est atomique : le client lit la version en place jusqu'à ce que la nouvelle soit complète. Une panne du fournisseur, un crédit épuisé ou une sortie invalide retardent la publication sans écraser ce qui était validé.

### La roadmap

Une rubrique d'un genre particulier, une par projet, créée avec un nom seul : pas de consigne, pas de ton. Composée par l'IA depuis le document de référence en **étapes** ordonnées avec sous-étapes et un « quand » en texte libre, éventuellement absent. Pas de lien avec le board : le board ne connaît pas les étapes.

- **Le repère** « on est ici » se déplace à la main, sans approbation, et le client le voit aussitôt.
- **Recomposer garde les retouches du développeur.** L'IA reçoit la roadmap en place en plus du document de référence et propose des ajouts ou corrections ; les étapes écrites ou retouchées par le développeur ne sont pas touchées.
- **Une roadmap publiée s'édite directement.** L'éditeur s'ouvre sur la roadmap publiée ; la correction devient une proposition pré-remplie, sans appel à l'IA ; l'approbation publie comme d'habitude.
- **Une roadmap vide n'est pas publiée.**

Décision : [La roadmap, côté développeur](https://github.com/JSharles/diaphane/issues/46).

### La tâche en cours

Le ou les tickets du board GitHub Projects connecté au projet qui sont dans une colonne dont le nom contient « in progress ». Chacun est **vulgarisé** pour le client (titre, pourquoi, impact, état, dans sa langue) et part **sans relecture** : une validation à chaque changement de carte n'est pas viable. La vulgarisation se refait quand le ticket change.

**Le geste du développeur** : déplacer la carte en « In progress » quand il commence, et écrire de vrais titres et descriptions, seule matière de la vulgarisation. Optionnel : une date cible ou une estimation sur la carte ; si elles sont là, elles priment, sinon l'estimation IA existante reste affichée avec sa confiance basse.

**Ce que la chaîne lit sur le board** : les champs `Status`, `Start date`, `Target date`, `Estimate` par leur nom exact ; les colonnes reconnues par un nom contenant « in progress » et « done » . L'`Estimate` du board se lit en jours ; il n'y a pas d'unité à choisir. Un ticket sans statut ne compte nulle part. Le pourcentage d'avancement du projet est « done » sur « total », recalculé au même sondage, toutes les cinq minutes ; nul tant que rien n'est trié.

Décision : [La tâche en cours, côté développeur](https://github.com/JSharles/diaphane/issues/45).

### Les invitations et l'email

Le développeur invite son client par email. L'invitation porte un jeton aléatoire, expire au bout de sept jours, ne sert qu'une fois, et **envoie un vrai email** via Resend (domaine d'envoi en région Irlande, SDK HTTPS parce que Railway bloque le SMTP). Le client suit le lien, se donne un mot de passe, et voit le projet.

Règles : pas d'annuaire de clients (un développeur ne peut jamais lister des personnes hors de ses projets) ; la réponse à une invitation ne doit pas révéler si un compte existe ; un projet a toujours son propriétaire.

Décision : [Quel service pour envoyer les emails d'invitation](https://github.com/JSharles/diaphane/issues/50).

### La réunion

Le projet porte un **lien de réunion**, une URL collée par le développeur, affichée au client. Rien de plus pour le MVP : les résumés automatiques de réunion sont hors périmètre (voir plus bas).

## Authentification

Sessions côté serveur, pas de JWT : à la connexion, l'API crée une session et envoie son identifiant dans un cookie `httpOnly` (`SameSite=Lax`, trente jours, `Secure` en production). Chaque requête relit la session ; se déconnecter la supprime, ce qui révoque l'accès aussitôt. Pas de bibliothèque d'authentification : l'API NestJS est la seule source de vérité sur l'identité.

- **Développeur** : GitHub OAuth uniquement, qui couvre inscription et connexion. Pas de mot de passe.
- **Client** : email et mot de passe (Argon2id), créés à l'acceptation de l'invitation. Pas d'inscription libre.

## Modèle de données

Ce qui compte, en mots ; le schéma Prisma fait foi pour les colonnes.

- **Compte** (développeur ou client), **session**.
- **Projet** : titre, lien de réunion, préférences (fuseau, format de date, langue), pourcentage d'avancement calculé. **Membre** d'un projet (avec le drapeau propriétaire), **invitation**.
- **Connexions du développeur** : GitHub (token gardé au login), Notion (token par workspace). **Choix du projet** : le board (propriétaire, numéro, unité d'estimation), les racines Notion.
- **Base documentaire** : document source (upload ou racine Notion), note, document de référence.
- **Rubriques** : rubrique (prose ou roadmap), proposition, contenu client, publication.
- **Tâche en cours** : tâche vulgarisée, progression.
- **Génération** : opération et tentative, la file de travail des appels au modèle.

**Supprimé par la carte** (à faire au backlog) : la table `Task` que personne ne lit, `Users.status` et `Projects.status` jamais écrits, le rôle par adhésion et par invitation (le compte suffit), les connexions par projet (remplacées par les connexions du développeur).

## Pile technique

- `apps/web` : Next.js, App Router, Tailwind, shadcn/ui, next-intl (site en français et en anglais).
- `apps/api` : NestJS, Prisma, PostgreSQL. Génération IA par opérations durables, fournisseur interchangeable (Anthropic en premier).
- Fichiers dans R2. Emails par Resend.
- Hébergement : Railway pour l'API et Postgres. **Un seul nom de domaine** pour le site et l'API ; l'hébergement du site, la forme (sous-domaines ou `/api`) et le nom de domaine se tranchent au déploiement ([ticket](https://github.com/JSharles/diaphane/issues/51)).

## Hors périmètre du MVP

- **Les résumés automatiques de réunion** : aucune voie n'est automatique sans contrainte pour plusieurs développeurs (Google payant par développeur, ou bot à admettre à chaque réunion). Faits et recommandation de repli sur le [ticket](https://github.com/JSharles/diaphane/issues/55).
- **Plusieurs développeurs par projet, et la passation** d'un projet à un autre développeur.
- Le Markdown du dépôt GitHub et les issues GitHub comme entrées de la base documentaire.
- Toute intégration au-delà de GitHub Projects et Notion (Jira, Linear, Trello, Google).
- Un chat IA avec le client, l'escalade automatique des questions au développeur.
- Facturation, devis, notifications autres que l'email d'invitation.
- L'audit de sécurité : effort à part, sur le code d'après les coupes.

## À revoir après le premier projet

- Donner à la vulgarisation de la tâche en cours la roadmap ou le document de référence, pour situer la tâche dans son chantier.
- Ce qui coince à la relecture du document de référence et des rubriques.
- La surveillance automatique des pages Notion, après l'itération à bouton.

## Identité visuelle

Un seul thème sombre, éditorial : noir, blanc, et une lumière signature (`#C8EBFD`) rare, jamais en aplat. Le détail des tokens vit dans `apps/web/DESIGN.md`. Aucun contenu marketing ne doit inventer de clients, de chiffres ou de témoignages tant qu'il n'y en a pas.
