# BibouKart 🏁

Un jeu de karting 3D low-poly original, entièrement dans le navigateur. **Three.js + TypeScript + Vite**, sans backend, sans compte, sans installation pour les joueurs.

## Jouer

- **PC : 1 à 4 humains** sur un même appareil, clavier partagé et/ou manettes.
- **Mobile : 1 à 2 humains**, commandes tactiles séparées, écran paysage.
- 8 personnages et 8 karts aux silhouettes et caractéristiques différentes.
- 5 circuits : Prairie des lucioles, Canyon vermeil, Archipel azur, Col des flocons (montagnes enneigées, sapins, chalets et neige animée) et Boulevard des bibous (immeubles, vitrines, lampadaires et feux). Chacun propose du relief, un raccourci et un obstacle mobile.
- Courses de 3 tours à 6 concurrents ; les bots complètent la grille.
- Mini-carte avec les six concurrents, notification « Dernier tour ! », roues et volant noir animés, phares blanc chaud à l'avant et feux rouges intensifiés au freinage à l'arrière, réactions des pilotes et podium 3D.
- Moulins, arches rocheuses et palmiers ; terrain vallonné, bosses permettant de vrais sauts, obstacles mobiles annoncés et raccourcis étroits éloignés du tracé principal.
- Bots faciles, normaux ou difficiles, au choix avant la course. Le réglage est sauvegardé et conservé pour la revanche.
- Boîtes cadeaux : missile guidé, turbo, bouclier, flaque, mode géant et onde de choc. Bandes de turbo sur la route.
- Géant : taille doublée pendant 7 secondes, résistance aux obstacles de la route et projection des adversaires sur les bas-côtés, suivie d'un retour en piste sans gain de progression. Les autres objets restent efficaces ; les boucliers absorbent les projections et deux géants se repoussent normalement.
- Onde de choc : saut même à l'arrêt, puis impact à l'atterrissage qui assomme les rivaux à moins de 8 mètres pendant 1,5 seconde. En l'air, l'objet arme le prochain atterrissage. Le bouclier absorbe l'attaque et l'immunité temporaire empêche les assommages en chaîne.
- Missile à ogive et ailerons, réacteur lumineux, traînée et explosion ; flaque sombre aux contours irréguliers, reflets colorés et éclaboussures. Anneau d'onde de choc, poussière et étoiles d'assommage, avec une variante à animations réduites.
- Turbos : jets lumineux et léger élargissement de la vue ; cadeaux : gerbe d'étoiles, anneau doré et mise en valeur de l'objet reçu. Variante discrète avec les animations réduites.
- Musique originale en boucle (8 mesures, 116 BPM), basse, mélodie et percussions ; sons distincts de cadeaux, pouvoirs, collisions, départ et arrivée. Volumes général/musique/effets indépendants.
- Pas de drift, multijoueur réseau, téléchargement de contenu ou installation nécessaire.

Le garage permet de choisir les pilotes, karts et contrôleurs, puis un circuit. Après l'arrivée du premier humain, les autres disposent de 45 secondes ; la course se termine plus tôt si tous les humains sont arrivés.

### Commandes par défaut

| Action            | Clavier J1 | Clavier J2 | Manette standard |
| ----------------- | ---------- | ---------- | ---------------- |
| Accélérer         | W          | ↑          | RT ou A          |
| Freiner / reculer | S          | ↓          | LT ou B          |
| Tourner           | A / D      | ← / →      | Stick gauche     |
| Objet             | Espace     | Entrée     | X                |
| Pause / reprendre | Échap      | Échap      | Start            |

Touches **physiques** modifiables dans les réglages : sur AZERTY, remapper W/A en Z/Q si souhaité. Profils 3 et 4 : I/K/J/L/O et pavé numérique 8/5/4/6/0. Plusieurs touches simultanées peuvent être bloquées par certains claviers : privilégier les manettes à 3–4 joueurs.

Dans **Réglages → Une manette à votre façon**, chaque joueur peut personnaliser accélération, frein/recul, gauche, droite, objet et pause. Cliquez une action, relâchez les commandes, puis appuyez sur le bouton/gâchette ou déplacez le stick souhaité. Une commande déjà affectée à une autre action du même joueur est refusée. Échap ou « Annuler le mapping » annule la capture ; « Rétablir les commandes » restaure le profil du joueur. Les profils sont sauvegardés localement et s’appliquent à la manette attribuée à ce joueur dans le garage. La navigation des menus conserve les commandes standard.

Au tactile, chaque moitié d'écran possède direction, accélérateur, frein et objet. Maintenir frein à l'arrêt pour reculer. Le changement d'application ou la perte de focus met la course en pause. Une manette déconnectée peut être réattribuée depuis la pause.

Le plein écran est demandé automatiquement au clic sur « C’est parti » lorsque le navigateur le permet (une interaction est obligatoire, pas besoin de F11). En cas de refus, le jeu reste jouable dans l’onglet. Échap permet de sortir du plein écran et la pause propose de le réactiver ou de le quitter ; sur mobile, le verrouillage paysage est tenté sans bloquer le jeu en cas de refus. Dans les menus à la manette : haut/bas pour naviguer, gauche/droite pour modifier une liste, A pour valider.

## Développement

**Node.js 22.12+ et npm** sont nécessaires uniquement pour développer/construire le projet.

```sh
npm ci
npm run dev
```

Ouvrir l'adresse affichée par Vite. Pour tester sur téléphone, servir depuis une origine HTTPS ou un contexte local compatible ; la Gamepad API nécessite un contexte sécurisé selon le navigateur.

```sh
npm test               # tests unitaires de simulation, stockage et contrôles
npm run typecheck      # TypeScript strict
npm run build          # build statique dans dist/
npm run preview        # prévisualiser ce build
npx playwright install chromium
npm run test:e2e       # scénarios Chromium desktop et mobile émulé
npm run test:static    # après build : vrai serveur statique sous /biboukart/
npm run benchmark      # serveur dev lancé : mesure du rendu logiciel, non contractuelle
npm run format:check   # cohérence du formatage
```

Ne pas ouvrir `dist/index.html` avec `file://` : servir `dist/` via HTTP(S).

## GitHub Pages

Le workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) valide les tests unitaires et navigateur, construit et teste le site sous un sous-chemin, puis déploie l'artefact `dist/` sur les pushs vers `main` ou `master`. Les pull requests ne déploient pas.

1. Publier les fichiers de ce projet sur le dépôt GitHub.
2. Dans **Settings → Pages → Build and deployment → Source**, choisir **GitHub Actions**.
3. Pousser sur la branche principale ou déclencher le workflow manuellement.
4. Consulter l'URL dans l'environnement `github-pages`. Pour le dépôt actuel : `https://flwagner.github.io/biboukart/` une fois le déploiement réussi.

La base Vite est relative (`./`) : aucune route serveur, aucun service externe et aucun chemin absolu d'asset ne sont nécessaires. Le site fonctionne aussi sur un autre hébergement statique. L'état de la publication distante est visible dans GitHub Actions ; un push réussi ne constitue pas à lui seul la preuve d'un déploiement terminé.

## Architecture

| Fichier                                           | Responsabilité                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/config.ts`                                   | Personnages, karts, pistes, objets et paramètres validés                          |
| `src/race.ts`                                     | Simulation à 60 Hz, collisions, checkpoints, classements, IA, objets              |
| `src/flight.ts`                                   | Impulsion des bosses, gravité, vol et atterrissage                                |
| `src/road.ts` / `src/terrain.ts`                  | Maillages de route et de relief, raccords et talus hors des zones asphaltées      |
| `src/portraits.ts`                                | Portraits SVG locaux de Couscous et Raclette                                      |
| `src/track.ts`                                    | Relief, projection des routes, raccourcis et mouvement déterministe des obstacles |
| `src/scenery.ts`                                  | Décors propres à chaque univers et modèles des obstacles                          |
| `src/minimap.ts` / `src/animation.ts`             | Carte du circuit et articulation des karts/pilotes                                |
| `src/rendering.ts`                                | Monde procédural, karts, caméras, unique renderer et viewports/scissor            |
| `src/effects.ts`                                  | Jets de turbo et étoiles de cadeaux préalloués, effets réduits et nettoyage GPU   |
| `src/itemModels.ts`                               | Modèles réutilisables de missiles et de flaques                                   |
| `src/input.ts`                                    | Clavier, manettes, multitouch et isolation des joueurs                            |
| `src/main.ts`                                     | Écrans, HUD, orchestration de la partie et boucle principale                      |
| `src/audio.ts`                                    | Mixage Web Audio, moteur, activation après interaction et pause                   |
| `src/music.ts` / `src/synth.ts` / `src/sounds.ts` | Composition originale et synthèse des instruments et bruitages                    |
| `src/storage.ts`                                  | Dernières sélections ; tolérance au stockage indisponible                         |
| `src/style.css`                                   | Interface française adaptative et commandes tactiles                              |

Un état de simulation commun est rendu depuis une caméra par humain. La piste et la trajectoire IA dérivent d'une spline fermée, échantillonnée pour les contacts et la progression. Les collisions sont volontairement arcade : pas de drift ou de routes superposées. Les bosses déclenchent un saut à partir de 14 m/s : impulsion, gravité, direction réduite en l'air puis atterrissage amorti. L'ombre reste au sol. Les checkpoints doivent être franchis dans l'ordre ; une téléportation ne donne pas de tour gratuit.

La graine d'attribution des objets est déterministe. Les bots utilisent les mêmes limites physiques, collisions et règles d'objets que les humains. La difficulté change leur vitesse visée (70 %, 89 %, 100 % de la vitesse du kart), l'anticipation, la fréquence d'utilisation des objets et la prise des raccourcis, sans sur-vitesse cachée ou rattrapage artificiel. Le solo reste une course, pas un mode contre-la-montre.

Les panneaux jaunes annoncent les obstacles mobiles : un contact ralentit brièvement et peut être bloqué par un bouclier. Les raccourcis sont des routes secondaires asphaltées, sans piquets ni portiques, et figurent en pointillés clairs sur la carte ; ils sont moins larges et leurs bas-côtés ralentissent fortement. Le jaune au sol est réservé aux bandes turbo. Les checkpoints restent ordonnés, même en passant par une branche. Un kart repositionné revient sur sa route sans gagner de progression.

Les réglages et sélections sont sauvegardés localement, sans données envoyées à un serveur. Les contrôleurs sont réattribués par session car leur indice matériel n'est pas une identité stable. Le jeu continue si le stockage est bloqué.

## Performance et compatibilité

- Cible : navigateurs récents disposant de **WebGL2**, accélération graphique et JavaScript activés.
- Géométrie low-poly regroupée par matériau, végétation instanciée, matériaux partagés, ombres simplifiées, réutilisation des effets.
- Un seul contexte WebGL, simulation à pas fixe avec rattrapage plafonné, interpolation des positions et HUD actualisé à fréquence limitée.
- Qualité adaptative : plafonnement du pixel ratio, résolution ajustée avec hystérésis et réduction initiale à 3–4 vues. Réglages basse/moyenne/haute disponibles.
- Objectifs : 60 fps solo PC et 30 fps en écran partagé/mobile sur matériel adapté, **pas une garantie sur tous les appareils**.
- Safari iOS, téléphones réels, chauffe prolongée, manettes physiques et limites de clavier restent à confirmer sur ces appareils. L'émulation mobile et les manettes synthétiques ne constituent pas une certification matérielle.
- Aucun fonctionnement hors-ligne garanti : les fichiers doivent d'abord être chargés depuis l'hébergement. Pas de service worker/PWA.

## Vérifications de livraison

Les commandes ci-dessus sont reproductibles. Voir [`docs/EVOLUTIONS.md`](docs/EVOLUTIONS.md) pour les validations des trois derniers lots, et [`docs/VALIDATION.md`](docs/VALIDATION.md) pour l'historique et les limites matérielles.

Les interfaces de test `window.__bibou` existent **uniquement en développement**. Elles sont supprimées du build de production, ce que le test statique vérifie.

## Ressources et crédits

Modèles, circuits et décorations : géométrie procédurale originale incluse dans les sources. Sons : synthèse Web Audio originale. Polices : pile système locale. Émojis : rendu du système/navigateur. Aucun asset Nintendo, CDN, modèle ou fichier audio tiers téléchargé à l'exécution.

Dépendances principales : [Three.js](https://threejs.org/) (MIT), [Vite](https://vite.dev/) (MIT), [TypeScript](https://www.typescriptlang.org/) (Apache-2.0), [Vitest](https://vitest.dev/) (MIT), [Playwright](https://playwright.dev/) (Apache-2.0), [Prettier](https://prettier.io/) (MIT). Leurs licences sont conservées dans les packages distribués par npm.
