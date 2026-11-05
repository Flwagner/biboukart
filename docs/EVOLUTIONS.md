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
