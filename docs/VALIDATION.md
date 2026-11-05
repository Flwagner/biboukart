# Validation de BibouKart

> Historique de validation de la version `ef7cca3` et des correctifs précédents. Les résultats actuels des trois lots suivants (**79 tests unitaires, 20 scénarios navigateur**) et les nouvelles mesures de rendu sont dans [`EVOLUTIONS.md`](EVOLUTIONS.md).

## Environnement et portée

Validation effectuée le 5 novembre 2026, sous Linux, Node.js 22.23.0 et npm 10.9.8. Navigateurs de test : Chromium automatisé par Playwright ; WebGL logiciel SwiftShader pour les tests reproductibles. Inspection du rendu et de la navigation également via le MCP Playwright.

Les tests ne prouvent pas le comportement d'un téléphone physique, d'une manette USB/Bluetooth réelle ou d'un clavier soumis au ghosting. Aucun accès à ces appareils n'est supposé.

## Résultats automatisés

- `npm test` : **41 tests passent**, dont des simulations réelles de trois tours terminés par six pilotes IA sur chacun des trois circuits.
- `npm run build` : TypeScript strict et génération statique réussis ; environ 150 Ko de JavaScript gzip, sans téléchargement d'assets en cours de jeu.
- `npm run test:e2e` : **9 scénarios passent**.
  - Sélections, conduite avec appui clavier effectif, pause, résultats et revanche.
  - Quatre vues, isolation des contrôles et courses répétées.
  - Remappage de touches et persistance des réglages après rechargement.
  - Prévention d'attribution double d'une manette synthétique.
  - Accélération par manette synthétique, pause/reprise par Start, déconnexion et remplacement par un clavier.
  - Deux joueurs mobiles émulés, pointeurs concurrents synthétiques, rotation et perte de focus.
  - Effets visuels déclenchés par un cadeau réellement collecté et une bande turbo traversée : étoiles, jets, retour HUD, extinction, mode réduit et nettoyage après retour à l'accueil.
  - Musique générée après interaction, source unique malgré des activations concurrentes, volumes indépendants persistants, sourdine, pause/reprise et bruit de missile relié à son utilisation réelle.
  - Synthèse audio hors ligne de 11 bruitages distincts, avec forme d'onde finie, non silencieuse et sans écrêtage.
- Géométries GPU après deux cycles prairie/canyon/archipel : **65, 64, 66, 65, 64, 66** après regroupement des géométries statiques par matériau. Pas de croissance entre chargements identiques dans ce scénario.
- `npm run test:static` : production servie sous **`/biboukart/`**, menus et lancement de course réussis, **zéro erreur HTTP/page**, aucune requête externe et aucune interface de debug exposée.
- `npm audit` : **0 vulnérabilité connue** au moment de la validation.

La stabilité du nombre de géométries n'est pas à elle seule une preuve d'absence de toute fuite mémoire. Les scénarios de résultats automatisés utilisent une arrivée pilotée par l'interface de test ; les simulations unitaires valident séparément des courses complètes sans raccourci d'arrivée.

## Mesure de rendu logiciel, non contractuelle

`npm run benchmark`, serveur de développement lancé, Chromium 156.0.8078.4 / SwiftShader, viewport 1280 × 800, échauffement de 1,5 s puis échantillon de 3 s par disposition :

| Humains / vues | fps moyens | Temps d'image au 95e percentile |
| -------------- | ---------: | ------------------------------: |
| 1              |       19,9 |                        166,6 ms |
| 2              |       12,5 |                        166,7 ms |
| 4              |       10,9 |                        216,6 ms |

Ces mesures sont celles du **GPU logiciel dans cet environnement de développement**, pas celles d'un GPU joueur. Elles sont inférieures à l'objectif de fluidité ; le seuil de 30/60 fps **n'est donc pas certifié**. Le regroupement par matériau et l'instanciation réduisent les appels de rendu, et la résolution adaptative continue de s'ajuster sur une session plus longue. Mesurer sur du matériel réel reste nécessaire avant de revendiquer ces objectifs.

## Contrôles manuels restant dépendants du matériel

- Safari iOS et Chrome Android sur téléphones réels, à un et deux joueurs.
- Multitouch physique à au moins quatre doigts, taille des boutons et éventuels gestes système.
- Une à plusieurs manettes réelles, attribution, reconnect/reprise et mapping des modèles non standard.
- Jeu à quatre prolongé sur PC, chauffe et stabilité à deux sur mobile.
- Mesure de fps avec GPU matériel et appareils de référence identifiés. Les performances du rendu logiciel automatisé ne sont pas représentatives de celles d'un téléphone ou PC joueur.

## Régression CI : synchronisation du rendu et des manettes

Les délais fixes de 100 ms (mesure GPU) et 120 ms (relâchement de Start) pouvaient expirer avant une image en CI. Ils sont remplacés par l'attente d'un rendu effectivement terminé, avec mémoire GPU non nulle, et par l'attente du relâchement effectivement échantillonné par le gestionnaire d'entrées. La simulation reste figée pendant la comparaison des ressources pour comparer des scènes identiques.

Validation du correctif : les 6 scénarios complets passent, puis les deux scénarios concernés passent chacun trois fois avec un délai artificiel de 250 ms entre les images, sans retries :

```sh
E2E_FRAME_DELAY_MS=250 npx playwright test --grep 'four split-screen|gamepad throttle' --repeat-each=3 --output=test-results/slow-frames
```

Les traces et captures sont désormais publiées comme artefacts GitHub Actions en cas d'échec. L'état d'échantillonnage des boutons exposé aux tests reste limité au développement et absent du build de production.

## Régression : sens gauche/droite

Le signe de rotation de la physique était opposé à la convention des commandes : avec l'axe avant `(sin(cap), 0, cos(cap))`, un cap croissant tourne à gauche du pilote. La rotation est corrigée à la source, pour le clavier, les manettes et le tactile. L'IA convertit sa correction de cap dans cette même convention pour conserver sa trajectoire.

Huit tests ajoutés vérifient les signes d'entrée des trois périphériques, le déplacement à gauche/droite dans quatre orientations et la rotation en marche arrière. Les cinq tests de déplacement/rotation échouaient avant le correctif. Le scénario navigateur de conduite vérifie aussi les rotations réelles avec A puis D.

## Musique et bruitages originaux

La musique est une composition synthétisée localement : 8 mesures à 116 BPM, soit **16,552 secondes** par boucle. Le test observe une crête de **0,405** et un niveau RMS de **0,033** dans le tampon avant mixage. Les 11 bruitages testés ont des formes d'onde différentes, des crêtes inférieures à 1 et un niveau RMS non nul. Aucun fichier distant ou timer de séquence musicale n'est nécessaire : une source audio native boucle sur le tampon préparé une seule fois.

Les volumes général, musique et effets sont indépendants et sauvegardés. Les transitions de gain sont lissées, le mélange est protégé par un compresseur et les sons sont coupés en pause ou lors de la perte de focus. La qualité perçue sur les haut-parleurs de téléphones et les casques reste à apprécier sur ces matériels ; les mesures automatiques ne remplacent pas une écoute humaine.

## Publication

Le workflow publie sur GitHub Pages après un push validé sur la branche principale. Consulter GitHub Actions pour connaître l'état effectif du déploiement ; les tests locaux et un push réussi ne certifient pas l'achèvement de cette étape distante.
