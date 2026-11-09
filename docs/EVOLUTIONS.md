# Évolutions

## Hors route : vitesse divisée par deux

- Vitesse maximale limitée à 50 % hors asphalte, en marche avant comme en marche arrière, sur la piste principale, les alternatives et les raccourcis. Suppression du multiplicateur de 0,93 appliqué à chaque contact avec la limite extérieure, qui finissait par presque immobiliser le kart malgré l'accélération.
- Le kart peut accélérer jusqu'à cette limite hors route, puis retrouver sa vitesse normale en revenant sur l'asphalte. Turbos, effets d'objets, contrainte de position et mode enfant conservés.
- Validation : **286 tests unitaires réussis**, dont 20 contrôles dédiés aux deux côtés de toutes les routes des cinq circuits, au départ arrêté, aux objets, au retour sur route et à la marche arrière. Build TypeScript/Vite réussi.

## Circuits longs et choix de parcours

- Cinq tracés remaniés de 969 à 1 188 mètres, environ deux fois plus longs, avec des virages dans les deux sens, des S et des portions rapides. Un embranchement large sur chaque circuit, en plus du raccourci technique conservé : verger, corniche, palmeraie, village et petites rues. Deux cadeaux sur chaque alternative compensent son détour ; la route principale reste plus rapide.
- Routes secondaires définies par leur courbe, largeur, longueur et intervalle de progression. Maillage asphalté, raccords, terrain, dégagement des décors, classement, checkpoints et remise en piste prennent en compte toutes les routes. Panneaux d'annonce avant les choix, mini-carte avec toutes les branches, aperçus de sélection ajustés aux dimensions réelles.
- Les alternatives utilisent des arcs indépendants avec raccords tangents, plutôt qu'un simple décalage latéral des S qui pourrait replier le ruban de route. Leur rayon minimal et l'absence d'auto-intersection sont testés. À kart identique, sans cadeaux, obstacles ni turbos, les sections comparées prennent respectivement **9,60 / 10,43 s**, **11,43 / 13,10 s**, **10,10 / 10,27 s**, **11,18 / 12,12 s** et **12,13 / 13,78 s** pour route principale / alternative : détour limité, compensé par les cadeaux supplémentaires.
- Les bots alternent les parcours selon leur identité et leur tour ; tous les points utilisés pour anticiper un virage suivent le même choix. L'assistance enfant utilise l'union des corridors praticables, avec la marge du kart, en une seule projection : elle ne bloque plus la sortie de la route principale vers une branche.
- Terrain, côte de l'Archipel, décors lointains, couverture des ombres et étendue de la neige adaptés au nouvel espace. Repères spécifiques le long de chaque alternative. Routes superposées et nouvelles mécaniques de pilotage hors périmètre.
- Trois cas limites révélés par les nouvelles courses sont corrigés : la projection géométrique d'un kart arrêté ne modifie plus sa progression ; la contrainte horizontale du bord ne réinitialise plus la hauteur d'un kart en plein saut ; un kart déjà arrivé retrouve bien sa limite de vitesse normale à l'expiration du turbo.
- Tests dédiés : `tests/branches.test.ts`, `tests/routeSigns.test.ts`, `e2e/branches.spec.ts`. Les contrôles historiques du terrain et du dégagement des décors couvrent désormais aussi les alternatives. Les courses complètes des cinq circuits restent vérifiées aux trois difficultés, avec et sans préférence explicite pour les raccourcis.
- Captures reproductibles : `test-results/alternative-{0,1,2,3,4}.png`, `test-results/circuit-overview-{0,1,2,3,4}.png`, `test-results/alternative-mobile-duo.png`, `test-results/alternative-four-players.png`.

Validation : **266 tests unitaires et 12 scénarios navigateur ciblés réussis**, dont les cinq alternatives parcourues sur trois tours, le mode enfant sur PC/tactile, les mini-cartes à deux/quatre vues, une course complète à six pilotes avec podium, commandes clavier, pause et revanche. Sur six reconstructions en écran partagé, les nombres de géométries GPU sont **176, 184, 194, 176, 184, 194** : pas de croissance dans ce scénario. Les simulations longues et le test de six reconstructions disposent d'un délai adapté aux pistes agrandies et au rendu logiciel.

Build TypeScript/Vite et test statique de production sous `/biboukart/` réussis. Formatage des fichiers modifiés validé ; le contrôle global conserve l'écart préexistant dans `e2e/fullscreen.spec.ts`, non modifié.

Limites : contrôles navigateur en rendu logiciel et tactile émulé ; aucune certification de fluidité sur téléphone ou GPU physique. Les branches ne sont pas des routes superposées.

## Généralisation graphique — tous les circuits, pilotes et karts

- La Prairie, Roxy et Comète restent les références approuvées. Les quatre autres circuits ont des profils de lumière dédiés ; le podium retrouve systématiquement son éclairage de présentation, même après un circuit enneigé ou urbain.
- Canyon : arches et piliers stratifiés, cactus arrondis, jardins désertiques, falaises à plusieurs couches et légère poussière animée. Archipel : mer texturée animée, liserés de sable et d'écume autour de l'île existante, troncs courbes, palmes effilées, noix de coco, cabanes détaillées et jardins tropicaux avec parasols.
- Col : sapins aux couronnes profilées, roches et bancs enneigés, chalets à charpente apparente et fenêtres lumineuses, fumée des cheminées, sommets irréguliers et calottes découpées dans la même silhouette. Boulevard : vitrines, corniches, balcons, auvents rayés, fenêtres lumineuses, façades d'arrière-plan, bancs, plantations et signalétique.
- Sept autres pilotes : pattes posées au volant, foulards, museaux/joues et détails spécifiques à chaque animal. Panda avec masque et pupilles, grenouille sans les anciens yeux doublons, lapin noir et chat blanc conservés. Sept autres karts : carrosseries et finitions propres à chaque silhouette, pontons/aéro, évents, garde-boue, suspensions, chrome et détails de réacteurs. Aucun changement aux indices sauvegardés, caractéristiques, routes, collisions ou IA.
- Décor statique regroupé par matériau ; seuls l'eau, la poussière et la fumée restent dans un groupe animé séparé. Matériaux diffus pour les grands décors, matériaux satinés/métalliques pour les véhicules, pas de nouvelles lumières ponctuelles par fenêtre. Nettoyage des textures et géométries entre circuits, animation de l'ambiance figée en pause, ombres et résolution toujours adaptées au nombre de vues et à la qualité.
- Contrôles : géométries des 64 combinaisons pilote/kart couvertes par les tests existants ; nouveaux contrôles des rayons d'encombrement sur les deux routes, profils lumineux, eau et fumée, palmes et montagnes, sculpts propres à chaque modèle. Le test historique de dégagement des bâtiments examine toujours tous ses points de route, avec des positions précalculées pour éviter des assertions répétées coûteuses.
- Captures : `test-results/circuit-art-{1,2,3,4}-{solo,four}.png`, `test-results/roster-art-{0-1-2,3-4-5,6-7-0}.png` et `test-results/circuit-art-city-mobile.png`. Elles sont produites avec le vrai moteur, pas des images de concept.
- Validation : **231 tests unitaires et 21 scénarios navigateur ciblés réussis**, comprenant chaque nouveau circuit en solo haute qualité et à quatre vues basse qualité, les huit couples de présentation, deux joueurs tactiles en ville, les contrôles clavier/manette, les sauvegardes, le podium, le 360° et les flammes turbo. Build TypeScript/Vite validé. Deux cycles identiques Canyon/Archipel/Col/Boulevard rendent exactement les mêmes ressources : **134/136/119/147 géométries** et **4/5/4/4 textures**, sans croissance dans ce scénario.

Limites : modèles et textures restent procéduraux, sans nouveaux assets externes ni dépendance. Les tests logiciels/émulation mobile ne constituent pas une certification de fluidité sur GPU ou téléphone physique.

## Refonte graphique — premier lot « jouets de collection »

### Suppression de l'option de réduction des animations

- Option retirée des réglages et des préférences du jeu. L'ancienne valeur `reduced: true` est ignorée au chargement, sans réinitialiser les volumes, contrôles ou choix de qualité ; elle disparaît lors de la prochaine sauvegarde des réglages.
- Animations du kart, 360° d'impact, flammes turbo, particules, décors, neige et podium actifs quelle que soit la qualité graphique. La pause continue de figer les effets de course. Les préférences CSS du système pour les transitions de menus restent indépendantes.
- Tests de migration de sauvegarde et scénario navigateur avec une ancienne préférence activée : absence de la case, conservation des autres réglages, 360° et flammes visibles même en qualité basse. Les scénarios de menus et d'effets ne proposent plus l'ancienne option.
- Validation : **215 tests unitaires**, **5 scénarios navigateur ciblés** (ancienne sauvegarde, réglages persistants, turbo, podium et réglages à la manette), build TypeScript/Vite réussis.

Les mentions d'animations réduites ci-dessous décrivent l'historique antérieur à cette suppression.

### Correctifs de retour visuel

- Déclenchement du 360° sécurisé par un compteur des impacts réellement acceptés dans la simulation : missile, flaque et obstacle ne dépendent plus uniquement du relais d'événements interface/audio. Le kart tourne, pas sa direction physique ni sa caméra ; aucun redéclenchement sur un impact bloqué par bouclier ou immunité.
- Flammes turbo : enveloppe orange en transparence normale et cœur lumineux dessiné au-dessus, tous deux exclus du tone mapping ACES pour rester visibles sur une route éclairée. Extinction à la fin du turbo et variante discrète du mode animations réduites conservées.
- Validation : **214 tests unitaires** et deux scénarios navigateur ciblés réussis ; contrôle du vrai transform du kart jusqu'à 360°, même sans abonné aux événements, et capture `test-results/restored-turbo-flames.png`.

### Contenu du premier lot

- Éclairage soleil chaud/ciel froid, tone mapping ACES, léger suréchantillonnage adaptatif plutôt qu'un MSAA permanent, ciel dégradé local et ombres douces. Un seul calcul des ombres par image, partagé entre les vues ; cartes 1 024 px par défaut, 2 048 px en qualité haute, désactivées en basse qualité et à trois/quatre joueurs. Sur appareil tactile ou GPU logiciel détecté, les ombres projetées demandent le choix explicite de la qualité haute. Les ombres de contact estompées restent disponibles partout.
- Matériaux standard sur les véhicules avec peinture satinée, caoutchouc mat et métal ; modèles arrondis, jantes, échappements et châssis. Terrain et végétation conservent des matériaux diffus plus légers, et les formes arrondies sont réservées aux véhicules. Comète reçoit une carrosserie dédiée, Roxy un museau, des joues crème, des intérieurs d'oreille et une queue bicolore. Animations, feux stop et identités sauvegardées préservés.
- Prairie pilote : arbres arrondis aux couleurs variées, collines plus douces, fleurs et buissons groupés hors des deux routes, nuages. Grain d'asphalte et variations subtiles du terrain, sans modifier le relief physique. Portique de départ avec enseigne originale générée localement.
- Caméra reculée et visée rapprochée pour mieux cadrer le kart. Aucun changement aux règles de course, collisions, IA ou contrôles.
- Textures générées localement, sans téléchargement, modèle tiers ni nouvelle dépendance. Nettoyage des textures propres au monde entre circuits ; texture d'ombre de contact partagée.

Les tests `tests/art.test.ts` couvrent les finitions, textures déterministes, budgets d'ombre et de résolution, dégagement des routes et conservation des ombres après regroupement des géométries. `e2e/art.spec.ts` contrôle les qualités haute/basse, quatre vues, une seule passe d'ombres en duo et la stabilité du nombre de textures GPU ; captures locales dans `test-results/art-prairie-{high,low,four}.png`.

Validation : **210 tests unitaires et 13 scénarios navigateur ciblés réussis**, comprenant commandes clavier/manette/tactile, quatre vues, effets, podium et feux stop. Après correction de l'invalidation des shaders au changement de mode d'ombres, les cinq scénarios art/feux ont été rejoués avec succès. Textures GPU sur six reconstructions : **4, 4, 4, 4, 4, 4**. Build et test statique sous `/biboukart/` validés. Formatage des fichiers modifiés validé ; le contrôle global signale un écart préexistant dans `e2e/fullscreen.spec.ts`, laissé inchangé.

Mesure indicative après optimisation : Chromium 156, SwiftShader, 1 280 × 800, commande `npm run benchmark` : **1,8 / 2,6 / 0,7 fps** pour 1 / 2 / 4 joueurs. Une copie du HEAD initial, mesurée dans le même environnement, donne **4,8 / 2,1 / 1,9 fps**. L'échantillon de trois secondes et le très faible nombre d'images rendent ces chiffres instables ; ils montrent surtout que le rendu logiciel reste insuffisant, et ne permettent pas d'annoncer 30/60 fps sur GPU matériel. Les ombres projetées restent accessibles explicitement en qualité haute, mais sont évitées par défaut sur SwiftShader/llvmpipe/lavapipe.

Périmètre historique : ce premier lot concernait la Prairie ; la généralisation aux autres univers et au garage est décrite plus haut. Les modèles restent procéduraux, sans assets Blender/GLB. Les objectifs de fluidité doivent toujours être vérifiés sur GPU et téléphones réels.

## Nouveaux cadeaux — Géant et onde de choc

- Six objets dans les cadeaux pour les humains comme pour les bots. Les libellés, icônes et le guide du pilote présentent aussi le géant et l'onde de choc ; le piège est désormais nommé « Flaque ».
- Géant pendant 7 secondes : taille doublée progressivement, collisions élargies, caméra et ombre adaptées, résistance aux obstacles mobiles. Les rivaux percutés sont projetés latéralement avec un saut, puis remis sur la piste après 1,4 seconde sans gain de progression. Deux géants se repoussent normalement. Le bouclier bloque une projection ; missiles, flaques et onde de choc restent efficaces contre un géant.
- Onde de choc : saut à l'arrêt ou armement du prochain atterrissage si le kart vole déjà. L'impact assomme pendant 1,5 seconde les adversaires dans un rayon de 8 mètres. Le bouclier et l'immunité temporaire empêchent les attaques en chaîne.
- Missiles avec corps, ogive, ailerons, tuyère, flamme et traînée ; flaques irrégulières sombres, reflets colorés et inclinaison suivant la route, même lorsqu'elles sont déposées en sautant. Modèles réutilisés dans les emplacements de projectiles et ressources libérées à la fin de la course.
- Anneau d'impact, poussière, étoiles d'assommage, explosions et éclaboussures préalloués. Les animations réduites conservent l'information sans poussière, traînée ou particules animées. Nouveaux sons synthétisés et indicateurs d'effet dans le HUD.

Validation ciblée : **155 tests unitaires**, dont les courses complètes sur les cinq circuits aux trois difficultés ; **3 scénarios navigateur** pour les nouveaux sons, les modèles visibles en piste et les pouvoirs en écran partagé ; build et test statique sous `/biboukart/` réussis. La matrice de courses complètes distingue désormais les retours volontaires après projection des repositionnements indésirables dus à un blocage. Captures locales : `items-models.png`, `items-split.png`, `items-shockwave.png` dans `test-results/`.

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
