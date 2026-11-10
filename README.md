# BibouKart 🏁

Un jeu de karting 3D stylisé original, entièrement dans le navigateur. **Three.js + TypeScript + Vite**, sans backend, sans compte, sans installation pour les joueurs.

## Jouer

- **PC : 1 à 4 humains** sur un même appareil, clavier partagé et/ou manettes.
- **Mobile : 1 à 2 humains**, commandes tactiles séparées, écran paysage.
- 8 personnages et 8 karts aux silhouettes et caractéristiques différentes.
- Direction artistique « jouets de collection » sur les cinq circuits, huit pilotes et huit karts : carrosseries sculptées, peinture satinée, pneus mats, métal et visages expressifs. Prairie conservée comme référence ; Canyon stratifié, Archipel à eau animée et palmiers courbes, Col aux chalets fumants et sommets sculptés, Boulevard aux vitrines, balcons et jardins urbains. Chaque univers possède sa propre ambiance lumineuse.
- 5 circuits de 969 à 1 188 mètres : Prairie des lucioles, Canyon vermeil, Archipel azur, Col des flocons et Boulevard des bibous. Virages gauche/droite, enchaînements en S, lignes droites, relief, raccourci technique et véritable embranchement sur chaque circuit.
- Courses de 3 tours à 6 concurrents ; les bots complètent la grille.
- Mini-carte avec les six concurrents, notification « Dernier tour ! », roues et volant noir animés, phares blanc chaud à l'avant et feux rouges intensifiés au freinage à l'arrière, réactions des pilotes et podium 3D.
- Moulins, arches rocheuses et palmiers ; terrain vallonné, bosses permettant de vrais sauts, obstacles mobiles annoncés et raccourcis étroits éloignés du tracé principal.
- Bots faciles, normaux ou difficiles, au choix avant la course. Le réglage est sauvegardé et conservé pour la revanche.
- Boîtes cadeaux : missile guidé, turbo, bouclier, flaque, mode géant et onde de choc. Bandes de turbo sur la route.
- Géant : taille doublée pendant 7 secondes, résistance aux obstacles de la route et projection des adversaires sur les bas-côtés, suivie d'un retour en piste sans gain de progression. Les autres objets restent efficaces ; les boucliers absorbent les projections et deux géants se repoussent normalement.
- Onde de choc : saut même à l'arrêt, puis impact à l'atterrissage qui assomme les rivaux à moins de 8 mètres pendant 1,5 seconde. En l'air, l'objet arme le prochain atterrissage. Le bouclier absorbe l'attaque et l'immunité temporaire empêche les assommages en chaîne.
- Missile à ogive et ailerons, réacteur lumineux, traînée et explosion ; flaque sombre aux contours irréguliers, reflets colorés et éclaboussures. Anneau d'onde de choc, poussière et étoiles d'assommage.
- Turbos : jets lumineux et léger élargissement de la vue ; cadeaux : gerbe d'étoiles, anneau doré et mise en valeur de l'objet reçu. Les animations de jeu restent actives à toutes les qualités graphiques ; l'ancienne option « Réduire les animations » est supprimée et sa valeur sauvegardée est ignorée.
- Musique originale en boucle (8 mesures, 116 BPM), basse, mélodie et percussions ; sons distincts de cadeaux, pouvoirs, collisions, départ et arrivée. Volumes général/musique/effets indépendants.
- Pas de drift, multijoueur réseau, téléchargement de contenu ou installation nécessaire.

Le garage permet de choisir les pilotes, karts et contrôleurs, puis un circuit. Chaque kart s’arrête dès son arrivée à la fin du troisième tour. Le podium s’affiche dès que tous les joueurs humains sont arrivés, sans limite de temps et sans attendre les bots.

### Des circuits à explorer

Les tracés principaux mesurent environ deux fois la longueur des anciens circuits. Chaque circuit propose **deux routes à une bifurcation**, puis une jonction commune, en plus de son raccourci étroit :

| Circuit              | Longueur principale | Route alternative                     |
| -------------------- | ------------------: | ------------------------------------- |
| Prairie des lucioles |               969 m | Le verger et ses arbres fruitiers     |
| Canyon vermeil       |             1 136 m | La corniche et ses rochers stratifiés |
| Archipel azur        |             1 000 m | La palmeraie                          |
| Col des flocons      |             1 119 m | Le village aux chalets enneigés       |
| Boulevard des bibous |             1 188 m | Les petites rues et leurs maisons     |

La route alternative est presque aussi large que la piste principale : ce n'est pas un raccourci caché. Elle est un peu plus longue et offre deux cadeaux supplémentaires ; rester sur le circuit principal privilégie le temps de parcours. Des panneaux bleu-vert annoncent ce choix, les panneaux violets indiquent le raccourci technique. La mini-carte montre les routes normales en trait plein et le raccourci en pointillés. Les bots varient leur choix selon le pilote et le tour, sans changer de décision au milieu d'une bifurcation. Le mode enfant laisse emprunter toutes ces routes.

### Mode enfant

Dans le garage, cochez **Mode enfant** sur la fiche du joueur concerné (choix mémorisé). Son kart accélère automatiquement, mais l’enfant dirige entièrement le kart : aucune correction de trajectoire ni de contresens tant qu’il ne touche pas le bord. Au contact du bord uniquement, le kart reste sur la route et se réoriente progressivement vers l’avant ; en cas de blocage persistant au bord, il est remis en piste. Les cadeaux s’activent automatiquement dès leur récupération, sans appui sur le bouton objet ; si l’utilisation est temporairement bloquée (étourdissement, projection ou délai entre objets), l’objet est conservé puis activé dès que possible. Le frein est prioritaire et permet de s’arrêter, sans marche arrière ; relâchez-le pour repartir. L’assistance fonctionne au clavier, à la manette et au tactile, sans modifier la conduite des autres joueurs ni supprimer les effets des objets.

### Commandes par défaut

| Action            | Clavier J1 | Clavier J2 | Manette standard |
| ----------------- | ---------- | ---------- | ---------------- |
| Accélérer         | W          | ↑          | RT ou A          |
| Freiner / reculer | S          | ↓          | LT ou B          |
| Tourner           | A / D      | ← / →      | Stick gauche     |
| Objet             | Espace     | Entrée     | X                |
| Pause / reprendre | Échap      | Échap      | Start            |

Touches **physiques** modifiables dans les réglages : sur AZERTY, remapper W/A en Z/Q si souhaité. Profils 3 et 4 : I/K/J/L/O et pavé numérique 8/5/4/6/0. Plusieurs touches simultanées peuvent être bloquées par certains claviers : privilégier les manettes à 3–4 joueurs.

Dans **Réglages → Une manette à votre façon**, chaque joueur peut personnaliser accélération, frein/recul, gauche, droite, objet et pause. Validez une action, relâchez les commandes, puis appuyez sur le bouton/gâchette ou déplacez le stick souhaité. Une commande déjà affectée à une autre action du même joueur est refusée. Maintenir **B / Rond pendant 0,8 seconde**, Échap ou « Annuler le mapping » annule la capture ; un appui court sur B reste assignable et est capturé au relâchement. « Rétablir les commandes » restaure le profil du joueur. Les profils sont sauvegardés localement et s’appliquent à la manette attribuée à ce joueur dans le garage.

Au tactile, chaque moitié d'écran possède direction, accélérateur, frein et objet. Maintenir frein à l'arrêt pour reculer. Le changement d'application ou la perte de focus met la course en pause. Une manette déconnectée peut être réattribuée depuis la pause.

### Menus entièrement à la manette

Toutes les manettes connectées peuvent piloter les menus, indépendamment des profils de conduite :

| Commande standard     | Action dans les menus                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Stick gauche ou croix | Haut/bas : parcourir les commandes ; gauche/droite : modifier une liste ou un volume, sinon parcourir les commandes         |
| A / Croix             | Valider un bouton, cocher/décocher, ou passer au choix suivant dans une liste                                               |
| B / Rond              | Revenir à l’écran précédent, enregistrer et quitter les réglages, reprendre depuis la pause, ou annuler une capture clavier |
| Stick droit vertical  | Faire défiler une longue page ou une fenêtre de pause                                                                       |
| B / Rond maintenu     | Annuler la capture d’une commande de manette                                                                                |

Le focus est surligné et défile automatiquement à l’écran. Une pression maintenue ne valide pas plusieurs écrans. Valider « C’est parti » à la manette attribue celle-ci au premier joueur si elle n’est pas déjà utilisée par un autre ; le garage permet ensuite de changer toutes les attributions. La pause, le changement de contrôleurs (avec retour sans appliquer), le podium, la revanche et le changement de circuit sont accessibles sans clavier ni souris. La navigation des menus conserve ces commandes standard même après un remapping de conduite.

Le plein écran est demandé automatiquement en validant « C’est parti » lorsque le navigateur le permet. **Certains navigateurs exigent un clic ou une touche clavier pour autoriser le plein écran et/ou le son ; une validation issue de la Gamepad API n’est pas toujours une interaction autorisée.** Cela ne bloque ni les menus ni la course : le jeu reste jouable dans l’onglet, éventuellement sans son. Échap permet de sortir du plein écran et la pause propose de le réactiver ou de le quitter ; sur mobile, le verrouillage paysage est tenté sans bloquer le jeu en cas de refus.

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
| `src/routeSigns.ts`                               | Panneaux d'annonce des embranchements et raccourcis                               |
| `src/rendering.ts`                                | Monde procédural, karts, caméras, unique renderer et viewports/scissor            |
| `src/art.ts` / `src/meadow.ts`                    | Matériaux, textures procédurales, budget d'ombres et composition de la Prairie    |
| `src/biomes.ts` / `src/rosterDetails.ts`          | Ambiances et décors des autres circuits, finitions des huit pilotes et karts      |
| `src/effects.ts`                                  | Jets de turbo et étoiles de cadeaux préalloués, particules et nettoyage GPU       |
| `src/itemModels.ts`                               | Modèles réutilisables de missiles et de flaques                                   |
| `src/input.ts`                                    | Clavier, manettes, multitouch et isolation des joueurs                            |
| `src/gamepad.ts` / `src/menuGamepad.ts`           | Profils de manette, capture des commandes, navigation et focus des menus          |
| `src/main.ts`                                     | Écrans, HUD, orchestration de la partie et boucle principale                      |
| `src/audio.ts`                                    | Mixage Web Audio, moteur, activation après interaction et pause                   |
| `src/music.ts` / `src/synth.ts` / `src/sounds.ts` | Composition originale et synthèse des instruments et bruitages                    |
| `src/storage.ts`                                  | Dernières sélections ; tolérance au stockage indisponible                         |
| `src/style.css`                                   | Interface française adaptative et commandes tactiles                              |

Un état de simulation commun est rendu depuis une caméra par humain. La route principale dérive d'une spline fermée ; les branches possèdent leur propre courbe, largeur, longueur et intervalle de progression commun. Contacts, maillages, terrain, décors et mini-carte utilisent la même liste de routes. Les jonctions sont l'union des surfaces asphaltées, y compris pour l'assistance enfant. Les collisions sont volontairement arcade : pas de drift ou de routes superposées. Les bosses déclenchent un saut à partir de 14 m/s : impulsion, gravité, direction réduite en l'air puis atterrissage amorti. L'ombre reste au sol. Les checkpoints doivent être franchis dans l'ordre ; une téléportation ne donne pas de tour gratuit.

La graine d'attribution des objets est déterministe. Les bots utilisent les mêmes limites physiques, collisions et règles d'objets que les humains. La difficulté change leur vitesse visée (70 %, 89 %, 100 % de la vitesse du kart), l'anticipation, la fréquence d'utilisation des objets et la prise des raccourcis, sans sur-vitesse cachée ou rattrapage artificiel. Le solo reste une course, pas un mode contre-la-montre.

Les panneaux jaunes annoncent les obstacles mobiles : un contact ralentit brièvement et peut être bloqué par un bouclier. Les raccourcis sont des routes secondaires asphaltées, sans piquets ni portiques, et figurent en pointillés clairs sur la carte ; ils sont moins larges. Hors route, sur tous les parcours, la vitesse maximale est divisée par deux, sans pénalité cumulative au bord ; retrouver l'asphalte permet de réaccélérer normalement. Le jaune au sol est réservé aux bandes turbo. Les checkpoints restent ordonnés, même en passant par une branche. Un kart repositionné revient sur sa route sans gagner de progression.

Les réglages et sélections sont sauvegardés localement, sans données envoyées à un serveur. Les contrôleurs sont réattribués par session car leur indice matériel n'est pas une identité stable. Le jeu continue si le stockage est bloqué.

## Performance et compatibilité

- Cible : navigateurs récents disposant de **WebGL2**, accélération graphique et JavaScript activés.
- Géométrie regroupée par matériau et comportement d'ombre, végétation instanciée, matériaux partagés et réutilisation des effets. Ombres projetées douces en solo/duo, calculées une fois par image pour toutes les vues ; ombres de contact estompées conservées en qualité basse et à 3–4 joueurs.
- Un seul contexte WebGL, simulation à pas fixe avec rattrapage plafonné, interpolation des positions et HUD actualisé à fréquence limitée.
- Qualité adaptative : pixel ratio plafonné, léger suréchantillonnage en qualité moyenne/haute plutôt qu'un MSAA permanent, résolution ajustée avec hystérésis et réduction initiale à 3–4 vues. Cartes d'ombre de 1 024 px par défaut et 2 048 px en haute qualité, désactivées en basse qualité et à 3–4 vues. Sur appareil tactile ou GPU logiciel détecté, les ombres projetées nécessitent le choix explicite de la qualité haute.
- Objectifs : 60 fps solo PC et 30 fps en écran partagé/mobile sur matériel adapté, **pas une garantie sur tous les appareils**.
- Safari iOS, téléphones réels, chauffe prolongée, manettes physiques et limites de clavier restent à confirmer sur ces appareils. L'émulation mobile et les manettes synthétiques ne constituent pas une certification matérielle.
- Aucun fonctionnement hors-ligne garanti : les fichiers doivent d'abord être chargés depuis l'hébergement. Pas de service worker/PWA.

## Vérifications de livraison

Les commandes ci-dessus sont reproductibles. Voir [`docs/EVOLUTIONS.md`](docs/EVOLUTIONS.md) pour les dernières évolutions et leurs validations, et [`docs/VALIDATION.md`](docs/VALIDATION.md) pour l'historique et les limites matérielles.

Les interfaces de test `window.__bibou` existent **uniquement en développement**. Elles sont supprimées du build de production, ce que le test statique vérifie.

## Ressources et crédits

Modèles, circuits et décorations : géométrie procédurale originale incluse dans les sources. Sons : synthèse Web Audio originale. Polices : pile système locale. Émojis : rendu du système/navigateur. Aucun asset Nintendo, CDN, modèle ou fichier audio tiers téléchargé à l'exécution.

Dépendances principales : [Three.js](https://threejs.org/) (MIT), [Vite](https://vite.dev/) (MIT), [TypeScript](https://www.typescriptlang.org/) (Apache-2.0), [Vitest](https://vitest.dev/) (MIT), [Playwright](https://playwright.dev/) (Apache-2.0), [Prettier](https://prettier.io/) (MIT). Leurs licences sont conservées dans les packages distribués par npm.
