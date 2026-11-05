# Évolutions : trois lots autonomes

## Retours suivants — Lisibilité, relief, sauts et personnages

- Piquets et portiques des raccourcis supprimés. Asphalte et bordures neutres, comme la route principale ; le jaune au sol indique uniquement les turbos.
- Raccourcis déportés vers l'intérieur, séparés de la route principale par du terrain, plutôt que simples voies adjacentes. Le raccord reste tangent et leur longueur reste inférieure à celle du détour principal.
- Relief accentué et terrain 3D sous les pistes. Deux bosses par circuit, signalées par des chevrons blancs, avec impulsion à vitesse suffisante, gravité, vol et réception. L'ombre reste sur la route et le kart se comprime brièvement à l'atterrissage ; la variante animations réduites supprime cette compression, pas la physique du saut.
- IA adaptée aux virages des nouvelles branches et aux sauts. Une entrée manquée n'incite plus un bot à traverser le terrain pour rejoindre le raccourci.
- **Couscous**, lapin noir, remplace Pompon à l'indice 1. **Raclette**, chat blanc avec oreilles et moustaches, remplace le robot à l'indice 3. Les indices sauvegardés sont conservés ; portraits et modèles 3D reflètent les nouvelles couleurs.
- Libellés simplifiés en « Couscous · Lapin » et « Raclette · Chat ». Le volant noir est centré devant le pilote ; la queue blanche de Raclette est conservée. Les roues avant et le volant conservent leur braquage animé.
- Deux phares blanc chaud/jaune à l'avant et deux feux rouges à l'arrière de chaque kart. Matériaux lumineux sans ajouter de sources d'éclairage coûteuses par concurrent/vue.
- Les feux arrière passent du rouge sombre au rouge vif quand le pilote freine, puis reviennent à leur intensité normale au relâchement. Matériaux indépendants par kart pour éviter qu'un joueur n'allume les feux des autres ; retour conservé en mode animations réduites.
- Correction du mur invisible aux jonctions : la route principale reste prioritaire tant que le kart y roule. Les raccords utilisent l'union des deux surfaces carrossables, sans rabattre un kart sur les limites étroites du raccourci voisin. Les tests couvrent les deux côtés de la route, les entrées et sorties, et les trois circuits.
- Correction des coupures visuelles et faux rétrécissements : altitude des raccords alignée, terrain creusé sous les deux routes, talus découpés hors de toute surface asphaltée (y compris les boucles d'un même virage), interruption des bordures aux jonctions. Les obstacles mobiles sont conservés. Les tests examinent aussi les triangles réellement affichés du terrain et la largeur de chaque segment de route.

Les sections ci-dessous décrivent l'historique des trois lots, avant ces ajustements demandés par l'utilisateur.

Validation des ajustements : **103 tests unitaires**, dont contrôle des triangles de terrain sous les deux routes et de la largeur constante de chaque segment ; **28 scénarios navigateur**, incluant sauts, nouveaux personnages, jonctions sans mur invisible et feux stop indépendants. Build et test statique sous `/biboukart/` sans erreur HTTP/JavaScript ni requête externe. Les captures `junction-0.png` à `junction-2.png` montrent les trois raccords dégagés ; le test graphique garde les obstacles mobiles.

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
- Un raccourci étroit par circuit, récompensé par une bande turbo. Après retour utilisateur, son revêtement est identique à la route principale, les piquets et portiques sont supprimés et son tracé sur la mini-carte est neutre. Le jaune au sol est réservé aux turbos. Les bas-côtés pénalisent une trajectoire imprécise.
- Projection continue des deux routes vers la progression de course. Checkpoints ordonnés, contrôle des déplacements impossibles et repositionnement sur la branche courante sans gain de progression.
- Bots suivant la courbure réelle des routes (pure pursuit), capables de prendre les raccourcis et de contourner les obstacles sans téléportation.

Validation : **57 tests unitaires et 13 scénarios Playwright**, build et test statique sous `/biboukart/`. Six pilotes terminent les trois circuits avec les nouveaux obstacles ; des courses isolées valident trois passages complets de raccourci par circuit, sans arrivée forcée. En circulation, un pilote peut manquer une entrée occupée : les tests distinguent ce cas d'un raccourci invalide. Trois parcours navigateur supplémentaires valident les scènes, hauteurs, obstacles, raccourcis et courses complètes.

## Lot 3 — Difficulté et validation finale

Choix **Facile / Normal / Difficile** à la sélection du circuit, sauvegardé immédiatement et conservé pour les revanches. Les profils modifient uniquement les décisions de conduite : vitesse visée, précision de trajectoire, anticipation des obstacles, utilisation des objets et préférence pour les raccourcis. La difficulté ne modifie pas les paramètres physiques du kart humain ou des bots.

La matrice de simulation couvre **3 circuits × 3 difficultés × 2 stratégies de route**, avec six pilotes jusqu'à leur arrivée réelle : 24 checkpoints validés, vitesses dans les limites du kart et aucun appel au repositionnement dans ces scénarios. Des essais supplémentaires vérifient le rejet d'une téléportation entre l'entrée et la sortie du raccourci, la marche arrière et le classement. Les tests navigateur couvrent les neuf couples circuit/difficulté, les raccourcis et la persistance du réglage.

Validation finale :

- **79 tests unitaires réussis**, dont la matrice de 18 courses complètes.
- **20 scénarios Playwright réussis**, incluant quatre vues PC et deux joueurs mobiles émulés.
- **6 exécutions supplémentaires réussies** avec 250 ms de délai artificiel par image : contrôles des manettes, ressources GPU et mini-cartes/podium, chacun répété deux fois, sans retries.
- Build TypeScript/Vite et formatage validés ; test statique sous `/biboukart/` avec sélection de difficulté et mini-carte de six concurrents, zéro erreur HTTP/JavaScript, aucune requête externe, aucune interface de debug.
- `npm audit` : zéro vulnérabilité connue.
- Géométries GPU après deux cycles identiques : **79, 69, 87, 79, 69, 87**, sans croissance dans ce scénario.
- Course de référence, même kart et sans cadeaux : **61,52 s / 47,42 s / 41,75 s** pour Facile / Normal / Difficile. Ces résultats déterministes vérifient la différence de conduite, pas l'équilibrage ressenti par des humains.

### Nouvelle mesure SwiftShader

Chromium 156.0.8078.4, Linux, GPU logiciel, viewport 1280 × 800 ; échauffement de 1,5 s puis mesure de 3 s par disposition, même commande `npm run benchmark` :

| Vues | fps moyens | Temps d'image au 95e percentile |
| ---- | ---------: | ------------------------------: |
| 1    |       28,4 |                         99,9 ms |
| 2    |       14,7 |                          100 ms |
| 4    |        7,0 |                        266,7 ms |

Le rendu logiciel à quatre vues reste nettement sous l'objectif de fluidité. Ces chiffres ne représentent pas un GPU matériel, dépendent de l'environnement et n'attestent **pas** 30/60 fps. Ils sont fournis explicitement plutôt que présentés comme une certification de performance.

### Limites restant à tester sur matériel réel

- Safari iOS et téléphones Android physiques, chauffe prolongée et confort à deux sur petit écran.
- Multitouch réel, manettes USB/Bluetooth et ghosting des claviers partagés.
- Fluidité sur GPU matériel : les mesures SwiftShader ne certifient pas 30 ou 60 fps.
- Ressenti de la difficulté, lisibilité du relief et équilibre risque/gain des raccourcis lors de courses humaines.

Les interfaces de debug et arrivées pilotées servent aux parcours de menus/podium ; les courses de la matrice ne forcent aucune arrivée, aucun tour ou checkpoint. Le build de production est aussi servi sous `/biboukart/`, sans accès aux interfaces de test ni dépendance à un backend.
