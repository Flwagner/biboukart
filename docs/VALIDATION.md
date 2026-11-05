# Validation de BibouKart

## Environnement et portée

Validation effectuée le 5 novembre 2026, sous Linux, Node.js 22.23.0 et npm 10.9.8. Navigateurs de test : Chromium automatisé par Playwright ; WebGL logiciel SwiftShader pour les tests reproductibles. Inspection du rendu et de la navigation également via le MCP Playwright.

Les tests ne prouvent pas le comportement d'un téléphone physique, d'une manette USB/Bluetooth réelle ou d'un clavier soumis au ghosting. Aucun accès à ces appareils n'est supposé.

## Résultats automatisés

- `npm test` : **23 tests passent**, dont des simulations réelles de trois tours terminés par six pilotes IA sur chacun des trois circuits.
- `npm run build` : TypeScript strict et génération statique réussis ; environ 141 Ko de JavaScript gzip, sans téléchargement d'assets en cours de jeu.
- `npm run test:e2e` : **6 scénarios passent**.
  - Sélections, conduite avec appui clavier effectif, pause, résultats et revanche.
  - Quatre vues, isolation des contrôles et courses répétées.
  - Remappage de touches et persistance des réglages après rechargement.
  - Prévention d'attribution double d'une manette synthétique.
  - Accélération par manette synthétique, pause/reprise par Start, déconnexion et remplacement par un clavier.
  - Deux joueurs mobiles émulés, pointeurs concurrents synthétiques, rotation et perte de focus.
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

## Publication

Build et workflow prêts ; publication GitHub Pages non effectuée depuis cette session. Activer Pages avec GitHub Actions et pousser le projet selon le README. Aucun résultat de déploiement distant n'est revendiqué.
