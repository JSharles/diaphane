# Quel service pour transcrire et résumer une réunion Google Meet

Recherche pour l'issue GitHub #54. Date : 2 septembre 2026. Toutes les pages
citées ont été consultées le 2 septembre 2026 ; les prix sont ceux affichés ce
jour-là.

Ce document ne contient pas de recommandation. Il rassemble les faits, avec
leur source, pour les trois façons possibles de faire. La décision se prend
ailleurs.

## La question

Chaque projet Diaphane a un lien de réunion (`Project.meetingUrl` dans
`apps/api/prisma/schema.prisma`, champ déjà en base, pas encore affiché côté
client). Le ticket #47 a décidé que les réunions lancées depuis ce lien doivent
être transcrites et résumées automatiquement, le résumé entrant dans la base
documentaire et dans un historique visible du client.

On connaît donc l'URL de la réunion (`https://meet.google.com/abc-defg-hij`).
On veut, sans action manuelle, obtenir le texte d'un résumé et le pousser dans
l'API NestJS hébergée sur Railway.

Trois familles d'options :

1. **Google Meet lui-même** : la transcription et les notes Gemini que Meet
   produit déjà, récupérées par l'API Meet REST et l'API Workspace Events.
2. **Un service de bot tiers** : un participant automatique rejoint la réunion
   depuis l'URL, enregistre, transcrit, parfois résume, et nous prévient par
   webhook.
3. **Construire ce bot nous-mêmes** : navigateur piloté dans un conteneur,
   capture audio, transcription Whisper ou équivalent, résumé par un LLM.

## Vue d'ensemble

| | Google Meet (API officielle) | Bot tiers (ex. Recall.ai, Fireflies) | Construire |
|---|---|---|---|
| Prérequis | Compte Google Workspace **Business Standard ou plus** pour l'organisateur (13,60 €/utilisateur/mois), projet Google Cloud, OAuth de l'organisateur | Un compte chez le fournisseur, une clé API ; aucun compte particulier pour l'organisateur ni le client | Un conteneur Chromium + Xvfb + PulseAudio par réunion, un fournisseur de transcription, un LLM |
| Prix par heure de réunion | 0 € (API gratuite), l'abonnement Workspace est le seul coût | 0,35 à 0,65 $/h tout compris pour les API « à l'heure » ; ou un siège mensuel (Fireflies 10 à 29 $/mois) | Compute ≈ 0,04 à 0,17 $/h sur Railway + transcription 0,15 à 0,36 $/h + LLM < 0,05 $ ; effort de plusieurs milliers de lignes et maintenance continue |
| Résumé fourni | Oui : notes Gemini (« Take notes for me »), mais seulement sous forme de Google Doc | Fireflies, Nylas, MeetingBaaS (option) : oui. Recall.ai, Attendee, Vexa, Skribby : transcription seulement | Non, à faire (LLM) |
| Français | Oui (transcription et notes, 8 langues dont le français) | Oui chez tous les fournisseurs vérifiés | Oui (Whisper large-v2 : 8,3 % de mots erronés en français) |
| Délai | Après la fin de la réunion ; pas de délai chiffré dans la doc | Temps réel (1 à 3 s) chez Recall.ai ; 5 à 10 min chez Fireflies | Temps réel possible |
| Rattacher au projet | On connaît l'URL → `spaces.get` avec le code de réunion, puis événements Pub/Sub sur cet espace | On envoie le bot à l'URL du projet ; on met l'id du projet dans les métadonnées du bot | Idem, tout est à nous |
| Ce qui bloque | L'organisateur doit avoir la bonne édition Workspace et être présent ; les données API disparaissent après 30 jours ; Pub/Sub obligatoire | Le bot doit être **admis à la main** dans la réunion ; Google durcit l'admission des invités anonymes depuis mars 2026 | Même blocage d'admission, plus le risque d'être bloqué par Google (« You can't join this video call ») et la casse à chaque changement d'interface Meet |

---

## 1. Google Meet lui-même

### 1.1 Ce que Meet sait produire

Meet produit deux artefacts texte pendant une réunion :

- **La transcription** (« Transcripts ») : un Google Doc enregistré dans le
  Drive de l'organisateur, dossier « Google Meet ». Éditions Workspace :
  « Business Standard, Business Plus, Enterprise Starter, Enterprise Standard,
  Enterprise Plus, Teaching and Learning Upgrade, Education Plus, Workspace
  Individual ». Langues : « English, French, German, Italian, Japanese, Korean,
  Portuguese, Spanish ». Tout le monde voit une icône Transcription en haut à
  droite pendant la réunion.
  Source : [Utiliser les transcriptions dans Google Meet](https://support.google.com/meet/answer/12849897)
- **Les notes Gemini** (« Take notes for me ») : un résumé et un récapitulatif
  générés par Gemini, aussi sous forme de Google Doc, envoyés par email à
  l'organisateur et attachés à l'événement Agenda. Éditions : « Business
  Standard, Business Plus, Enterprise Standard, Enterprise Plus », plus les
  abonnements personnels Google AI Pro et Ultra. Règle : « The meeting organizer
  must have the Workspace edition that includes "Take notes for me." » Même
  huit langues, dont le français ; une seule langue par réunion ; au moins
  50 mots prononcés. Tous les participants sont informés (icône crayon).
  Sources : [Prendre des notes avec Gemini dans Meet](https://support.google.com/meet/answer/14754931),
  [Admin — Google AI note-taking](https://knowledge.workspace.google.com/admin/meet/let-google-meet-ai-take-notes-for-my-users),
  [Éditions incluant Gemini](https://support.google.com/docs/answer/13952129)

Côté administration Workspace : la transcription est « on by default, but it's
not automatic for each meeting. Someone in the meeting has to start
transcription ». Les notes Gemini sont **désactivées par défaut** par
l'administrateur (Admin console → Apps → Google Meet → Gemini settings).
Sources : [Admin — transcription](https://knowledge.workspace.google.com/admin/meet/turn-meeting-transcription-on-or-off),
[Admin — notes Gemini](https://knowledge.workspace.google.com/admin/meet/let-google-meet-ai-take-notes-for-my-users)

**Business Starter n'a rien de tout ça.** La page de comparaison des éditions
met « Transcribe meetings & save them to Drive », « Record meetings » et « Take
notes for me » uniquement sur Standard et Plus.
Source : [Comparer les éditions Business](https://knowledge.workspace.google.com/admin/getting-started/editions/compare-business-editions)

### 1.2 Prix Workspace

Prix affichés le 2 septembre 2026, par utilisateur et par mois :
Business Starter **6,80 €**, Business Standard **13,60 €**, Business Plus
**21,10 €**, Enterprise sur devis. Une remise de lancement (Standard à 6,80 €)
vaut « only available for the first 20 users added, for 12 months ».
Source : [Tarifs Google Workspace](https://workspace.google.com/pricing)

L'édition minimale pour l'organisateur (le développeur) est donc
**Business Standard, 13,60 €/mois**. L'API Meet elle-même est gratuite :
« All standard use of the Google Meet API is available at no additional
cost. » Quotas : 6 000 lectures/min par projet. Avertissement : « Exceeding the
quota request limits is planned to incur charges to your Google Cloud billing
account later in 2026. »
Source : [Limites de l'API Meet](https://developers.google.com/workspace/meet/api/guides/limits)

### 1.3 L'API Meet REST v2 : récupérer le texte

Ressources : `spaces`, `conferenceRecords`, `conferenceRecords.transcripts`,
`conferenceRecords.transcripts.entries`, `conferenceRecords.recordings`,
`conferenceRecords.smartNotes`.
Source : [Référence REST v2](https://developers.google.com/workspace/meet/api/reference/rest/v2)

**Retrouver l'espace depuis l'URL.** `Space.meetingUri` est
« `https://meet.google.com/` followed by the `meetingCode` ». `spaces.get`
accepte `spaces/{meetingCode}` (ex. `spaces/abc-mnop-xyz`). Mise en garde de
la doc : « a `meetingCode` shouldn't be stored long term as it can become
dissociated from a meeting space and can be reused for different meeting
spaces in the future » ; les codes expirent 365 jours après le dernier usage.
Il faut donc stocker le nom `spaces/{space}` renvoyé, pas seulement le code.
Sources : [spaces.get](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/get),
[Espaces de réunion](https://developers.google.com/workspace/meet/api/guides/meeting-spaces-overview)

**Lister les réunions d'un espace.** `conferenceRecords.list` avec le filtre
`space.name = "spaces/NAME"` ou `space.meeting_code = "abc-mnop-xyz"`. Mais :
« The `list` method only returns conferences where you're the meeting
organizer. » Un participant peut lire (`get`) les enregistrements des
réunions auxquelles il a assisté, pas les énumérer.
Sources : [conferenceRecords.list](https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords/list),
[Guide conférences](https://developers.google.com/workspace/meet/api/guides/conferences)

**La transcription sous deux formes.**

- Le Google Doc : `Transcript.docsDestination.document` (id du document) et
  `exportUri`. Le texte se lit avec l'API Docs (`documents.get`) ou Drive
  (`files.export` en `text/plain`, 10 Mo max).
  Sources : [DocsDestination](https://developers.google.com/workspace/meet/api/reference/rest/v2/DocsDestination),
  [Drive files.export](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export)
- Les **entrées structurées** : `transcripts.entries.list` renvoie, par prise
  de parole, `participant`, `text` (« at maximum 10K words »), `languageCode`
  (BCP 47), `startTime`, `endTime`, dans l'ordre chronologique, 100 par page.
  Avertissement : les entrées « might not match the transcription found in the
  Docs transcript file » si le Doc a été modifié après génération.
  Source : [transcripts.entries](https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords.transcripts.entries),
  [entries.list](https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords.transcripts.entries/list)

États d'une transcription : `STARTED`, `ENDED` (fichier pas encore généré),
`FILE_GENERATED` (prêt).
Source : [conferenceRecords.transcripts](https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords.transcripts)

**Les notes Gemini par API.** `conferenceRecords.smartNotes` : « Metadata for
a smart note generated from a conference. It refers to the notes generated
from Take Notes with Gemini during the conference. » Même champs `state` et
`docsDestination`. Disponible en version stable depuis le 2 avril 2026. **Il
n'y a pas de résumé en JSON** : c'est un pointeur vers un Google Doc, à lire
via l'API Docs.
Sources : [conferenceRecords.smartNotes](https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords.smartNotes),
[Notes de version](https://developers.google.com/workspace/meet/release-notes)

**Durée de vie des données.** « The resource is deleted 30 days after the
conference ends » (`ConferenceRecord.expireTime`) ; « Transcript entry data is
available for 30 days after the conference ends ». Les Google Docs, eux,
restent dans le Drive selon les règles Drive/Vault. Il faut donc ingérer le
texte dans Postgres rapidement.
Sources : [conferenceRecords](https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords),
[Guide artefacts](https://developers.google.com/workspace/meet/api/guides/artifacts)

### 1.4 Démarrer la transcription automatiquement

Depuis le 29 avril 2025 (version stable), un espace de réunion peut être
préconfiguré : `SpaceConfig.artifactConfig` avec
`transcriptionConfig.autoTranscriptionGeneration: ON` et
`smartNotesConfig.autoSmartNotesGeneration: ON`. Sens exact :
« automatically transcribed when someone with the privilege to transcribe
joins the meeting ». Autrement dit, la transcription démarre quand
l'organisateur (ou quelqu'un de son organisation avec le droit) **rejoint la
réunion**. « Meeting organizers, but not co-hosts, can pre-configure
auto-recording, auto-transcripts, and smart notes. »
Sources : [spaces (SpaceConfig, ArtifactConfig)](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces),
[Configuration des espaces](https://developers.google.com/workspace/meet/api/guides/meeting-spaces-configuration),
[Notes de version](https://developers.google.com/workspace/meet/release-notes)

### 1.5 Être prévenu : l'API Workspace Events

Événements Meet disponibles (noms exacts) :
`google.workspace.meet.conference.v2.started` / `.ended`,
`google.workspace.meet.transcript.v2.started` / `.ended` / `.fileGenerated`,
`google.workspace.meet.smartNote.v2.started` / `.ended` / `.fileGenerated`,
plus recording et participant. Cible : un espace
(`//meet.googleapis.com/spaces/SPACE`) ou un utilisateur (tous les espaces
dont il est propriétaire). Un simple invité ne reçoit que
`conference.v2.started` et `transcript.v2.fileGenerated`.
Source : [Événements Meet](https://developers.google.com/workspace/events/guides/events-meet)

La livraison passe **obligatoirement par un topic Google Cloud Pub/Sub** du
même projet Cloud. Le message contient le nom de la ressource, par exemple
`{"transcript": {"name": "conferenceRecords/.../transcripts/..."}}` ; on
appelle ensuite `transcripts.get` puis `entries.list`.
Sources : [Créer un abonnement](https://developers.google.com/workspace/events/guides/create-subscription),
[Tutoriel Python (événements Meet)](https://developers.google.com/workspace/meet/api/guides/tutorial-events-python)

Un abonnement dure au plus **7 jours** (4 h ou 24 h si le message doit contenir
la ressource) et se renouvelle avec `subscriptions.patch` et `ttl: 0`.
Conseil de Google : « don't rely on expiration reminder events. Instead, track
your subscription's expiration time and renew it as needed ». Il faut donc un
cron de renouvellement dans l'API.
Sources : [Guide Events](https://developers.google.com/workspace/events/guides),
[Renouveler un abonnement](https://developers.google.com/workspace/events/guides/update-subscription),
[Cycle de vie](https://developers.google.com/workspace/events/guides/events-lifecycle)

### 1.6 Authentification

L'API Meet utilise uniquement l'authentification **utilisateur** (OAuth) ; un
compte de service ne marche que par délégation à l'échelle du domaine, action
d'administrateur Workspace. Scopes :

- `https://www.googleapis.com/auth/meetings.space.created` (sensible) : créer
  et lire les espaces créés par l'app, et leurs conférences.
- `https://www.googleapis.com/auth/meetings.space.readonly` (sensible) : lire
  tout espace auquel l'utilisateur a accès.
- `https://www.googleapis.com/auth/meetings.space.settings` (non sensible) :
  modifier la configuration (dont `artifactConfig`) de tous ses espaces, même
  créés depuis Agenda.
- Les scopes Drive (`drive.readonly`, `drive.meet.readonly`) sont classés
  **restreints** (vérification Google plus lourde) ; on peut les éviter en
  lisant les entrées structurées ou en passant par `documents.readonly`.

Sources : [Authentifier et autoriser](https://developers.google.com/workspace/meet/api/guides/authenticate-authorize),
[Scopes Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)

### 1.7 Rattacher la réunion à un projet Diaphane

Deux chemins, tous deux sur le compte Workspace du développeur (connexion
OAuth à Diaphane, une fois) :

- **Diaphane crée le lien** : `spaces.create` avec `artifactConfig` ON, on
  stocke `spaces/{space}` et `meetingUri` sur le projet, on s'abonne aux
  événements de cet espace. Chaque événement arrive avec le nom de l'espace,
  donc avec le projet.
- **Le développeur colle un lien existant** : `spaces.get` avec
  `spaces/{code}` donne le nom durable ; `spaces.patch` avec le scope
  `meetings.space.settings` active la transcription automatique, à condition
  que le développeur soit bien l'organisateur.

Le client n'a besoin de rien : avec `accessType: OPEN`, « Anyone with the join
information can join without knocking ».
Source : [spaces (AccessType)](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces)

### 1.8 Ce qui bloque

- Le développeur doit passer à **Business Standard (13,60 €/mois)** ou plus, et
  activer les notes Gemini dans la console admin (désactivées par défaut).
- La transcription ne démarre que si une personne habilitée (l'organisateur)
  **est dans la réunion**. Une réunion client seul ne produit rien.
- Les données API disparaissent **30 jours** après la réunion.
- Il faut un **projet Google Cloud avec Pub/Sub**, un endpoint qui consomme
  les messages (push HTTPS vers Railway ou pull), et un cron de renouvellement
  d'abonnement tous les 7 jours au plus.
- Le résumé Gemini n'existe qu'en Google Doc : il faudra le lire via l'API
  Docs, ou faire notre propre résumé à partir des entrées structurées.
- Pas de délai chiffré dans la documentation entre la fin de la réunion et
  `FILE_GENERATED`.

---

## 2. Services de bots tiers

Principe commun : on appelle l'API du fournisseur avec l'URL Meet, un bot
(participant visible, avec un nom) demande à rejoindre, enregistre, transcrit,
et un webhook nous prévient à la fin. Deux modèles de prix : **à l'heure de
réunion** (API pures) ou **au siège mensuel** (outils de prise de notes
grand public).

### 2.1 Tableau comparatif

| Fournisseur | Envoyer un bot à une URL par API | Prix | Récupération du texte | Résumé inclus | Français | Délai |
|---|---|---|---|---|---|---|
| **Recall.ai** | Oui, `POST /api/v1/bot/` avec `meeting_url` | 0,50 $/h d'enregistrement + 0,15 $/h de transcription Recall (ou 0 $ via les sous-titres Meet) ; 5 premières heures gratuites | Webhook `transcript.done` + URL de téléchargement | **Non** (transcription seule, LLM à nous) | Oui (`fr`, ou `auto`) | Temps réel 1 à 3 s, ou après réunion |
| **Fireflies.ai** | Oui, mutation GraphQL `addToLiveMeeting(meeting_link)` | Par siège : Pro 10 $/mois (annuel) ou 18 $ ; Business 19 $ ou 29 $ ; Enterprise 39 $. « The business tier gets API access » | Webhook « Transcription completed » + requête `transcript` | **Oui** (`summary { overview, action_items, ... }`) | Oui (`fr`, 39 langues) | 5 à 10 min après la réunion |
| **tl;dv** | **Non** : l'API lit et importe, elle n'envoie pas de bot | Pro 18 €/mois (annuel) ou 29 € ; Business 29 € ou 39 € | API lecture + webhooks `MeetingReady`, `TranscriptReady` | Oui | Oui (30+ langues) | Après réunion |
| **Otter.ai** | **Non** documenté | Pro 8,33 $/mois (annuel) ou 16,99 $ ; Business 19,99 $ ou 30 $ ; API et webhooks **Enterprise seulement** | API Enterprise + webhook `conversation.completed` | Oui | Oui | Après réunion |
| **MeetingBaaS** (société française) | Oui, `POST /v2/bots` | « From $0.35 »/h (jetons) ; 8 h gratuites ; transcription Gladia +0,25 jeton/h | Webhook `bot.completed` (transcription, mp4, locuteurs) | En option via Gladia `summarization` | Via le fournisseur choisi | Après réunion (temps réel possible) |
| **Attendee** (source ouverte, licence ELv2) | Oui, API REST | Hébergé : 0,50 $/h (jusqu'à 0,35 $), 5 h gratuites ; auto-hébergement gratuit | Webhooks `bot.state_change`, `transcript.update` | Non | Détection auto selon le fournisseur | Temps réel et après |
| **Skribby** | Oui | 0,35 $/h + transcription 0,39 à 1,36 $/h selon le modèle | Webhooks | Non documenté | « 30+ languages » (marketing) | Temps réel et après |
| **Vexa** (Apache-2.0) | Oui, `POST /bots` | Hébergé 0,30 $/h + 0,20 $/h de transcription | `GET /transcripts/...`, webhooks | Non | Whisper (99 langues) | Temps réel |
| **Nylas Notetaker** | Oui, `POST /v3/notetakers` sans compte connecté | 5 h gratuites/mois ; puis 0,65 à 0,80 $/h de bot | Webhook `notetaker.media` avec URLs | **Oui** (`summary`, `action_items` en JSON) | Détection auto + `expected_languages` | Après réunion |
| **Read.ai** | **Non** documenté (API en bêta, lecture) | Pro 15 $/mois (annuel) ou 19,75 $ | Webhooks `meeting_end` (Pro et plus) | Oui | Oui (16+ langues) | Après réunion |

Seuls **Fireflies** (au siège) et **Nylas Notetaker** (à l'heure) envoient un
bot par API **et** fournissent un résumé prêt. Recall.ai, Attendee, Vexa,
Skribby livrent la transcription ; le résumé est à faire chez nous (voir § 3.4
pour le coût, quelques centimes).

### 2.2 Recall.ai en détail

- Création : `POST /api/v1/bot/` avec `meeting_url`, `bot_name` (défaut
  « Meeting Notetaker »), `join_at`, `recording_config`. Quatre régions
  séparées, dont **`https://eu-central-1.recall.ai`** (« all API resources are
  region-local », identifiants distincts par région).
  Sources : [Create Bot](https://docs.recall.ai/reference/bot_create), [Régions](https://docs.recall.ai/docs/regions)
- Prix : « $0.50/hr of recording », « your first 5 hours of recording are
  free », facturation à la seconde, solde prépayé. Transcription Recall
  « $0.15 per recording hour ». Le fournisseur `meeting_captions` (sous-titres
  natifs de Meet) : « No additional charge », mais « Not 100% reliable since
  meeting caption availability depends on user/organization settings » et pas
  de détection automatique de la langue. Stockage : 7 jours gratuits puis
  0,05 $/h d'enregistrement pour 30 jours.
  Sources : [Tarifs](https://www.recall.ai/pricing), [Transcription Recall](https://docs.recall.ai/docs/recallai-transcription),
  [Sous-titres de réunion](https://docs.recall.ai/docs/meeting-caption-transcription)
- Fournisseurs de transcription au choix : Recall, ElevenLabs, Deepgram,
  AssemblyAI, AWS Transcribe, Rev, Speechmatics, Gladia. Le français est listé
  (`fr - French`).
  Source : [Transcription](https://docs.recall.ai/docs/transcription)
- Délai : en streaming, « Typically 1-3 seconds after an utterance is
  finalized ».
  Source : [Transcription temps réel](https://docs.recall.ai/docs/bot-real-time-transcription)
- Webhooks : statuts du bot (`bot.joining_call`, `bot.in_waiting_room`,
  `bot.in_call_recording`, `bot.call_ended`, `bot.done`, `bot.fatal`) et
  artefacts (`transcript.done`, `recording.done`…). Le champ `bot.metadata`
  qu'on fournit à la création revient dans chaque webhook : c'est là qu'on
  met l'id du projet Diaphane.
  Sources : [Statuts du bot](https://docs.recall.ai/docs/bot-status-change-events), [Webhooks d'enregistrement](https://docs.recall.ai/docs/recording-webhooks)
- Pas de résumé : la doc présente les transcriptions comme la matière « to
  power features like summaries ».
- Google Meet : « Recall supports Google Meet bots out-of-the-box », bot
  anonyme par défaut (sans compte Google). **« Google Meet bots need to be
  manually admitted into calls. »** Et : « If none from the host's Google org
  is in the call yet, nobody will see a pop-up to let the bot in. » Un bot
  connecté à un compte Google peut sauter la salle d'attente, mais il faut un
  **Google Workspace payant dédié** (« You cannot reuse your existing Google
  Workspace ») et que l'email du bot soit sur l'invitation Agenda.
  Sources : [Google Meet](https://docs.recall.ai/docs/google-meet.md), [FAQ Google Meet](https://docs.recall.ai/docs/google-meet-faq.md),
  [Bot connecté](https://docs.recall.ai/docs/google-meet-login-getting-started.md)
- Rétention : configurable (`recording_config.retention`), y compris
  « aucune donnée conservée » ; suppression définitive par API.
  Source : [Rétention](https://docs.recall.ai/docs/data-retention)

### 2.3 Fireflies.ai en détail

- API GraphQL `https://api.fireflies.ai/graphql`, clé Bearer.
  `addToLiveMeeting(meeting_link, title, duration 15-120 min, language,
  attendees)`, limitée à « 3 requests per 20 minutes ». La requête
  `transcript` renvoie les phrases (`text`, `speaker_name`, `start_time`) et
  `summary { keywords, action_items, outline, overview, short_summary,
  topics_discussed, ... }`. Webhook unique « Transcription completed »,
  payload `{meetingId, eventType, clientReferenceId}`, signé HMAC-SHA256.
  Sources : [addToLiveMeeting](https://docs.fireflies.ai/graphql-api/mutation/add-to-live),
  [transcript](https://docs.fireflies.ai/graphql-api/query/transcript), [Webhooks](https://docs.fireflies.ai/graphql-api/webhooks)
- Prix : Pro « $10/mo/user billed annually or $18/mo/user billed monthly »,
  Business « $19/mo/user billed annually or $29/mo/user billed monthly »,
  Enterprise 39 $. « The business tier gets API access. » La page des limites
  donne pourtant des quotas API pour Free et Pro ; le palier exact requis
  pour `addToLiveMeeting` n'est pas écrit.
  Sources : [Tarifs](https://fireflies.ai/pricing), [Guide des plans](https://guide.fireflies.ai/articles/3734844560-learn-about-the-fireflies-pricing-plans),
  [Limites](https://docs.fireflies.ai/fundamentals/limits)
- Français : code `fr` dans la liste des 39 langues ; la page tarifs précise
  « Currently English is the primarily language ... We also support Spanish,
  French, Portuguese, Italian, and 100+ other languages in beta ».
  Source : [Codes langue](https://docs.fireflies.ai/miscellaneous/language-codes)
- Délai : « Transcriptions typically complete within 5 to 10 minutes after
  your meeting ends » ; réunions de moins de 3 minutes ignorées ; compter
  2 à 3 minutes pour que le bot rejoigne.
  Sources : [Traitement](https://guide.fireflies.ai/articles/3928294306-learn-about-meeting-transcription-processing-in-fireflies),
  [Ajouter à une réunion en cours](https://guide.fireflies.ai/articles/9977523795-how-to-add-fireflies-to-an-ongoing-meeting)
- Google Meet : « The host must admit Fireflies before it can join. » Le bot
  « Fireflies.ai Notetaker » est toujours visible.
- Données : « By default, all your data is stored and processed in the US » ;
  stockage EU réservé aux offres entreprise.
  Source : [Stockage des données](https://guide.fireflies.ai/articles/9596505232-learn-about-data-storage-and-transfer)
- Modèle : un compte de prise de notes (le siège du développeur) dont on
  pilote le bot par API. Ni l'organisateur ni le client n'ont besoin d'un
  compte Fireflies.

### 2.4 Les autres, en bref

- **tl;dv** : API `https://pasta.tldv.io` (`GET /v1alpha1/meetings`,
  `/transcript`, `/notes`, `POST /meetings/import`), webhooks `MeetingReady`
  et `TranscriptReady`, mais **aucun endpoint pour envoyer l'enregistreur à une
  URL** : c'est l'agenda de l'utilisateur tl;dv qui déclenche. API réservée
  aux plans Pro et plus.
  Sources : [Doc API](https://doc.tldv.io), [Tarifs](https://tldv.io/app/pricing/)
- **Otter.ai** : « Only Enterprise includes "Otter API and Webhooks." »
  Langues : « English, Spanish, French, German, Japanese, and Chinese
  (Simplified) », une langue à la fois. Pas d'endpoint documenté pour envoyer
  le bot à un lien.
  Source : [Tarifs](https://otter.ai/pricing) (pages d'aide lues via extraits de moteur de recherche, voir Limites)
- **MeetingBaaS** : `POST /v2/bots` (`meeting_url`, `bot_name` obligatoire,
  `transcription_config`, `callback_config`). Webhooks `bot.status_change`,
  `bot.completed`, `bot.failed`. Sur Meet, les bots « give their name and ask
  to be let in ». Données « hosted on the servers of Amazon Web Services,
  located in the European Union ». Plans : paiement à l'usage (rétention 3
  jours), Pro 99 $/mois, Scale 199 $/mois.
  Sources : [Doc API](https://docs.meetingbaas.com/llms/all), [Webhooks](https://docs.meetingbaas.com/api-v2/webhooks),
  [Tarifs](https://meetingbaas.com/pricing), [Confidentialité](https://www.meetingbaas.com/en/legal/privacy-policy)
- **Attendee** : licence Elastic 2.0 (source disponible, pas open source au
  sens OSI). « Five hours free, then $0.50 per hour », « down to $0.35 per
  hour ». Fournisseurs de transcription : Deepgram, OpenAI, Gladia,
  AssemblyAI, ElevenLabs… ou sous-titres natifs Meet. Pas de résumé.
  Sources : [Tarifs](https://attendee.dev/pricing), [Licence](https://raw.githubusercontent.com/attendee-labs/attendee/main/LICENSE),
  [Transcription](https://docs.attendee.dev/guides/transcription/index.md), [Webhooks](https://docs.attendee.dev/guides/webhooks/index.md)
- **Nylas Notetaker** : `POST /v3/notetakers` avec `meeting_link`,
  `join_time`, `meeting_settings` (`transcription`, `summary`,
  `action_items`). États dont `waiting_for_entry`, `failed_entry`, `kicked`.
  « If you don't approve its join request within 10 minutes ... it times
  out. » Médias gardés 14 jours max, URLs valables 60 min. Prix : « 5 bot
  hours » gratuites par mois, puis 0,65 à 0,80 $/h.
  Sources : [Notetaker](https://developer.nylas.com/docs/v3/notetaker/), [Référence API](https://developer.nylas.com/docs/reference/api/notetaker/),
  [Tarifs](https://www.nylas.com/pricing/)
- **Vexa** : Apache-2.0, `POST /bots` (`platform`, `native_meeting_id`),
  Whisper large-v3-turbo, « sub-second latency ». Attribution des locuteurs
  non garantie (« ~4-7% of rows under heavy crosstalk »). Hébergé 0,30 $/h +
  0,20 $/h. Résidence EU réservée à l'offre Enterprise.
  Sources : [README](https://raw.githubusercontent.com/Vexa-ai/vexa/main/README.md), [Tarifs](https://vexa.ai/pricing)
- **Skribby** : « $0.35 per hour », transcription de « $0.39/hour » (Groq
  Whisper) à « $1.36/hour » (Google Chirp 3), « No contracts, no minimums ».
  Sources : [Tarifs](https://skribby.io/pricing), [Doc](https://skribby.io/docs)
- **Read.ai** : Pro 15 $/mois (annuel), webhooks `meeting_end` avec
  `summary`, `action_items`, `transcript` ; API REST en bêta ouverte, sans
  endpoint documenté pour envoyer le bot.
  Source : [Tarifs](https://www.read.ai/pricing)

### 2.5 Rattacher la réunion à un projet Diaphane

Le rattachement est trivial : c'est nous qui envoyons le bot à
`Project.meetingUrl`, avec l'id du projet dans les métadonnées (Recall
`metadata`, Fireflies `clientReferenceId`, Nylas idem). Le webhook de fin nous
le rend. Reste à décider **quand** envoyer le bot : il faut savoir que la
réunion commence (bouton dans Diaphane, horaire planifié via `join_at`, ou
événement Agenda), le service tiers ne surveille pas une URL en continu.

### 2.6 Ce qui bloque

- **L'admission.** Un bot anonyme doit être admis à la main par quelqu'un dans
  la réunion, chez tous les fournisseurs. Google a de plus déployé (mars-avril
  2026) une « safeguarded guest admit flow » : les demandes suspectes vont dans
  une seconde file dont « The default action for entries in this queue is to
  deny entry ». Et si l'hôte décoche « Anyone can ask to join », « third-party
  bots, like note takers, that attempt to use "Ask to join" are automatically
  denied ».
  Sources : [Workspace Updates, fév. 2026](http://workspaceupdates.googleblog.com/2026/02/safeguarded-guest-admit-flow-in-google-meet.html),
  [Contrôler l'accès à une réunion](https://support.google.com/a/users/answer/11989526)
- **Le bot est visible** comme participant, avec un nom, chez tous. Meet peut
  le signaler avec un avertissement (chez Recall : « participant may not be who
  they claim to be »).
- **Le résumé** n'est fourni que par Fireflies, Nylas, MeetingBaaS (option).
  Avec les autres on ajoute un appel LLM (voir § 3.4).
- **Données hors UE par défaut** chez Fireflies ; région EU disponible chez
  Recall (`eu-central-1`) et MeetingBaaS.
- **Modèle au siège** (Fireflies, tl;dv, Otter, Read) : on paie un abonnement
  mensuel quel que soit le nombre de réunions ; seul Fireflies expose l'envoi
  du bot par API.

---

## 3. Construire le bot nous-mêmes

### 3.1 Ce qu'il faut techniquement

Google n'offre aucune API pour qu'un programme rejoigne une réunion Meet comme
participant. README d'Attendee : « Google Meet doesn't provide any support at
all, so you need to run a full instance of Google Meet in Chrome. » La seule
API « bots » de Google, Bots on Demand, sert aux tests de charge et « Only
allowlisted vendors may access the Bots on Demand API ».
Sources : [Attendee README](https://github.com/attendee-labs/attendee), [Bots on Demand](https://developers.google.com/bots-on-demand)

Ce que font les deux projets ouverts les plus actifs, lu dans leur code :

- **Attendee** (Python/Django, licence Elastic 2.0, 716 étoiles, dernier
  commit 2026-09-01, 138 issues ouvertes). Selenium + Chrome **134** épinglé,
  **pas headless** (le flag est commenté), Xvfb 1930x1090, PulseAudio, flags
  `--use-fake-device-for-media-stream`,
  `--disable-blink-features=AutomationControlled`, `--no-sandbox`. La capture
  audio ne passe pas par PulseAudio mais par un script JS injecté de 2 495
  lignes qui accroche les pistes WebRTC de la page et renvoie le PCM par
  WebSocket. Le bot rejoint en invité en tapant un nom dans
  `input[aria-label="Your name"]` puis « Ask to join », attend l'admission,
  détecte « Someone in the call denied your request to join », et la fin par
  le sélecteur `.roSPhc` contenant « You've been removed from the meeting »
  ou « Your host ended the meeting for everyone ». Ressources par bot dans
  leur déploiement Kubernetes : **4 vCPU, 4 Gio de RAM**. Le seul adaptateur
  Meet pèse ≈ 5 800 lignes (Python + JS), hors API, files d'attente,
  transcription et webhooks.
  Sources : [Dockerfile](https://github.com/attendee-labs/attendee/blob/main/Dockerfile),
  [google_meet_ui_methods.py](https://github.com/attendee-labs/attendee/blob/main/bots/google_meet_bot_adapter/google_meet_ui_methods.py),
  [google_meet_chromedriver_payload.js](https://github.com/attendee-labs/attendee/blob/main/bots/google_meet_bot_adapter/google_meet_chromedriver_payload.js),
  [bot_pod_creator.py](https://github.com/attendee-labs/attendee/blob/main/bots/bot_pod_creator/bot_pod_creator.py)
- **Vexa** (Apache-2.0, 2 739 étoiles, dernier commit 2026-09-02, 421 issues
  ouvertes). Playwright, Chromium avec fenêtre sous `Xvfb :99`, PulseAudio
  avec `module-null-sink`. README du module navigateur : « Launch flags are
  deliberately restrained: NO `--disable-web-security` /
  `--ignore-certificate-errors` (Google's bot layer flags those → "You can't
  join this video call") ». Transcription : service séparé **faster-whisper**
  sur image `nvidia/cuda:12.3.2`, avec une variante CPU ; « GPU inference is
  expensive, stateful, and hardware-specific ».
  Sources : [README](https://github.com/Vexa-ai/vexa), [remote-browser README](https://github.com/Vexa-ai/vexa/blob/main/modules/remote-browser/README.md),
  [transcription README](https://github.com/Vexa-ai/vexa/blob/main/services/transcription/README.md)
- **Recall.ai** décrit la même mécanique dans son blog : « Each bot runs a
  full Chromium instance inside a Docker container, consuming approximately
  500MB of RAM at minimum » ; la preuve de concept prend « one week », la
  production demande base, file, Kubernetes, alertes et « automated tests that
  continuously verify selector stability » ; « failures are silent. There's no
  audio indicator in logs or browser UI » ; « A minor frontend change (e.g.,
  class name, aria role) can break your scraper ».
  Sources : [Blog Recall — Meet](https://www.recall.ai/blog/how-to-get-transcripts-from-google-meet-developer-edition),
  [Blog Recall — Zoom](https://www.recall.ai/blog/how-to-build-a-zoom-bot)

### 3.2 Ce que disent les conditions de Google

- Conditions d'utilisation Google : interdiction de « bypass our systems or
  protective measures ». Rien de spécifique aux bots de réunion.
  Source : [Conditions d'utilisation](https://policies.google.com/terms)
- Politique d'utilisation acceptable Workspace : interdiction d'utiliser les
  services « for recording audio or video communications without
  authorization, where authorization would be required under applicable
  laws » et « to modify, disable, disrupt or bypass any aspect of the
  Services ». Pas de mention des participants automatiques.
  Source : [Acceptable Use Policy](https://workspace.google.com/terms/use_policy/)
- Aide Meet : les bots anonymes qui frappent sont refusés automatiquement si
  l'hôte a désactivé « Anyone can ask to join » (citation en § 2.6).
- Les deux projets ouverts gèrent explicitement le blocage « You can't join
  this video call » (Attendee : `UiGoogleBlockingUsException`, issue #758
  « we were assuming it was based only on IP, but it might be (IP, user
  agent) »). Leur contournement est un **compte Google connecté**, ce qui,
  d'après Recall, suppose un Workspace payant dédié.
  Source : [Attendee #758](https://github.com/attendee-labs/attendee/issues/758)

### 3.3 Transcription : prix pour une heure d'audio en français

| Fournisseur / modèle | Prix affiché | ≈ pour 1 h | Français | Locuteurs |
|---|---|---|---|---|
| OpenAI `whisper-1` | « $0.006 / minute » | 0,36 $ | Oui | Non |
| OpenAI `gpt-4o-mini-transcribe` | « $0.003 / minute estimated » | 0,18 $ | Oui | Non |
| OpenAI `gpt-4o-transcribe-diarize` | « $0.006 / minute estimated » | 0,36 $ | Oui | Oui |
| Deepgram Nova-3 (fichier) | « $0.0043/min » mono, « $0.0052/min » multilingue | 0,26 à 0,31 $ | `fr`, `fr-CA` | Inclus |
| AssemblyAI Universal-2 | « $0.15/hr » | 0,15 $ | Oui (99 langues) | « +$0.02/hr » |
| AssemblyAI Universal-3.5 Pro | « $0.21/hr » | 0,21 $ | Oui | « +$0.02/hr » |
| faster-whisper / whisper.cpp auto-hébergé | Temps machine | Voir ci-dessous | Oui | Non intégré |

Sources : [Tarifs OpenAI](https://developers.openai.com/api/docs/pricing),
[Speech-to-text OpenAI](https://developers.openai.com/api/docs/guides/speech-to-text) (fichiers « up to 25 MB », il faut découper une heure),
[Tarifs Deepgram](https://deepgram.com/pricing), [Langues Deepgram](https://developers.deepgram.com/docs/models-languages-overview),
[Tarifs AssemblyAI](https://www.assemblyai.com/pricing), [Langues AssemblyAI](https://www.assemblyai.com/docs/speech-to-text/pre-recorded-audio/supported-languages)

Whisper en français : le papier Whisper donne, pour `large-v2` sur Fleurs,
**8,3 % de mots erronés en français** (anglais 4,2 %, espagnol 3,0 %). La
fiche large-v3 annonce « 10% to 20% reduction of errors compared to Whisper
large-v2 » et prévient des hallucinations (« predictions may include texts
that are not actually spoken »). Le modèle `large` demande « ~10 GB » de
VRAM, `turbo` « ~6 GB ». faster-whisper : 13 min d'audio en 1 min 03 sur GPU
(4,5 Go VRAM), ou `small` en int8 sur CPU 8 threads en 1 min 42. Railway n'a
pas de GPU.
Sources : [Papier Whisper, table 13](https://cdn.openai.com/papers/whisper.pdf), [whisper-large-v3](https://huggingface.co/openai/whisper-large-v3),
[Dépôt Whisper](https://github.com/openai/whisper), [faster-whisper](https://github.com/SYSTRAN/faster-whisper)

### 3.4 Résumé par LLM : quelques centimes par réunion

Une heure de réunion ≈ 15 000 jetons en entrée, ≈ 1 500 en sortie.

| Modèle | $/M entrée | $/M sortie | ≈ par réunion |
|---|---|---|---|
| OpenAI gpt-4o-mini | 0,15 | 0,60 | 0,003 $ |
| OpenAI gpt-5-mini | 0,25 | 2,00 | 0,007 $ |
| OpenAI gpt-5 | 1,25 | 10,00 | 0,034 $ |
| Gemini 3.5 Flash-Lite | 0,30 | 2,50 | 0,008 $ |
| Gemini 3.7 Flash | 0,75 | 3,75 | 0,017 $ |
| Claude Haiku 4.5 | 1 | 5 | 0,023 $ |
| Claude Sonnet 5 | 2 | 10 | 0,045 $ |
| Claude Opus 5 | 5 | 25 | 0,11 $ |

Ordre de grandeur : **0,001 à 0,05 $ par réunion**. Le résumé coûte dix à cent
fois moins que la transcription, qui coûte elle-même moins que le conteneur du
bot. Cela vaut aussi pour la famille 2 quand le fournisseur ne résume pas.
Sources : [Tarifs OpenAI](https://developers.openai.com/api/docs/pricing), [Tarifs Claude](https://platform.claude.com/docs/en/about-claude/pricing),
[Tarifs Gemini](https://ai.google.dev/pricing)

### 3.5 Héberger le bot sur Railway

- Tarifs : CPU « $20 / vCPU / month ($0.000463 / vCPU / minute) » ≈ 0,028 $
  par vCPU-heure ; RAM « $10 / GB / month ($0.000231 / GB / minute) » ≈
  0,014 $ par Go-heure ; facturation à la seconde ; « stopped services cost
  nothing ». Plan Free : 1 vCPU et 0,5 Go par service, en dessous des 500 Mo
  minimum d'un Chromium ; Hobby 5 $/mois, Pro 20 $/mois.
  Source : [Plans Railway](https://docs.railway.com/reference/pricing/plans)
- Coût du conteneur par heure de réunion : ≈ 0,17 $ avec les 4 vCPU / 4 Gio
  d'Attendee ; ≈ 0,08 $ à 2 vCPU / 2 Go ; ≈ 0,04 $ à 1 vCPU / 1 Go. Un worker
  1 vCPU / 1 Go allumé en permanence ≈ 30 $/mois à pleine charge.
- Railway construit n'importe quel `Dockerfile`. Rien dans sa doc sur les
  conteneurs privilégiés ou les modules noyau ; Attendee et Vexa n'utilisent
  que des processus utilisateur (Xvfb, PulseAudio, Chromium). **Aucune source
  primaire ne confirme qu'un bot Meet tourne effectivement sur Railway.**
  Source : [Dockerfiles Railway](https://docs.railway.com/guides/dockerfiles)
- La mise en veille (« app sleeping ») réveille sur trafic entrant, avec un
  possible 502 sur la première requête : un bot qui doit rejoindre à l'heure
  a besoin d'un déclencheur, pas d'un service endormi.
  Source : [App sleeping](https://docs.railway.com/reference/app-sleeping)

### 3.6 Effort et maintenance documentés

- Taille : ≈ 5 800 lignes pour la seule couche navigateur d'Attendee ; Vexa
  découpe le même problème en une quinzaine de modules.
- Fragilité : Attendee cible des libellés anglais (« Ask to join »,
  « Got it », « You've been removed from the meeting ») et des classes
  obfusquées (`.roSPhc`, `.ByPkaf`) que Google change sans préavis. Issues
  ouvertes : #130 « UiCouldNotLocateElementException, Google Meet Bot »
  (depuis mars 2025), #605 (bot éjecté si le message de consentement
  d'enregistrement ne s'affiche pas), #614 (Chrome épinglé en 134, essai de
  passage en 144).
  Source : [Issues Attendee](https://github.com/attendee-labs/attendee/issues)
- Chez Vexa, en 2026 : #806 « joining-stage failures are the top organic
  failure (198 in 10 days, google_meet-dominant) » ; #1110 « bots give up
  after a fixed ~10 min in the lobby — why admission never arrives is
  unknown » ; #1251 passer l'avis « Gemini is taking notes » ; #1252 plugin
  « stealth » et usurpation d'empreinte WebGL.
  Source : [Issues Vexa](https://github.com/Vexa-ai/vexa/issues)
- Côté Google, cibles mobiles depuis mars 2026 : file d'admission « à
  refuser par défaut », refus automatique des « Ask to join » anonymes si
  l'hôte le décide, blocage lié à l'IP, aux flags et au user-agent.

### 3.7 Rattacher au projet et ce qui bloque

Le rattachement est le même que pour la famille 2 (on lance le bot sur
`Project.meetingUrl`, avec l'id du projet). Ce qui bloque :

- Le même problème d'**admission** qu'en famille 2, à résoudre seuls.
- Le **blocage anti-bot** de Google, dont la parade documentée (compte Google
  connecté) coûte un Workspace dédié.
- Une **maintenance continue** : chaque changement d'interface Meet peut
  casser le bot, sans erreur visible (« failures are silent »).
- Un **conteneur par réunion** (isolation audio), donc de l'orchestration ; le
  plan Free de Railway est trop petit.
- Pas de GPU sur Railway : Whisper auto-hébergé serait sur CPU, ou il faut un
  fournisseur de transcription payant (§ 3.3).

---

## Limites de cette recherche

- Google : pas de délai chiffré entre la fin de la réunion et la
  disponibilité de la transcription ou des notes ; non vérifié si l'API Meet
  REST accepte un compte Gmail gratuit (sans importance ici : transcription et
  notes exigent de toute façon une édition payante) ; prix relevés en euros,
  pas en dollars.
- Otter.ai et Read.ai : leurs pages d'aide renvoient une erreur 403 à la
  lecture automatisée ; les citations viennent des extraits affichés par un
  moteur de recherche, pas d'une lecture directe. Les pages de tarifs ont été
  lues directement.
- Recall.ai : la durée exacte du délai d'attente en salle d'attente n'est pas
  écrite dans les pages lues ; les certifications (SOC 2, ISO 27001) viennent
  d'extraits de recherche, la page `/security` ne répondait pas.
- Fireflies : le palier exact nécessaire à `addToLiveMeeting` n'est pas écrit
  noir sur blanc (la page tarifs dit « business tier gets API access », la
  page limites donne des quotas dès Free).
- Attendee : comportement en salle d'attente Meet lu dans le code, pas dans
  une doc ; Vexa : consommation CPU/RAM par bot non documentée.
- Railway : aucune preuve qu'un conteneur Chromium + Xvfb + PulseAudio y
  tourne ; coût CPU en veille non vérifié.
- L'expression « potential risk » que Meet afficherait à côté d'un bot
  n'apparaît que dans un fil communautaire et chez les fournisseurs, pas sur
  une page officielle Google lue directement.

## Sources

### Google

- [Meet REST API — référence v2](https://developers.google.com/workspace/meet/api/reference/rest/v2)
- [spaces](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces), [spaces.get](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/get), [spaces.create](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/create), [spaces.patch](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/patch)
- [conferenceRecords](https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords), [conferenceRecords.list](https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords/list)
- [transcripts](https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords.transcripts), [transcripts.entries](https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords.transcripts.entries), [entries.list](https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords.transcripts.entries/list), [DocsDestination](https://developers.google.com/workspace/meet/api/reference/rest/v2/DocsDestination)
- [smartNotes](https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords.smartNotes), [recordings](https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords.recordings)
- [Guide artefacts](https://developers.google.com/workspace/meet/api/guides/artifacts), [Guide conférences](https://developers.google.com/workspace/meet/api/guides/conferences), [Configuration des espaces](https://developers.google.com/workspace/meet/api/guides/meeting-spaces-configuration), [Espaces de réunion](https://developers.google.com/workspace/meet/api/guides/meeting-spaces-overview)
- [Authentification et scopes](https://developers.google.com/workspace/meet/api/guides/authenticate-authorize), [Limites et quotas](https://developers.google.com/workspace/meet/api/guides/limits), [Notes de version](https://developers.google.com/workspace/meet/release-notes), [Quickstart Node.js](https://developers.google.com/workspace/meet/api/guides/quickstart/nodejs), [Tutoriel événements (Python)](https://developers.google.com/workspace/meet/api/guides/tutorial-events-python)
- [Workspace Events — événements Meet](https://developers.google.com/workspace/events/guides/events-meet), [Guide](https://developers.google.com/workspace/events/guides), [Créer un abonnement](https://developers.google.com/workspace/events/guides/create-subscription), [Renouveler](https://developers.google.com/workspace/events/guides/update-subscription), [Cycle de vie](https://developers.google.com/workspace/events/guides/events-lifecycle), [Autorisation](https://developers.google.com/workspace/events/guides/auth)
- [Docs API documents.get](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/get), [Drive files.export](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export), [Scopes Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Aide — Transcriptions Meet](https://support.google.com/meet/answer/12849897), [Aide — Take notes for me](https://support.google.com/meet/answer/14754931), [Aide — fonctionnalités Meet premium par édition](https://support.google.com/meet/answer/10459644), [Aide — éditions incluant Gemini](https://support.google.com/docs/answer/13952129), [Aide — contrôler l'accès](https://support.google.com/a/users/answer/11989526)
- [Admin — transcription](https://knowledge.workspace.google.com/admin/meet/turn-meeting-transcription-on-or-off), [Admin — notes Gemini](https://knowledge.workspace.google.com/admin/meet/let-google-meet-ai-take-notes-for-my-users), [Admin — comparer les éditions Business](https://knowledge.workspace.google.com/admin/getting-started/editions/compare-business-editions)
- [Tarifs Workspace](https://workspace.google.com/pricing), [Tarifs Workspace (fr)](https://workspace.google.com/intl/fr/pricing)
- [Workspace Updates — safeguarded guest admit flow](http://workspaceupdates.googleblog.com/2026/02/safeguarded-guest-admit-flow-in-google-meet.html), [Conditions d'utilisation](https://policies.google.com/terms), [Acceptable Use Policy](https://workspace.google.com/terms/use_policy/), [Bots on Demand](https://developers.google.com/bots-on-demand)

### Bots tiers

- Recall.ai : [tarifs](https://www.recall.ai/pricing), [Create Bot](https://docs.recall.ai/reference/bot_create), [Google Meet](https://docs.recall.ai/docs/google-meet.md), [FAQ Meet](https://docs.recall.ai/docs/google-meet-faq.md), [bot connecté](https://docs.recall.ai/docs/google-meet-login-getting-started.md), [statuts](https://docs.recall.ai/docs/bot-status-change-events), [sous-codes](https://docs.recall.ai/docs/sub-codes.md), [transcription](https://docs.recall.ai/docs/transcription), [transcription Recall](https://docs.recall.ai/docs/recallai-transcription), [sous-titres](https://docs.recall.ai/docs/meeting-caption-transcription), [temps réel](https://docs.recall.ai/docs/bot-real-time-transcription), [webhooks](https://docs.recall.ai/docs/recording-webhooks), [rétention](https://docs.recall.ai/docs/data-retention), [régions](https://docs.recall.ai/docs/regions), [facturation](https://docs.recall.ai/docs/billing-faq.md), [blog Meet](https://www.recall.ai/blog/how-to-get-transcripts-from-google-meet-developer-edition), [blog Zoom](https://www.recall.ai/blog/how-to-build-a-zoom-bot)
- Fireflies : [addToLiveMeeting](https://docs.fireflies.ai/graphql-api/mutation/add-to-live), [transcript](https://docs.fireflies.ai/graphql-api/query/transcript), [webhooks](https://docs.fireflies.ai/graphql-api/webhooks), [limites](https://docs.fireflies.ai/fundamentals/limits), [langues](https://docs.fireflies.ai/miscellaneous/language-codes), [tarifs](https://fireflies.ai/pricing), [guide des plans](https://guide.fireflies.ai/articles/3734844560-learn-about-the-fireflies-pricing-plans), [plan Business](https://guide.fireflies.ai/articles/2063312779-fireflies-business-tier-pricing-and-features), [traitement](https://guide.fireflies.ai/articles/3928294306-learn-about-meeting-transcription-processing-in-fireflies), [réunion en cours](https://guide.fireflies.ai/articles/9977523795-how-to-add-fireflies-to-an-ongoing-meeting), [comment le bot rejoint](https://guide.fireflies.ai/articles/9554534786-how-fireflies-joins-and-records-your-meetings-faqs), [stockage](https://guide.fireflies.ai/articles/9596505232-learn-about-data-storage-and-transfer)
- tl;dv : [doc API](https://doc.tldv.io), [tarifs](https://tldv.io/app/pricing/), [langues](https://tldv.io/features/languages/)
- Otter.ai : [tarifs](https://otter.ai/pricing), [API publique](https://help.otter.ai/hc/en-us/articles/36130822688279-Otter-ai-Public-API), [webhooks](https://help.otter.ai/hc/en-us/articles/35634832371735-Workspace-Webhooks), [langues](https://help.otter.ai/hc/en-us/articles/360047247414-Supported-languages)
- MeetingBaaS : [tarifs](https://meetingbaas.com/pricing), [doc API](https://docs.meetingbaas.com/llms/all), [webhooks](https://docs.meetingbaas.com/api-v2/webhooks), [confidentialité](https://www.meetingbaas.com/en/legal/privacy-policy), [meet-teams-bot](https://github.com/Meeting-Baas/meet-teams-bot)
- Attendee : [tarifs](https://attendee.dev/pricing), [licence](https://raw.githubusercontent.com/attendee-labs/attendee/main/LICENSE), [webhooks](https://docs.attendee.dev/guides/webhooks/index.md), [transcription](https://docs.attendee.dev/guides/transcription/index.md), [dépôt](https://github.com/attendee-labs/attendee)
- Skribby : [tarifs](https://skribby.io/pricing), [doc](https://skribby.io/docs)
- Vexa : [tarifs](https://vexa.ai/pricing), [README](https://raw.githubusercontent.com/Vexa-ai/vexa/main/README.md), [dépôt](https://github.com/Vexa-ai/vexa)
- Nylas : [Notetaker](https://developer.nylas.com/docs/v3/notetaker/), [médias](https://developer.nylas.com/docs/v3/notetaker/media-handling/), [référence API](https://developer.nylas.com/docs/reference/api/notetaker/), [tarifs](https://www.nylas.com/pricing/)
- Read.ai : [tarifs](https://www.read.ai/pricing)

### Transcription, LLM, hébergement

- [Tarifs OpenAI](https://developers.openai.com/api/docs/pricing), [Speech-to-text OpenAI](https://developers.openai.com/api/docs/guides/speech-to-text)
- [Tarifs Deepgram](https://deepgram.com/pricing), [modèles et langues](https://developers.deepgram.com/docs/models-languages-overview), [diarisation](https://developers.deepgram.com/docs/diarization)
- [Tarifs AssemblyAI](https://www.assemblyai.com/pricing), [langues](https://www.assemblyai.com/docs/speech-to-text/pre-recorded-audio/supported-languages), [locuteurs](https://www.assemblyai.com/docs/speech-to-text/speaker-diarization)
- [Dépôt Whisper](https://github.com/openai/whisper), [whisper-large-v3](https://huggingface.co/openai/whisper-large-v3), [papier Whisper](https://cdn.openai.com/papers/whisper.pdf), [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- [Tarifs Claude](https://platform.claude.com/docs/en/about-claude/pricing), [Tarifs Gemini](https://ai.google.dev/pricing)
- [Tarifs Railway](https://railway.com/pricing), [plans](https://docs.railway.com/reference/pricing/plans), [app sleeping](https://docs.railway.com/reference/app-sleeping), [Dockerfiles](https://docs.railway.com/guides/dockerfiles)
