# Notion — intégration publique (OAuth) : les faits

Recherche pour le ticket [#56](https://github.com/JSharles/diaphane/issues/56). Sources : uniquement les pages officielles de `developers.notion.com`, consultées le 2 septembre 2026. Citations en anglais, verbatim. Aucune recommandation ici — uniquement ce que les sources disent, et ce qu'elles ne disent pas.

Vocabulaire : depuis la refonte de la documentation, Notion appelle « connection » ce qui s'appelait « integration » (« A Notion connection — sometimes called an integration »). La « Integration Gallery » s'appelle désormais « Marketplace ». La version d'API courante est `2026-03-11`.

## 1. Revue Notion et informations exigées

### Une revue n'est exigée que pour la liste sur le Marketplace, pas pour l'usage OAuth

> « Public connections must undergo a Notion security review before being listed on the Marketplace. You can create and use a public connection without listing it. »
> — [Overview](https://developers.notion.com/guides/get-started/overview)

> « Do I need to list my public connection on the Marketplace? No. Public connections work independently of Marketplace listings. Listing on the Marketplace is optional and helps your connection reach a wider audience, but your connection can be used via its OAuth flow without being listed. »
> — [List on the Marketplace](https://developers.notion.com/guides/get-started/marketplace-listing)

> « The Notion Marketplace is how Notion users discover and connect public connections. Listing your connection there puts it in front of every Notion user — and it's a separate step from building the connection itself, so you can ship whenever you're ready. »
> — [List on the Marketplace](https://developers.notion.com/guides/get-started/marketplace-listing)

Qui peut installer une connexion publique (sans liste sur le Marketplace) dépend de son « installation scope », choisi à la création et non modifiable ensuite :

> « Any workspace — Any Notion user, in any workspace. — Marketplace eligible: Yes »
> « Selected workspaces only — Only the workspaces you select at creation time. — Marketplace eligible: No »
> « Installation scope is set once, at creation time, and can't be changed afterward. »
> — [Public connections](https://developers.notion.com/guides/get-started/public-connections)

Point non concordant, rapporté tel quel : le guide Authorization contient une phrase qui laisse entendre que l'URL d'autorisation dépend d'une soumission en revue :

> « The Authorization URL field populates after a public connection is submitted for review »
> — [Authorization](https://developers.notion.com/guides/get-started/authorization), légende sous « Step 1 »

Le guide Public connections, lui, dit que l'URL est disponible dans l'onglet Configuration dès la création : « The user visits the connection's authorization URL. Find this URL in the Configuration tab of your connection in the Developer portal. » Les sources primaires ne permettent pas de trancher si cette légende est un reliquat de l'ancienne documentation ou une condition réelle.

### Délai et processus de la revue Marketplace

> « After submission, expect to hear back from our team within 5-10 business days via email. »
> « Connections are rejected for various reasons, from brand/trademark issues to quality concerns to situations where the baseline connection criteria isn't met. »
> — [List on the Marketplace](https://developers.notion.com/guides/get-started/marketplace-listing)

### Informations exigées pour créer une connexion publique

Champs listés par la documentation à la création :

> « Click Create new connection and fill in the required fields, including:
> - Connection name and development workspace
> - Redirect URI(s) for the OAuth flow
> - Installation scope — choose Any workspace or Selected workspaces only (…)
> - Connection capabilities (read content, update content, insert content, etc.) »
> — [Public connections](https://developers.notion.com/guides/get-started/public-connections)

> « Marketplace listing details (such as descriptions, categories, and images) are managed separately through the Listings section. »
> — [Public connections](https://developers.notion.com/guides/get-started/public-connections)

Champs listés pour une fiche Marketplace :

> « Fill in the listing details, including: Listing name and description — Category and tags — Listing images and logo — The public connection to associate with this listing »
> — [List on the Marketplace](https://developers.notion.com/guides/get-started/marketplace-listing)

**Non confirmé par une source primaire** : la documentation actuelle de `developers.notion.com` ne mentionne ni politique de confidentialité, ni conditions d'utilisation, ni email de support comme champs obligatoires, que ce soit pour créer la connexion publique ou pour la fiche Marketplace. Le guide « List on the Marketplace » renvoie vers une page Notion « Notion Connection Gallery Best Practices » (`notion.com/notiondevs/Notion-Integration-Gallery-Best-Practices-997825927fd6473e89617ce0c329145c`) qui n'est rendue que côté client et n'a pas pu être lue ; c'est elle qui détaillerait les « baseline connection criteria ». La liste exacte des champs du formulaire du Developer portal n'a pas été vérifiée non plus (portail derrière authentification).

## 2. Ce que renvoie l'autorisation, et la liste des pages cochées

### Un token par autorisation (utilisateur × workspace)

> « public connections follow the OAuth 2.0 protocol: each user who authorizes the connection receives their own access token, scoped to their workspace. »
> — [Public connections](https://developers.notion.com/guides/get-started/public-connections)

> « After a user authorizes a public connection, only that user can interact with the connection in their workspace. If multiple members in a workspace want to use the same public connection, each user needs to complete the authorization flow individually. »
> — [Public connections](https://developers.notion.com/guides/get-started/public-connections)

Réponse de `POST /v1/oauth/token` (grant `authorization_code`) :

> « `access_token` — An access token used to authorize requests to the Notion API.
> `refresh_token` — A refresh token used to generate a new access token
> `bot_id` — An identifier for this authorization.
> `duplicated_template_id` — The ID of the new page created in the user's workspace. (…) If the developer didn't provide a template for the connection, then the value is null.
> `owner` — An object containing information about who can view and share this connection. A user object is returned, representing the user who authorized the connection.
> `workspace_icon` — A URL to an image that can be used to display this authorization in the UI.
> `workspace_id` — The ID of the workspace where this authorization took place.
> `workspace_name` — A human-readable name that can be used to display this authorization in the UI. »
> — [Authorization](https://developers.notion.com/guides/get-started/authorization), Step 4

Le schéma de référence ajoute `token_type: "bearer"` et `request_id`, et n'a **aucun champ `expires_in`** ([Create a token](https://developers.notion.com/reference/create-a-token)).

Depuis le 8 juin 2026, chaque autorisation produit un nouveau couple de tokens :

> « New public connections now mint a fresh access_token and refresh_token for each successful OAuth authorization instead of returning the existing active token. Existing connections keep their previous behavior. Store the token pair from every successful response — including re-authorizations of the same connection »
> — [Changelog, June 8, 2026](https://developers.notion.com/page/changelog)

### Le page picker

> « If the user opts to Select pages, then a page picker interface opens. A user can search for and select pages and databases to share with the connection from the page picker. The page picker only displays pages or databases to which a user has full access, because a user needs full access to a resource in order to be able to share it with a connection. »
> « Parent pages can be selected to quickly provide access to child pages, as giving access to a parent page will provide access to all available child pages. Users can return to this view at a later time to update access settings if circumstances change. »
> « If the user clicks Allow access and the rest of the auth flow is not completed, the connection will not have access to the pages that were selected. »
> — [Authorization](https://developers.notion.com/guides/get-started/authorization)

La réponse du token **ne contient pas** la liste des pages cochées (aucun champ de ce type dans le schéma de [Create a token](https://developers.notion.com/reference/create-a-token)).

### Retrouver les pages partagées : `POST /v1/search`

> « Searches all parent or child pages and data_sources that have been shared with a connection. »
> « If no `query` param is provided, then the response contains all pages or data_sources that have been shared with the connection. »
> « To limit the request to pages or data sources, use the `filter` parameter with `property: "object"` and a `value` of `"page"` or `"data_source"`. »
> — [Search by title](https://developers.notion.com/reference/post-search)

Limites documentées du `search` pour cet usage :

> « Our implementation of the search endpoint includes an optimization where any pages or databases that are directly shared with a connection are guaranteed to be returned. »
> « It is not optimized for the following use cases: Exhaustively enumerating through all the documents that a bot has access to in a workspace. Search is not guaranteed to return everything, and the index may change as your connection iterates through pages and databases. »
> « Immediate and complete results. Search indexing is not immediate. If a connection performs a search quickly after a page is shared with the connection (such as immediately after a user performs OAuth), then the response may not contain the page. When a connection needs to present a user interface that depends on search results, we recommend including a Refresh button to retry the search. »
> — [Search optimizations and limitations](https://developers.notion.com/reference/search-optimizations-and-limitations)

Pagination : `page_size` « Default: 100 — Maximum: 100 », avec `has_more` / `next_cursor` ([Introduction](https://developers.notion.com/reference/intro)).

Autre moyen de partager des pages hors flux OAuth : le tableau comparatif indique pour les connexions publiques « Users choose which pages to share during the OAuth flow or via the Add connections menu. » ([Overview](https://developers.notion.com/guides/get-started/overview)).

### Relancer le flux pour cocher d'autres pages

Ce que disent les sources : « Users can return to this view at a later time to update access settings if circumstances change. » ([Authorization](https://developers.notion.com/guides/get-started/authorization)) et « This includes re-authorization of the same connection, where Notion may return a new access_token and refresh_token. » (même page, Step 5).

**Non confirmé** : la documentation ne dit pas si une ré-autorisation *ajoute* les pages cochées aux pages déjà partagées ou *remplace* la sélection précédente, ni si l'ancien `access_token` reste valide après une ré-autorisation qui en émet un nouveau.

## 3. Durée de vie du token, refresh, retrait d'accès

### Refresh

> « Notion responds to the request with an access_token, refresh_token, and additional information. (…) The refresh_token will be used to refresh the access token, which generates a new access_token. »
> « Refreshing an access token will generate a new access token and a new refresh token. »
> Requête : `POST https://api.notion.com/v1/oauth/token`, Basic auth `CLIENT_ID:CLIENT_SECRET`, corps `{"grant_type":"refresh_token","refresh_token":"…"}`.
> — [Authorization](https://developers.notion.com/guides/get-started/authorization), Steps 4 à 6 ; [Refresh a token](https://developers.notion.com/reference/refresh-a-token)

Le schéma de réponse déclare `refresh_token` comme `string | null` ([Create a token](https://developers.notion.com/reference/create-a-token)) ; le guide Authorization le marque « Not null ✅ ». Les sources ne disent pas dans quel cas il serait `null`.

### Durée de vie

**Non confirmé** : aucune page de `developers.notion.com` ne donne la durée de vie de l'`access_token` ni du `refresh_token` d'une connexion publique. La réponse du token n'a pas de champ `expires_in`. La seule durée documentée concerne un autre produit : « Notion MCP access tokens now last about eight hours, up from one hour. Clients must continue to rely on the token response's expires_in value » ([Changelog, July 14, 2026](https://developers.notion.com/page/changelog)) — ce sont les tokens du serveur MCP, pas ceux de l'API REST via connexion publique. Le seul indice côté API REST est le code d'erreur :

> « 400 `invalid_grant` — The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client. »
> — [Status codes](https://developers.notion.com/reference/status-codes)

Endpoints de cycle de vie disponibles côté développeur :

- [Introspect a token](https://developers.notion.com/reference/introspect-token) — « Get a token's active status, scope, and issued time. » Réponse : `{ "active": true, "scope": "…", "iat": 123 }`.
- [Revoke a token](https://developers.notion.com/reference/revoke-token) — « Revoke an access token. » `POST /v1/oauth/revoke`, corps `{"token":"…"}`, Basic auth client.

### Quand l'utilisateur retire l'accès depuis Notion

**Non confirmé** : aucune page de `developers.notion.com` ne décrit ce qui se passe côté API quand l'utilisateur déconnecte la connexion depuis les réglages de Notion. Les seuls faits documentés sont les codes d'erreur génériques :

> « 401 `unauthorized` — The bearer token is not valid. » (exemple : « API token is invalid. »)
> « 403 `restricted_resource` — The token lacks permission, or the request exceeds a workspace block limit. »
> « 404 `object_not_found` — Given the bearer token used, the resource does not exist. This error can also indicate that the resource has not been shared with owner of the bearer token. »
> — [Status codes](https://developers.notion.com/reference/status-codes)

Et pour les pages non partagées : « If the page is not shared, any API requests made will respond with an error. » ([Authorization](https://developers.notion.com/guides/get-started/authorization), section internes). L'endpoint [Introspect a token](https://developers.notion.com/reference/introspect-token) renvoie `active: true/false`, sans que la documentation précise ce qui fait passer un token à `false`.

## 4. Limites d'appel de l'API

> « The Notion API enforces two rate limits:
> - Per connection — an average of three requests per second, with some bursts beyond the average allowed.
> - Per workspace — shared across all of the workspace's connections and scaled to the workspace's plan.
>
> Requests that exceed either limit return a `"rate_limited"` error code and an HTTP 429 response, with `additional_data.rate_limit_reason` indicating which limit was exceeded (for example, `public_api_request_rate_limit` or `public_api_space_request_rate_limit`). »
> — [Request limits](https://developers.notion.com/reference/request-limits)

> « Connections should handle HTTP 429 and 529 responses and respect the `Retry-After` response header. The header value is an integer number of seconds. A 529 response carries the `"service_overload"` code and means Notion is temporarily overloaded; retry it the same way as a 429. »
> « Rate limits may change — In the future, Notion plans to adjust rate limits to balance for demand and reliability. »
> — [Request limits](https://developers.notion.com/reference/request-limits)

Le SDK JavaScript officiel « retries 429 responses for every method. It also retries 500 and 503 responses for GET and DELETE requests. It respects Retry-After, uses exponential backoff with jitter, and limits retries. » (même page). Depuis `@notionhq/client` v5.23.0 il « automatically retries service_overload (HTTP 529) responses » ([Changelog, July 8, 2026](https://developers.notion.com/page/changelog)).

**Non confirmé** : la limite « per connection » de 3 req/s n'est pas précisée comme étant par `access_token` (c'est-à-dire par utilisateur ayant autorisé) ou pour l'ensemble des autorisations d'une même connexion publique. Le montant de la limite « per workspace » par plan n'est pas chiffré. L'ampleur des « bursts » n'est pas chiffrée.

Autres plafonds pertinents pour une relecture :

- Pagination : 100 éléments maximum par page sur tous les endpoints paginés, dont `search` et « Retrieve block children » ([Introduction](https://developers.notion.com/reference/intro)).
- « A single data source query returns at most 10,000 results » ([Changelog, July 8, 2026](https://developers.notion.com/page/changelog)) ; le guide [Query large data sources](https://developers.notion.com/guides/data-apis/query-large-data-sources) décrit le contournement.
- Timeout : « 503 `service_unavailable` — This can occur when the time to respond to a request takes longer than 60 seconds, the maximum request timeout. » ([Status codes](https://developers.notion.com/reference/status-codes)).
- Depuis le 1er septembre 2026, « the REST API enforces the existing Free workspace block limit for internal connections and OAuth connections restricted to selected workspaces » (réponse HTTP 403) — ne s'applique pas aux connexions publiques en scope « Any workspace » ([Changelog, September 1, 2026](https://developers.notion.com/page/changelog) ; [Workspace block limits](https://developers.notion.com/reference/workspace-block-limits)).
- Une alternative au polling est documentée : « Connections can subscribe to real-time events — like page updates, property changes, and new comments — via webhooks. » ([Overview](https://developers.notion.com/guides/get-started/overview)).

## Sources consultées

- https://developers.notion.com/guides/get-started/overview
- https://developers.notion.com/guides/get-started/public-connections
- https://developers.notion.com/guides/get-started/authorization
- https://developers.notion.com/guides/get-started/marketplace-listing
- https://developers.notion.com/guides/get-started/handling-api-keys
- https://developers.notion.com/reference/create-a-token
- https://developers.notion.com/reference/refresh-a-token
- https://developers.notion.com/reference/revoke-token
- https://developers.notion.com/reference/introspect-token
- https://developers.notion.com/reference/post-search
- https://developers.notion.com/reference/search-optimizations-and-limitations
- https://developers.notion.com/reference/intro
- https://developers.notion.com/reference/request-limits
- https://developers.notion.com/reference/status-codes
- https://developers.notion.com/page/changelog
- https://developers.notion.com/guides/resources/historical-changelog
