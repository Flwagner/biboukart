import './style.css';
import { kartPortrait } from './portraits';
import { trackPreviewPath } from './track';
import {
  characters,
  karts,
  trackDefinitions,
  itemIcons,
  itemNames,
  loadSettings,
  saveSettings,
  type PlayerConfig,
} from './config';
import { Race } from './race';
import { Renderer, viewports } from './rendering';
import { Inputs } from './input';
import { Audio } from './audio';
import { loadSelection, saveSelection } from './storage';
import { mapProjection, minimapMarkup } from './minimap';
import { difficulties, type Difficulty } from './config';
import { freshPadBindings, padActions, padControlLabel } from './gamepad';

const app = document.querySelector<HTMLElement>('#app')!,
  hud = document.querySelector<HTMLElement>('#hud')!;
const settings = loadSettings(),
  inputs = new Inputs(settings),
  audio = new Audio();
audio.volume = settings.volume;
audio.musicVolume = settings.musicVolume;
audio.effectsVolume = settings.effectsVolume;
addEventListener('pointerdown', () => void audio.unlock(), { once: true });
addEventListener('keydown', () => void audio.unlock(), { once: true });
addEventListener('click', (event) => {
  if ((event.target as HTMLElement).closest('button')) audio.play('click');
});
let renderer: Renderer;
try {
  renderer = new Renderer(document.querySelector<HTMLCanvasElement>('#game')!);
} catch (error) {
  app.innerHTML =
    '<section class="panel error"><h1>Un petit souci de moteur…</h1><p>BibouKart nécessite WebGL2. Activez l’accélération graphique ou essayez un navigateur récent.</p></section>';
  throw error;
}
renderer.setQuality(settings.quality, settings.reduced);
const mobile = () => matchMedia('(pointer: coarse)').matches;
let screen = 'home',
  playerCount = 1,
  selectedTrack = 0,
  players: PlayerConfig[] = Array.from({ length: 4 }, (_, i) => ({
    character: i,
    kart: i,
    device: mobile() ? 'touch' : 'keyboard',
  }));
const selection = loadSelection();
if (selection) {
  playerCount = Math.min(selection.count, mobile() ? 2 : 4);
  selectedTrack = selection.track;
  players = selection.players;
}
let race: Race | null = null,
  paused = false,
  last = performance.now(),
  accumulator = 0,
  hudTime = 0,
  startTime = performance.now();
let gamepadMenuLatch = false,
  gamepadMenuLast = 0;
let pendingUse: boolean[] = [];
let lastLapUntil: number[] = [];
let projectMap: ReturnType<typeof mapProjection> | null = null;
const $ = (selector: string) => app.querySelector<HTMLElement>(selector)!;
const button = (label: string, id: string, cls = '') =>
  `<button id="${id}" class="${cls}">${label}</button>`;
const shell = (body: string, step = '') =>
  `<div class="menu-shell"><header class="topbar"><a class="brand" href="#" id="brand">bibou<span>kart</span><i>✦</i></a><span class="top-tag">${step || 'PETITS KARTS. GRANDES ÉMOTIONS.'}</span><button id="sound" class="icon-button" aria-label="Activer ou couper le son">${settings.volume ? '♫' : '♪'}</button></header>${body}<footer><span>FAIT POUR JOUER ENSEMBLE</span><span class="online-dot">100 % navigateur · 100 % local</span></footer></div>`;
function common() {
  inputs.onRemap = null;
  inputs.cancelPadRemap();
  document.body.classList.remove('racing', 'showing-podium');
  $('#brand')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (race && !race.finished) return;
    home();
  });
  $('#sound')?.addEventListener('click', () => {
    void audio.unlock();
    settings.volume = settings.volume ? 0 : 0.3;
    audio.volume = settings.volume;
    saveSettings(settings);
    $('#sound').textContent = settings.volume ? '♫' : '♪';
  });
}
function home() {
  audio.setPaused(document.hidden);
  screen = 'home';
  race = null;
  inputs.players = [];
  inputs.clear();
  inputs.onRemap = null;
  paused = false;
  hud.innerHTML = '';
  renderer.menu(selectedTrack);
  app.innerHTML = shell(
    `<section class="hero"><div class="eyebrow"><span></span> LE BONHEUR À PLUSIEURS</div><h1>Petits karts.<br>Grandes <em>aventures.</em></h1><p>Une bande de pilotes, des cadeaux surprises et<br class="desktop"> une seule règle : s’amuser jusqu’à la ligne d’arrivée.</p><div class="hero-actions">${button('C’est parti <span>↗</span>', 'play', 'primary large')}${button('Comment jouer', 'help', 'secondary large')}</div><div class="hero-meta"><span>♟ 1–4 pilotes sur PC</span><span>◉ 1–2 sur mobile</span><span>✦ Sans installation</span></div></section><div class="hero-sticker"><span>🏁</span><strong>On fait<br>la course ?</strong><small>${trackDefinitions.length} circuits à découvrir</small></div><div class="bottom-bar"><div><span class="small-label">VOTRE PROCHAINE ESCALE</span><strong>${trackDefinitions[selectedTrack].icon} ${trackDefinitions[selectedTrack].name}</strong></div>${button('Réglages ⚙', 'settings', 'text-button')}</div>`,
  );
  common();
  $('#play').onclick = () => {
    void enterFullscreen().catch(() => {});
    void audio.unlock();
    setup();
  };
  $('#help').onclick = () => help();
  $('#settings').onclick = () => options();
}
function setup() {
  screen = 'setup';
  const connected = navigator.getGamepads?.() ?? [];
  for (const p of players) {
    if (p.device.startsWith('pad:') && !connected[Number(p.device.split(':')[1])]) {
      p.device = mobile() ? 'touch' : 'keyboard';
    }
  }
  app.innerHTML = shell(
    `<section class="setup panel"><div class="section-heading"><div><span class="eyebrow">01 / LA BANDE</span><h1>Qui prend le volant ?</h1><p>Chacun son style. Chacun son kart.</p></div><div class="count-picker" aria-label="Nombre de joueurs">${Array.from({ length: mobile() ? 2 : 4 }, (_, i) => `<button data-count="${i + 1}" class="${playerCount === i + 1 ? 'selected' : ''}">${i + 1}<small>${i ? 'pilotes' : 'pilote'}</small></button>`).join('')}</div></div><div class="player-grid">${players
      .slice(0, playerCount)
      .map((p, i) => playerCard(p, i))
      .join(
        '',
      )}</div><div class="notice">${mobile() ? '📱 Mode paysage conseillé. À deux, chaque pilote utilise sa moitié d’écran.' : '⌨ Clavier partagé ou manettes : appuyez sur un bouton de la manette pour la détecter. À 3–4, les manettes sont conseillées.'}</div><div class="panel-actions">${button('← Accueil', 'back', 'secondary')}${button('Choisir le circuit →', 'next', 'primary')}</div><p class="inline-error" role="alert" id="setup-error"></p></section>`,
    'LE GARAGE',
  );
  common();
  app.querySelectorAll<HTMLElement>('[data-count]').forEach(
    (el) =>
      (el.onclick = () => {
        playerCount = Number(el.dataset.count);
        setup();
        $(`[data-count="${playerCount}"]`).focus();
      }),
  );
  app.querySelectorAll<HTMLSelectElement>('select[data-field]').forEach(
    (el) =>
      (el.onchange = () => {
        const focused = document.activeElement === el;
        const index = Number(el.dataset.player);
        const field = el.dataset.field;
        if (field === 'character') players[index].character = Number(el.value);
        if (field === 'kart') players[index].kart = Number(el.value);
        if (field === 'device') players[index].device = el.value;
        setup();
        if (focused) $(`select[data-player="${index}"][data-field="${field}"]`).focus();
      }),
  );
  $('#back').onclick = home;
  $('#next').onclick = () => {
    const devices = players
      .slice(0, playerCount)
      .map((p) => p.device)
      .filter((d) => d.startsWith('pad:'));
    if (new Set(devices).size !== devices.length) {
      $('#setup-error').textContent = 'Chaque manette doit être attribuée à un seul pilote.';
      return;
    }
    tracks();
  };
}
function playerCard(p: PlayerConfig, i: number) {
  const pads = Array.from(navigator.getGamepads?.() ?? []).filter((p): p is Gamepad => !!p);
  return `<article class="player-card player-${i}"><div class="player-label"><span>JOUEUR ${i + 1}</span><span>●</span></div><div class="character-preview" style="--character-color:${characters[p.character].color}"><span>${characters[p.character].icon}</span>${kartPortrait(karts[p.kart])}</div><label>VOTRE PILOTE<select data-player="${i}" data-field="character" aria-label="Personnage joueur ${i + 1}">${characters.map((c, j) => `<option value="${j}" ${p.character === j ? 'selected' : ''}>${c.name} · ${c.animal}</option>`).join('')}</select></label><label>VOTRE KART<select data-player="${i}" data-field="kart" aria-label="Kart joueur ${i + 1}">${karts.map((k, j) => `<option value="${j}" ${p.kart === j ? 'selected' : ''}>${k.name}</option>`).join('')}</select></label><div class="stats"><span>Vitesse <b>${'▰'.repeat(Math.round((karts[p.kart].speed - 20) / 3))}</b></span><span>Agilité <b>${'▰'.repeat(Math.round(karts[p.kart].handling * 2))}</b></span></div><label>COMMANDES<select data-player="${i}" data-field="device" aria-label="Contrôleur joueur ${i + 1}"><option value="keyboard" ${p.device === 'keyboard' ? 'selected' : ''}>Clavier · profil ${i + 1}</option><option value="touch" ${p.device === 'touch' ? 'selected' : ''}>Écran tactile</option>${pads.map((pad) => `<option value="pad:${pad.index}" ${p.device === `pad:${pad.index}` ? 'selected' : ''}>Manette ${pad.index + 1}</option>`).join('')}</select></label></article>`;
}
function tracks() {
  screen = 'tracks';
  app.innerHTML = shell(
    `<section class="panel tracks"><span class="eyebrow">02 / LA DESTINATION</span><h1>On part où ?</h1><p>Cinq ambiances. La même envie de gagner.</p><div class="track-grid">${trackDefinitions.map((t, i) => `<button class="track-card ${i === selectedTrack ? 'active' : ''}" data-track="${i}" aria-pressed="${i === selectedTrack}"><div class="track-art track-${i}" style="--track-color:${t.color}"><span>${t.icon}</span><svg viewBox="0 0 220 145" aria-hidden="true"><path d="${trackPreviewPath(i)}"/></svg><span class="track-number">0${i + 1}</span></div><div class="track-info"><small>${['POUR PRENDRE SES MARQUES', 'POUR PRENDRE DE LA VITESSE', 'POUR PRENDRE LE LARGE', 'POUR PRENDRE DE LA HAUTEUR', 'POUR PRENDRE LA VILLE'][i]}</small><h2>${t.name}</h2><p>${t.subtitle}</p><span>3 tours <b>·</b> ${i === 0 ? 'Facile' : i === 1 || i === 4 ? 'Intermédiaire' : 'Technique'}</span></div><div class="selected-mark">✓</div></button>`).join('')}</div><div class="panel-actions">${button('← Les pilotes', 'back', 'secondary')}<span class="race-summary">${playerCount} pilote${playerCount > 1 ? 's' : ''} + ${6 - playerCount} bots · 3 tours</span>${button('Lancer la course 🏁', 'start', 'primary')}</div></section>`,
    'LES CIRCUITS',
  );
  common();
  app.querySelectorAll<HTMLElement>('[data-track]').forEach(
    (el) =>
      (el.onclick = () => {
        selectedTrack = Number(el.dataset.track);
        renderer.menu(selectedTrack);
        tracks();
      }),
  );
  $('#back').onclick = setup;
  $('#start').onclick = () => start();
  const difficulty = document.createElement('label');
  difficulty.className = 'difficulty-setting';
  difficulty.innerHTML = `Difficulté des bots<select id="difficulty">${Object.entries(difficulties)
    .map(
      ([value, d]) =>
        `<option value="${value}" ${settings.difficulty === value ? 'selected' : ''}>${d.label} — ${d.description}</option>`,
    )
    .join('')}</select>`;
  $('.tracks .panel-actions').before(difficulty);
  $('#difficulty').onchange = (event) => {
    settings.difficulty = (event.target as HTMLSelectElement).value as Difficulty;
    saveSettings(settings);
  };
  $('.tracks').insertAdjacentHTML(
    'beforeend',
    '<p class="notice">⚠ Les panneaux jaunes annoncent les obstacles mobiles. Les routes secondaires plus étroites sont des raccourcis : leurs bas-côtés ralentissent fortement. Les bandes jaunes au sol indiquent uniquement les turbos.</p>',
  );
}
function help() {
  screen = 'help';
  app.innerHTML = shell(
    `<section class="panel help"><span class="eyebrow">LE PETIT GUIDE DU PILOTE</span><h1>Facile à prendre en main.</h1><div class="help-grid"><article><h2>01. Prenez le volant</h2><p>Accélérez, freinez et tournez. Pas de drift : gardez la bonne trajectoire ! Maintenez le frein à l’arrêt pour reculer.</p><p><b>Clavier J1</b> : W / A / S / D · Espace : objet<br><b>Clavier J2</b> : flèches · Entrée : objet<br><b>Manette</b> : stick gauche, RT/A, LT/B, X : objet<br><b>Tactile</b> : flèches, accélérateur, frein et cadeau</p></article><article><h2>02. Jouez les surprises</h2><p>🚀 <b>Missile</b> : visez un adversaire devant vous.<br>⚡ <b>Turbo</b> : un petit coup de pouce.<br>🛡️ <b>Bouclier</b> : une attaque bloquée.<br>🛢️ <b>Flaque</b> : une glissade pour les suivants.<br>🍄 <b>Géant</b> : 7 secondes pour projeter les rivaux et traverser les obstacles.<br>💥 <b>Onde de choc</b> : sautez et assommez les rivaux proches à l’atterrissage.</p><p>Le bouclier bloque aussi les projections et l’onde de choc. Géant ne signifie pas invincible aux objets ! Les bandes jaunes accélèrent votre kart. Les cadeaux reviennent après quelques secondes.</p></article><article><h2>03. Ensemble, jusqu’au bout</h2><p>Six concurrents, trois tours et un podium. Les bots complètent la grille. Après l’arrivée du premier humain, les autres ont 45 secondes pour finir.</p><p><b>Échap / Start</b> : pause.<br>Touches modifiables dans les réglages. Les appuis simultanés dépendent de votre clavier.</p></article></div>${button('Compris, on joue !', 'back', 'primary')}</section>`,
  );
  common();
  $('#back').onclick = home;
}
function options() {
  screen = 'settings';
  app.innerHTML = shell(
    `<section class="panel options"><span class="eyebrow">VOTRE TERRAIN DE JEU</span><h1>Les petits réglages.</h1><div class="settings-grid"><label>Volume général <input id="volume" type="range" min="0" max="1" step="0.05" value="${settings.volume}"></label><label>Musique d'ambiance <input id="music-volume" type="range" min="0" max="1" step="0.05" value="${settings.musicVolume}"></label><label>Effets sonores <input id="effects-volume" type="range" min="0" max="1" step="0.05" value="${settings.effectsVolume}"></label><label>Qualité graphique<select id="quality">${[
      ['auto', 'Adaptative (conseillée)'],
      ['low', 'Basse'],
      ['medium', 'Moyenne'],
      ['high', 'Haute'],
    ]
      .map(
        ([v, l]) =>
          `<option value="${v}" ${settings.quality === v ? 'selected' : ''}>${l}</option>`,
      )
      .join(
        '',
      )}</select></label><label class="check"><input type="checkbox" id="reduced" ${settings.reduced ? 'checked' : ''}> Réduire les animations</label></div><h2>Un clavier à votre façon</h2><p>Cliquez une touche, puis appuyez sur la nouvelle touche physique (AZERTY / QWERTY).</p><div class="binding-grid">${settings.bindings.map((b, i) => `<div><strong>Joueur ${i + 1}</strong>${b.map((code, j) => `<button data-bind="${i}:${j}"><small>${['Accélérer', 'Freiner', 'Gauche', 'Droite', 'Objet'][j]}</small><span>${keyLabel(code)}</span></button>`).join('')}</div>`).join('')}</div><p id="remap-status" role="status"></p>${button('Enregistrer et revenir', 'back', 'primary')}</section>`,
  );
  common();
  $('#volume').oninput = (e) => {
    settings.volume = Number((e.target as HTMLInputElement).value);
    audio.volume = settings.volume;
  };
  $('#music-volume').oninput = (e) => {
    settings.musicVolume = Number((e.target as HTMLInputElement).value);
    audio.musicVolume = settings.musicVolume;
  };
  $('#effects-volume').oninput = (e) => {
    settings.effectsVolume = Number((e.target as HTMLInputElement).value);
    audio.effectsVolume = settings.effectsVolume;
  };
  $('#quality').onchange = (e) => {
    settings.quality = (e.target as HTMLSelectElement).value;
    renderer.setQuality(settings.quality, settings.reduced);
  };
  $('#reduced').onchange = (e) => {
    settings.reduced = (e.target as HTMLInputElement).checked;
    renderer.setQuality(settings.quality, settings.reduced);
  };
  $('#back').insertAdjacentHTML(
    'beforebegin',
    `<h2>Une manette à votre façon</h2><p>Appuyez sur un bouton de votre manette pour la connecter. Cliquez une action, relâchez les commandes, puis appuyez sur le bouton ou déplacez le stick souhaité. Chaque profil correspond au joueur, quelle que soit la manette attribuée dans le garage. Les noms des boutons sont indicatifs pour les manettes standard.</p><div class="binding-grid">${settings.padBindings.map((profile, i) => `<div><strong>Joueur ${i + 1}</strong>${profile.map((binding, j) => `<button data-pad-bind="${i}:${j}"><small>${padActions[j]}</small><span>${binding.map(padControlLabel).join(' / ')}</span></button>`).join('')}<button data-pad-reset="${i}">Rétablir les commandes J${i + 1}</button></div>`).join('')}</div><p id="pad-remap-status" role="status"></p><button id="pad-remap-cancel" class="secondary" hidden>Annuler le mapping</button>`,
  );
  const cancelRemap = () => {
    inputs.onRemap = null;
    inputs.cancelPadRemap();
    app.querySelectorAll<HTMLElement>('[data-pad-bind][aria-busy]').forEach((el) => {
      const [i, j] = el.dataset.padBind!.split(':').map(Number);
      el.querySelector('span')!.textContent = settings.padBindings[i][j]
        .map(padControlLabel)
        .join(' / ');
      el.removeAttribute('aria-busy');
    });
    $('#remap-status').textContent = '';
    $('#pad-remap-status').textContent = '';
    $('#pad-remap-cancel').hidden = true;
  };
  $('#pad-remap-cancel').onclick = cancelRemap;
  app.querySelectorAll<HTMLElement>('[data-pad-bind]').forEach((el) => {
    el.onclick = () => {
      cancelRemap();
      const [i, j] = el.dataset.padBind!.split(':').map(Number);
      el.setAttribute('aria-busy', 'true');
      el.querySelector('span')!.textContent = 'Appuyez sur une commande…';
      $('#pad-remap-status').textContent =
        `Joueur ${i + 1} · ${padActions[j]} : relâchez les commandes, puis appuyez sur un bouton ou déplacez un stick… (Échap pour annuler)`;
      $('#pad-remap-cancel').hidden = false;
      inputs.onRemap = function cancelWithEscape(code) {
        if (code === 'Escape') cancelRemap();
        else inputs.onRemap = cancelWithEscape;
      };
      inputs.beginPadRemap((control) => {
        const conflict = settings.padBindings[i].findIndex(
          (binding, action) =>
            action !== j &&
            binding.some(
              (c) =>
                c.kind === control.kind &&
                c.index === control.index &&
                (c.kind !== 'axis' ||
                  (control.kind === 'axis' && c.direction === control.direction)),
            ),
        );
        if (conflict >= 0) {
          el.querySelector('span')!.textContent = 'Commande déjà utilisée — réessayez';
          $('#pad-remap-status').textContent =
            `Cette commande est déjà utilisée pour « ${padActions[conflict]} ». Choisissez une autre commande ou annulez.`;
          return false;
        }
        settings.padBindings[i][j] = [control];
        saveSettings(settings);
        options();
        $(`[data-pad-bind="${i}:${j}"]`).focus();
        return true;
      });
    };
  });
  app.querySelectorAll<HTMLElement>('[data-pad-reset]').forEach((el) => {
    el.onclick = () => {
      const i = Number(el.dataset.padReset);
      settings.padBindings[i] = freshPadBindings()[i];
      saveSettings(settings);
      options();
      $(`[data-pad-reset="${i}"]`).focus();
    };
  });
  app.querySelectorAll<HTMLElement>('[data-bind]').forEach(
    (el) =>
      (el.onclick = () => {
        cancelRemap();
        const [i, j] = el.dataset.bind!.split(':').map(Number);
        $('#remap-status').textContent = 'Appuyez sur une touche… (Échap pour annuler)';
        inputs.onRemap = (code) => {
          if (code !== 'Escape') {
            settings.bindings[i][j] = code;
            saveSettings(settings);
          }
          options();
        };
      }),
  );
  $('#back').onclick = () => {
    cancelRemap();
    saveSettings(settings);
    home();
  };
}
function keyLabel(code: string) {
  return code
    .replace('Key', '')
    .replace('Arrow', '↟ ')
    .replace('Numpad', 'Num ')
    .replace('Space', 'Espace');
}
function start() {
  document.body.classList.remove('showing-podium');
  lastLapUntil = [];
  audio.setPaused(document.hidden);
  saveSelection({ count: playerCount, track: selectedTrack, players });
  void audio.unlock();
  screen = 'race';
  race = new Race(selectedTrack, players.slice(0, playerCount), settings.difficulty);
  inputs.players = players.slice(0, playerCount);
  inputs.clear();
  pendingUse = [];
  paused = false;
  accumulator = 0;
  renderer.start(race);
  app.innerHTML = '';
  document.body.classList.add('racing');
  audio.play('countdown');
  race.onEvent = (kind, id, item) => {
    renderer.react(kind, id);
    if (kind === 'lastlap' && race?.racers[id]?.human) lastLapUntil[id] = race.elapsed + 3;
    if (kind === 'pickup' && race) renderer.effects?.pickup(id, race.racers[id].pos);
    if ((kind === 'explosion' || kind === 'splash') && race)
      renderer.effects?.impact(id, race.racers[id].pos, kind === 'splash');
    if (id < 0) {
      audio.play(kind);
      return;
    }
    if (!race?.racers[id].human) return;
    audio.play(kind, item);
  };
  buildHUD();
  startTime = performance.now();
}
function buildHUD() {
  if (!race) return;
  projectMap = mapProjection(race.track);
  const views = viewports(playerCount, innerWidth, innerHeight);
  hud.innerHTML =
    views
      .slice(0, playerCount)
      .map(
        (v, i) =>
          `<section class="player-hud" id="hud-${i}" style="left:${v.x}px;top:${v.y}px;width:${v.w}px;height:${v.h}px"><div class="hud-top"><span class="pilot-tag">J${i + 1} ${characters[players[i].character].icon}</span><div class="lap"><small>TOUR</small><strong data-lap>1 <em>/ 3</em></strong></div><span class="position" data-position>1<small> / 6</small></span></div><div class="hud-center" data-center></div><div class="hud-bottom"><div class="speed"><strong data-speed>0</strong><small>KM/H</small></div><div class="item-slot" data-item>◇<small>CADEAU</small></div></div><div class="wrong-way" data-wrong hidden>↶ Mauvais sens</div>${players[i].device === 'touch' ? `<div class="touch-controls"><div class="touch-steer"><button data-player="${i}" data-action="left" aria-label="Gauche joueur ${i + 1}">◀</button><button data-player="${i}" data-action="right" aria-label="Droite joueur ${i + 1}">▶</button></div><div class="touch-pedals"><button data-player="${i}" data-action="use" aria-label="Objet joueur ${i + 1}">🎁</button><button class="brake" data-player="${i}" data-action="brake" aria-label="Freiner joueur ${i + 1}">■</button><button class="gas" data-player="${i}" data-action="throttle" aria-label="Accélérer joueur ${i + 1}">▲</button></div></div>` : ''}</section>`,
      )
      .join('') +
    `<button id="pause" class="race-pause" aria-label="Pause">Ⅱ</button><div id="race-clock" class="race-clock"></div><div class="orientation">↻<strong>Tournez votre appareil</strong><span>La piste est plus belle en paysage.</span></div>${playerCount === 3 ? '<div class="fourth-cell"><strong>bibou<span>kart</span></strong><p>Six pilotes. Une seule arrivée.</p></div>' : ''}`;
  for (let i = 0; i < playerCount; i++)
    hud
      .querySelector(`#hud-${i}`)!
      .insertAdjacentHTML(
        'beforeend',
        `${minimapMarkup(race.track, i)}<div class="last-lap-banner" data-lastlap hidden role="status">🏁 Dernier tour !</div><div class="power-status" data-power role="status"></div>`,
      );
  inputs.bindTouch(hud);
  hud.querySelector<HTMLElement>('#pause')!.onclick = () => pause();
}
function updateHUD() {
  if (!race) return;
  const ranking = race.ranking;
  for (let i = 0; i < playerCount; i++) {
    const r = race.racers[i],
      el = hud.querySelector<HTMLElement>(`#hud-${i}`)!;
    for (const racer of race.racers) {
      const point = projectMap!(racer.pos.x, racer.pos.z);
      el.querySelector(`[data-map-racer="${racer.id}"]`)!.setAttribute(
        'transform',
        `translate(${point.x.toFixed(1)},${point.y.toFixed(1)})`,
      );
    }
    el.querySelector<HTMLElement>('[data-lastlap]')!.hidden = !(
      race.elapsed < (lastLapUntil[i] ?? 0) && !r.finished
    );
    el.querySelector('[data-lap]')!.innerHTML = `${Math.min(3, r.lap + 1)} <em>/ 3</em>`;
    el.querySelector('[data-position]')!.innerHTML = `${ranking.indexOf(r) + 1}<small> / 6</small>`;
    el.querySelector('[data-speed]')!.textContent = String(Math.round(Math.abs(r.speed) * 3.6));
    el.querySelector('[data-power]')!.textContent =
      r.knockedTime > 0
        ? '💫 Retour en piste…'
        : r.stun > 0
          ? '💫 Assommé !'
          : r.shockPending
            ? '💥 Attention à l’atterrissage !'
            : r.giant > 0
              ? `🍄 Géant · ${Math.ceil(r.giant)} s`
              : '';
    el.querySelector('[data-item]')!.innerHTML = r.item
      ? `${itemIcons[r.item]}<small>${itemNames[r.item]}</small>`
      : '◇<small>CADEAU</small>';
    el.querySelector<HTMLElement>('[data-wrong]')!.hidden = !r.wrongWay;
    const center = el.querySelector<HTMLElement>('[data-center]')!;
    center.textContent =
      race.countdown > 0.5
        ? String(Math.ceil(race.countdown - 0.5))
        : race.countdown > 0
          ? 'GO !'
          : r.finished
            ? 'ARRIVÉE !'
            : race.elapsed < 1
              ? 'GO !'
              : '';
    el.classList.toggle('boosting', r.boost > 0 && !settings.reduced);
    el.classList.toggle('collecting', renderer.effects?.isCollecting(i) ?? false);
    el.classList.toggle('reduced-effects', settings.reduced);
  }
  const clock = hud.querySelector('#race-clock');
  if (clock)
    clock.textContent = Number.isFinite(race.finishDeadline)
      ? `Fin dans ${Math.max(0, Math.ceil(race.finishDeadline - race.elapsed))} s`
      : formatTime(race.elapsed);
}
async function enterFullscreen() {
  if (!document.fullscreenEnabled || document.fullscreenElement) return;
  await document.documentElement.requestFullscreen();
  const orientation = window.screen.orientation as ScreenOrientation & {
    lock?: (mode: string) => Promise<void>;
  };
  if (mobile()) await orientation.lock?.('landscape').catch(() => {});
}
function pause(message = 'On reprend son souffle ?') {
  if (!race || race.finished || screen !== 'race') return;
  paused = true;
  audio.setPaused(true);
  inputs.clear();
  app.innerHTML = `<div class="overlay"><section class="panel pause-panel"><span class="eyebrow">PAUSE AU STAND</span><h1>${message}</h1><p>Tout le monde vous attend.</p>${button('Reprendre →', 'resume', 'primary')}${button('Recommencer', 'restart', 'secondary')}${button('Changer les contrôleurs', 'controllers', 'secondary')}${document.fullscreenEnabled ? button(document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran', 'fullscreen', 'secondary') : ''}${button('Quitter la course', 'quit', 'text-button')}<p id="fullscreen-status" role="status"></p></section></div>`;
  $('#resume').onclick = () => resume();
  $('#restart').onclick = start;
  $('#quit').onclick = home;
  $('#controllers').onclick = () => controllerDialog();
  const fullscreen = $('#fullscreen');
  if (fullscreen)
    fullscreen.onclick = async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await enterFullscreen();
        pause();
      } catch {
        $('#fullscreen-status').textContent =
          'Plein écran indisponible : le jeu reste jouable dans cet onglet.';
      }
    };
}
function controllerDialog() {
  if (!race) return;
  const pads = Array.from(navigator.getGamepads?.() ?? []).filter((p): p is Gamepad => !!p);
  app.innerHTML = `<div class="overlay"><section class="panel pause-panel"><h1>Les contrôleurs</h1>${players
    .slice(0, playerCount)
    .map(
      (p, i) =>
        `<label>Joueur ${i + 1}<select data-controller="${i}"><option value="keyboard" ${p.device === 'keyboard' ? 'selected' : ''}>Clavier</option><option value="touch" ${p.device === 'touch' ? 'selected' : ''}>Tactile</option>${pads.map((g) => `<option value="pad:${g.index}" ${p.device === `pad:${g.index}` ? 'selected' : ''}>Manette ${g.index + 1}</option>`).join('')}</select></label>`,
    )
    .join(
      '',
    )}<p id="controller-error" role="alert"></p>${button('Valider', 'confirm', 'primary')}</section></div>`;
  $('#confirm').onclick = () => {
    const selections = Array.from(app.querySelectorAll<HTMLSelectElement>('[data-controller]')).map(
        (s) => s.value,
      ),
      used = selections.filter((s) => s.startsWith('pad:'));
    if (new Set(used).size !== used.length) {
      $('#controller-error').textContent = 'Une manette par pilote.';
      return;
    }
    selections.forEach((device, i) => {
      players[i].device = device;
      inputs.players[i].device = device;
    });
    buildHUD();
    resume();
  };
}
function resume() {
  if (!race) return;
  paused = false;
  audio.setPaused(document.hidden);
  inputs.clear();
  pendingUse = [];
  app.innerHTML = '';
  last = performance.now();
  accumulator = 0;
}
inputs.onPause = () => {
  if (screen === 'race') {
    if (paused) resume();
    else pause();
  }
};
inputs.onDisconnect = () => {
  if (screen === 'setup') setup();
  else pause('Une manette s’est déconnectée.');
};
document.querySelector('#game')!.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  pause('Le moteur graphique fait une pause.');
});
document.querySelector('#game')!.addEventListener('webglcontextrestored', () => {
  pause('Le moteur est prêt à repartir.');
});
addEventListener('blur', () => {
  pause();
  audio.setPaused(true);
});
addEventListener('focus', () => audio.setPaused(paused || document.hidden));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
  audio.setPaused(paused || document.hidden);
});
addEventListener('gamepadconnected', () => {
  if (screen === 'setup') setup();
});
addEventListener('resize', () => {
  inputs.clear();
  renderer.resize();
  if (screen === 'race') buildHUD();
});
function results() {
  if (!race) return;
  screen = 'results';
  inputs.players = [];
  inputs.clear();
  hud.innerHTML = '';
  document.body.classList.remove('racing');
  const winner = race.ranking[0];
  audio.play('finish');
  app.innerHTML = shell(
    `<section class="panel results"><span class="eyebrow">LE DRAPEAU EST TOMBÉ</span><div class="winner-icon">${characters[winner.config.character].icon}</div><h1>${characters[winner.config.character].name} remporte la course !</h1><p>${trackDefinitions[selectedTrack].name} · 3 tours de pur bonheur</p><div class="leaderboard">${race.ranking.map((r, i) => `<div class="${r.human ? 'human' : ''}"><span class="rank">${i + 1}</span><span>${characters[r.config.character].icon} ${characters[r.config.character].name} <small>${r.human ? 'J' + (r.id + 1) : 'BOT'}</small></span><span>${r.finished ? formatTime(r.finishTime) : `${Math.min(3, r.lap + 1)}e tour`}</span></div>`).join('')}</div><div class="panel-actions">${button('← Accueil', 'home', 'secondary')}${button('Changer de circuit', 'circuits', 'secondary')}${button('La revanche ! ↗', 'again', 'primary')}</div></section>`,
    'LE PODIUM',
  );
  common();
  $('#home').onclick = home;
  $('#circuits').onclick = tracks;
  $('#again').onclick = start;
  $('.leaderboard').insertAdjacentHTML(
    'beforebegin',
    `<p class="difficulty-result">Bots : ${difficulties[race.difficulty].label}</p>`,
  );
  renderer.showPodium(race);
  const resultPanel = $('.results'),
    details = document.createElement('div');
  details.className = 'results-details';
  details.append(...Array.from(resultPanel.childNodes));
  resultPanel.append(details);
  resultPanel.insertAdjacentHTML(
    'afterbegin',
    '<div id="podium-view" role="img" aria-label="Podium 3D animé des trois premiers concurrents"></div>',
  );
  document.body.classList.add('showing-podium');
}
function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;
}
function menuGamepad(now: number) {
  if (screen === 'race' && !paused) return;
  const pad = Array.from(navigator.getGamepads?.() ?? []).find((p) => p?.connected);
  if (!pad) return;
  const vertical =
    pad.axes[1] > 0.5 || pad.buttons[13]?.pressed
      ? 1
      : pad.axes[1] < -0.5 || pad.buttons[12]?.pressed
        ? -1
        : 0;
  const horizontal =
    pad.axes[0] > 0.5 || pad.buttons[15]?.pressed
      ? 1
      : pad.axes[0] < -0.5 || pad.buttons[14]?.pressed
        ? -1
        : 0;
  const direction = vertical || horizontal;
  if (direction && now - gamepadMenuLast > 220) {
    const active = document.activeElement;
    if (active instanceof HTMLSelectElement && horizontal) {
      active.selectedIndex =
        (active.selectedIndex + horizontal + active.options.length) % active.options.length;
      active.dispatchEvent(new Event('change'));
    } else {
      const focusables = Array.from(
        app.querySelectorAll<HTMLElement>('button,select,input,a'),
      ).filter((e) => e.offsetParent !== null);
      const index = focusables.indexOf(document.activeElement as HTMLElement);
      focusables[(index + direction + focusables.length) % focusables.length]?.focus();
    }
    gamepadMenuLast = now;
  }
  const pressed = !!pad.buttons[0]?.pressed;
  if (pressed && !gamepadMenuLatch) {
    const active = document.activeElement;
    if (active instanceof HTMLSelectElement) {
      active.selectedIndex = (active.selectedIndex + 1) % active.options.length;
      active.dispatchEvent(new Event('change'));
    } else if (active instanceof HTMLInputElement && active.type === 'checkbox') {
      active.click();
    } else if (active instanceof HTMLElement && active !== document.body) active.click();
    else app.querySelector<HTMLElement>('button')?.focus();
  }
  gamepadMenuLatch = pressed;
}
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (inputs.pollPadRemap()) {
    gamepadMenuLatch = true;
    gamepadMenuLast = now;
  } else {
    inputs.pollPause();
    menuGamepad(now);
  }
  if (race && screen === 'race' && !paused) {
    accumulator += dt;
    let steps = 0;
    const frameInputs = inputs.read();
    frameInputs.forEach((input, i) => {
      pendingUse[i] = !!pendingUse[i] || input.use;
      input.use = pendingUse[i];
    });
    while (!paused && accumulator >= 1 / 60 && steps++ < 6) {
      race.update(1 / 60, frameInputs);
      frameInputs.forEach((input, i) => {
        input.use = false;
        pendingUse[i] = false;
      });
      accumulator -= 1 / 60;
    }
    if (race.finished) results();
    hudTime += dt;
    if (hudTime > 0.08 && screen === 'race') {
      updateHUD();
      hudTime = 0;
    }
  }
  renderer.render(
    dt,
    race && screen === 'race' && !paused ? Math.min(1, accumulator * 60) : 1,
    screen === 'race' && !paused ? dt : 0,
  );
  audio.update(
    race?.racers[0].speed ?? 0,
    screen === 'race' && !paused && !!race && race.countdown === 0,
  );
  requestAnimationFrame(frame);
}
// Debug hooks are compiled away from production builds. E2E runs the dev server.
if (import.meta.env.DEV) {
  Object.assign(window, {
    __bibou: {
      get race() {
        return race;
      },
      get renderer() {
        return renderer;
      },
      get audio() {
        return audio;
      },
      get inputs() {
        return inputs;
      },
      start: (count = 1, track = 0) => {
        playerCount = count;
        selectedTrack = track;
        start();
      },
      finish: () => {
        if (!race) return;
        race.racers.forEach((r, i) => {
          r.finished = true;
          r.finishTime = 65 + i;
        });
        race.finished = true;
        results();
      },
      get state() {
        return {
          screen,
          paused,
          playerCount,
          elapsed: race?.elapsed,
          uptime: performance.now() - startTime,
          pauseButtons: Object.fromEntries(inputs.pauseButtons),
        };
      },
    },
  });
}
home();
requestAnimationFrame(frame);
