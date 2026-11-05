# Évolutions : trois lots autonomes

## Lot 1 — Interface et animations

- Mini-carte par joueur, six concurrents numérotés, pilote courant en surbrillance.
- Notification et son de dernier tour propres au joueur, une seule fois au passage au troisième tour.
- Roues tournantes avec repères visibles, braquage des roues avant et volant animé.
- Réactions visuelles de récupération de cadeau, choc et victoire, sans modifier les collisions.
- Podium 3D avec les trois premiers dans leur véritable ordre, célébration animée, classement complet et revanche conservés.
- Animations réduites : pas de rotation continue des roues, rebond ou célébration oscillante ; direction du volant et mini-carte restent lisibles.

Validation : 46 tests unitaires, 10 scénarios Playwright, build TypeScript/Vite et test de production sous `/biboukart/` réussis. Captures de contrôle : `test-results/podium.png`, `test-results/four-players.png`, `test-results/mobile-two-players.png` (artefacts locaux, non versionnés).

Le podium utilise le même contexte WebGL, dans un viewport intégré aux résultats. Aucun asset externe supplémentaire.

## Lot 2 — Circuits vivants, relief et raccourcis

- Prairie : moulins animés, clôtures et fleurs ; barrière mobile annoncée par des panneaux jaunes.
- Canyon : arches rocheuses et cactus ; rocher mobile roulant.
- Archipel : palmiers, cabanes sur pilotis ; crabe traversant la piste.
- Relief continu et léger dévers. Position, inclinaison, caméras, cadeaux, turbos et projectiles suivent la hauteur de la route. Les karts restent contraints au sol, sans saut.
- Un raccourci étroit par circuit, tracé en jaune sur la mini-carte, signalé par des portiques et récompensé par une bande turbo. Les bas-côtés pénalisent une trajectoire imprécise.
- Projection continue des deux routes vers la progression de course. Checkpoints ordonnés, contrôle des déplacements impossibles et repositionnement sur la branche courante sans gain de progression.
- Bots suivant la courbure réelle des routes (pure pursuit), capables de prendre les raccourcis et de contourner les obstacles sans téléportation.

Validation : **57 tests unitaires et 13 scénarios Playwright**, build et test statique sous `/biboukart/`. Six pilotes terminent les trois circuits avec les nouveaux obstacles ; des courses isolées valident trois passages complets de raccourci par circuit, sans arrivée forcée. En circulation, un pilote peut manquer une entrée occupée : les tests distinguent ce cas d'un raccourci invalide. Trois parcours navigateur supplémentaires valident les scènes, hauteurs, obstacles, raccourcis et courses complètes.
