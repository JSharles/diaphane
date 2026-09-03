# Diaphane

Le portail où un développeur freelance montre à son client non technique où en est son projet. Un seul contexte pour tout le dépôt : la séparation api/web est technique, pas un découpage du domaine. Les termes sont en français ; le code les porte en anglais (correspondance en fin de fichier).

## Language

### Les personnes

**Développeur** :
Un compte arrivé par GitHub ; crée des projets et les tient.
_Avoid_: contributeur, contributor, freelance, prestataire

**Client** :
Un compte arrivé par invitation ; lit ce qui est publié sur les projets où il est membre.
_Avoid_: utilisateur, customer

**Membre** :
Une personne qui a accès à un projet ; son rôle est celui de son compte.
_Avoid_: participant, collaborateur

**Propriétaire** :
Le développeur qui a créé le projet ; seul admin aujourd'hui.
_Avoid_: admin, owner, créateur

**Invitation** :
La proposition envoyée par email à une adresse pour devenir client d'un projet ; porte un jeton, expire, ne sert qu'une fois.

### Les outils

**Connexion** :
Le droit donné par un développeur à Diaphane de lire un outil (GitHub, Notion). Une par outil et par développeur.
_Avoid_: intégration, integration, token

**Choix** :
Ce qu'un projet prend dans une connexion : son board, ses racines Notion.
_Avoid_: configuration, réglage, setup

**Board** :
Le board GitHub Projects choisi pour un projet ; un par projet.
_Avoid_: tracker, kanban, tableau

**Lien de réunion** :
L'URL de visioconférence du projet, collée par le développeur et affichée au client.
_Avoid_: meeting, visio

### La base documentaire

**Base documentaire** :
Les entrées connectées au projet qui nourrissent le document de référence : racines Notion et fichiers uploadés.
_Avoid_: sources, ressources, resources, knowledge base

**Document source** :
Une entrée de la base documentaire, gardée telle quelle : un fichier uploadé, ou une racine Notion avec tout son sous-arbre.
_Avoid_: ressource, pièce jointe, attachment

**Racine Notion** :
Une page Notion cochée par le développeur ; tout son sous-arbre forme un document source.
_Avoid_: page Notion, lien Notion

**Mettre à jour** :
Relire toutes les racines Notion d'un projet et réécrire le document de référence si l'une a changé.
_Avoid_: synchroniser, rafraîchir, sync

**Document de référence** :
Le texte unique, en parties nommées, écrit par l'IA à partir de toute la base documentaire et corrigé par notes ; ce dont toutes les rubriques sont écrites.
_Avoid_: documentation canonique, canonical document, base de faits, knowledge base

**Note** :
Une réponse à un point ouvert ou une correction d'un passage du document de référence, rejouée à chaque réécriture.
_Avoid_: commentaire, annotation, correction

**Point ouvert** :
Une question que les documents ne tranchent pas, signalée par l'IA dans le document de référence.
_Avoid_: incertitude, question, TODO

### Ce que lit le client

**Rubrique** :
Un sujet lu par le client, défini par le développeur (nom, consigne, réglages éditoriaux), composé depuis le document de référence. De genre prose ou roadmap.
_Avoid_: section, catégorie, onglet, category

**Consigne** :
Ce qu'une rubrique doit couvrir, écrit par le développeur.
_Avoid_: brief, prompt, description

**Composer** :
Écrire une proposition de rubrique par l'IA depuis le document de référence.
_Avoid_: générer, rédiger

**Proposition** :
La version d'une rubrique composée ou éditée, que le développeur relit avant d'approuver.
_Avoid_: brouillon, draft, version

**Approbation** :
Le seul geste qui fait passer une rubrique du développeur au client.
_Avoid_: validation, publication, release

**Roadmap** :
La rubrique de genre roadmap, une par projet : des étapes ordonnées, avec sous-étapes, et un repère.
_Avoid_: planning, feuille de route, timeline, jalons

**Étape** :
Une entrée de la roadmap ; d'origine document (écrite par l'IA) ou développeur (écrite ou retouchée par lui). Peut porter des sous-étapes, jamais plus.
_Avoid_: jalon, milestone, phase

**Repère** :
L'étape ou la sous-étape « où on en est », déplacée à la main par le développeur, vue du client sans approbation.
_Avoid_: curseur, position, current milestone

**Roadmap en place** :
La roadmap que le développeur a sous les yeux au moment de recomposer : la proposition qu'il relisait, retouches comprises, sinon la dernière approuvée. C'est ce que l'IA reçoit avec le document de référence.
_Avoid_: base, previous roadmap, ancienne version

**Recomposer** :
Redemander la roadmap à l'IA après un changement de documents. Elle repart de la roadmap en place et propose des ajouts ou des corrections ; une étape d'origine développeur revient telle quelle, ni modifiée, ni supprimée, ni déplacée par rapport aux autres étapes du développeur.
_Avoid_: régénérer, repartir de zéro, refresh

**Tâche en cours** :
Les tickets du board dans une colonne « in progress », vulgarisés pour le client.
_Avoid_: current task, ticket en cours

**Vulgarisation** :
La réécriture automatique d'un ticket pour le client (titre, pourquoi, impact, état), sans relecture, refaite quand le ticket change.
_Avoid_: traduction, simplification, résumé

**Estimation** :
La date de fin montrée au client ; vient de la date cible du board, sinon de l'estimation du board, sinon de l'IA.
_Avoid_: deadline, échéance, ETA

## Correspondance avec le code

| Terme | Dans le code |
|---|---|
| Développeur / Client | `User.accountKind` |
| Propriétaire | `ProjectMember.isAdmin` |
| Board | `BoardConnection` |
| Document source | `SourceDocument` |
| Document de référence | `ReferenceDocument` |
| Note | `Note` |
| Rubrique | `ClientSection` |
| Proposition | `SectionProposal` |
| Approbation, publication | `ClientContentRelease` |
| Étape, repère | `milestone`, `currentMilestone` |
| Tâche en cours, vulgarisation | `VulgarizedTask`, `TaskProgress` |
