import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  ArrowLeft, ArrowRight, Coins, Heart, KeyRound, Pause, Play,
  RotateCcw, Volume2, VolumeX, Wind, Zap,
} from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const W = 960;
const H = 540;
const PLAYER_W = 34;
const PLAYER_H = 43;

type Platform = { x: number; y: number; w: number; h: number };
type Coin = { x: number; y: number; got: boolean; id: string };
type Enemy = { x: number; y: number; left: number; right: number; speed: number; dir: number };
type Level = { title: string; requirement: number; width: number; platforms: Platform[]; coins: [number, number][]; enemies: [number, number, number, number, number][]; sky: string; hill: string };
type Runtime = {
  phase: 'start' | 'playing' | 'paused' | 'complete' | 'gameover' | 'victory';
  level: number; lives: number; totalCoins: number; levelCoins: number; player: { x: number; y: number; vx: number; vy: number; grounded: boolean; facing: number };
  camera: number; coins: Coin[]; enemies: Enemy[]; invulnerable: number; status: string; muted: boolean; elapsed: number;
};

const levels: Level[] = [
  {
    title: 'Nimbu ghaati', requirement: 5, width: 2250, sky: '#8bd5df', hill: '#b8d99b',
    platforms: [
      { x: 0, y: 480, w: 430, h: 80 }, { x: 510, y: 480, w: 370, h: 80 }, { x: 960, y: 480, w: 420, h: 80 },
      { x: 1450, y: 480, w: 800, h: 80 }, { x: 260, y: 390, w: 130, h: 20 }, { x: 590, y: 365, w: 145, h: 20 },
      { x: 800, y: 420, w: 90, h: 18 }, { x: 1050, y: 390, w: 150, h: 20 }, { x: 1270, y: 345, w: 125, h: 20 },
      { x: 1550, y: 390, w: 150, h: 20 }, { x: 1820, y: 350, w: 150, h: 20 },
    ],
    coins: [[185,425],[320,345],[575,433],[648,320],[834,375],[1040,430],[1110,345],[1325,300],[1510,430],[1620,345],[1880,305],[2070,430]],
    enemies: [[710,441,660,840,1],[1150,441,1000,1340,1.3],[1700,441,1500,1860,1.2]], 
  },
  {
    title: 'Badal bazaar', requirement: 7, width: 2820, sky: '#84c8df', hill: '#a8c5a6',
    platforms: [
      { x: 0, y: 480, w: 330, h: 80 }, { x: 430, y: 480, w: 310, h: 80 }, { x: 850, y: 480, w: 300, h: 80 },
      { x: 1260, y: 480, w: 400, h: 80 }, { x: 1750, y: 480, w: 330, h: 80 }, { x: 2180, y: 480, w: 640, h: 80 },
      { x: 215, y: 370, w: 130, h: 19 }, { x: 510, y: 390, w: 140, h: 19 }, { x: 760, y: 340, w: 130, h: 19 },
      { x: 980, y: 385, w: 135, h: 19 }, { x: 1190, y: 330, w: 140, h: 19 }, { x: 1460, y: 375, w: 140, h: 19 },
      { x: 1690, y: 330, w: 130, h: 19 }, { x: 1930, y: 375, w: 130, h: 19 }, { x: 2240, y: 340, w: 160, h: 19 },
    ],
    coins: [[180,430],[255,325],[475,430],[565,345],[810,295],[930,430],[1035,340],[1235,285],[1370,430],[1510,330],[1810,430],[1750,285],[1990,330],[2300,300],[2500,430],[2670,430]],
    enemies: [[520,441,450,720,1.5],[1000,441,875,1120,1.6],[1450,441,1280,1640,1.8],[2300,441,2200,2720,1.9]],
  },
  {
    title: 'Laal pahaad', requirement: 8, width: 3320, sky: '#91c8cf', hill: '#d6ae83',
    platforms: [
      { x: 0, y: 480, w: 330, h: 80 }, { x: 420, y: 480, w: 280, h: 80 }, { x: 800, y: 480, w: 300, h: 80 },
      { x: 1200, y: 480, w: 290, h: 80 }, { x: 1580, y: 480, w: 360, h: 80 }, { x: 2040, y: 480, w: 300, h: 80 },
      { x: 2440, y: 480, w: 880, h: 80 }, { x: 205, y: 355, w: 130, h: 19 }, { x: 500, y: 365, w: 130, h: 19 },
      { x: 730, y: 310, w: 135, h: 19 }, { x: 980, y: 360, w: 130, h: 19 }, { x: 1130, y: 300, w: 135, h: 19 },
      { x: 1390, y: 350, w: 140, h: 19 }, { x: 1690, y: 315, w: 130, h: 19 }, { x: 1890, y: 370, w: 135, h: 19 },
      { x: 2180, y: 320, w: 140, h: 19 }, { x: 2450, y: 365, w: 130, h: 19 }, { x: 2700, y: 305, w: 150, h: 19 },
    ],
    coins: [[170,430],[250,310],[465,430],[550,320],[780,265],[930,430],[1030,315],[1185,255],[1320,430],[1450,305],[1650,430],[1750,270],[1930,325],[2120,430],[2240,275],[2520,320],[2765,260],[3000,430]],
    enemies: [[500,441,430,680,1.9],[900,441,820,1080,2],[1350,441,1210,1470,2.2],[1720,441,1610,1920,2.1],[2200,441,2050,2330,2.4],[2780,441,2480,3200,2.5]],
  },
  {
    title: 'Suraj ka kila', requirement: 10, width: 3900, sky: '#9bd3da', hill: '#d2bd82',
    platforms: [
      { x: 0, y: 480, w: 330, h: 80 }, { x: 430, y: 480, w: 300, h: 80 }, { x: 830, y: 480, w: 300, h: 80 },
      { x: 1230, y: 480, w: 300, h: 80 }, { x: 1630, y: 480, w: 310, h: 80 }, { x: 2040, y: 480, w: 300, h: 80 },
      { x: 2440, y: 480, w: 330, h: 80 }, { x: 2870, y: 480, w: 1030, h: 80 },
      { x: 230, y: 355, w: 125, h: 18 }, { x: 500, y: 330, w: 130, h: 18 }, { x: 700, y: 385, w: 120, h: 18 },
      { x: 930, y: 320, w: 125, h: 18 }, { x: 1100, y: 375, w: 130, h: 18 }, { x: 1350, y: 320, w: 130, h: 18 },
      { x: 1530, y: 380, w: 120, h: 18 }, { x: 1760, y: 315, w: 135, h: 18 }, { x: 1970, y: 370, w: 130, h: 18 },
      { x: 2190, y: 310, w: 130, h: 18 }, { x: 2510, y: 340, w: 140, h: 18 }, { x: 2740, y: 290, w: 130, h: 18 },
      { x: 3100, y: 350, w: 140, h: 18 }, { x: 3410, y: 300, w: 145, h: 18 },
    ],
    coins: [[180,430],[280,310],[485,430],[560,285],[760,340],[890,430],[990,275],[1160,330],[1290,430],[1415,275],[1570,335],[1690,430],[1810,270],[1995,325],[2100,430],[2245,265],[2540,295],[2690,430],[2800,245],[3020,430],[3160,305],[3480,255],[3700,430]],
    enemies: [[500,441,450,700,2.1],[950,441,850,1100,2.3],[1370,441,1250,1510,2.4],[1770,441,1650,1910,2.6],[2220,441,2070,2320,2.7],[2580,441,2460,2740,2.8],[3300,441,2920,3800,3]],
  },
];

function freshRuntime(muted = false): Runtime {
  return {
    phase: 'start', level: 0, lives: 3, totalCoins: 0, levelCoins: 0,
    player: { x: 55, y: 437, vx: 0, vy: 0, grounded: true, facing: 1 },
    camera: 0, coins: [], enemies: [], invulnerable: 0, status: 'Chalo, sikke jama karo!', muted, elapsed: 0,
  };
}
function buildLevel(runtime: Runtime, levelIndex: number) {
  const level = levels[levelIndex];
  runtime.level = levelIndex;
  runtime.levelCoins = 0;
  runtime.coins = level.coins.map(([x, y], i) => ({ x, y, got: false, id: `${levelIndex}-${i}` }));
  runtime.enemies = level.enemies.map(([x, y, left, right, speed]) => ({ x, y, left, right, speed: speed * (1 + levelIndex * .12), dir: 1 }));
  runtime.player = { x: 55, y: 437, vx: 0, vy: 0, grounded: true, facing: 1 };
  runtime.camera = 0;
  runtime.invulnerable = 1000;
  runtime.status = `Level ${levelIndex + 1} — ${level.title}`;
}

function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime>(freshRuntime());
  const keysRef = useRef<Record<string, boolean>>({});
  const lastTickRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const [view, setView] = useState(() => ({ phase: 'start' as Runtime['phase'], level: 0, lives: 3, totalCoins: 0, levelCoins: 0, muted: false, status: 'Chalo, sikke jama karo!' }));

  const publish = useCallback(() => {
    const r = runtimeRef.current;
    setView({ phase: r.phase, level: r.level, lives: r.lives, totalCoins: r.totalCoins, levelCoins: r.levelCoins, muted: r.muted, status: r.status });
  }, []);
  const sound = useCallback((frequency = 600, duration = .08, kind: OscillatorType = 'sine') => {
    const r = runtimeRef.current;
    if (r.muted) return;
    try {
      const context = audioRef.current ?? new AudioContext();
      audioRef.current = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind;
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(90, frequency * .65), context.currentTime + duration);
      gain.gain.setValueAtTime(.075, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + duration);
    } catch { /* Browser audio may be unavailable. */ }
  }, []);
  const startGame = useCallback(() => {
    const r = runtimeRef.current;
    const muted = r.muted;
    Object.assign(r, freshRuntime(muted));
    r.phase = 'playing';
    buildLevel(r, 0);
    keysRef.current = {};
    sound(520, .12);
    publish();
  }, [publish, sound]);
  const togglePause = useCallback(() => {
    const r = runtimeRef.current;
    if (r.phase === 'playing') { r.phase = 'paused'; r.status = 'Thoda aaram?'; }
    else if (r.phase === 'paused') { r.phase = 'playing'; r.status = 'Wapas khel mein!'; }
    publish();
  }, [publish]);
  const toggleSound = useCallback(() => {
    runtimeRef.current.muted = !runtimeRef.current.muted;
    publish();
    if (!runtimeRef.current.muted) sound(740, .08);
  }, [publish, sound]);
  const nextLevel = useCallback(() => {
    const r = runtimeRef.current;
    if (r.level + 1 >= levels.length) { r.phase = 'victory'; r.status = 'Aap asli Coin Hero ho!'; }
    else { buildLevel(r, r.level + 1); r.phase = 'playing'; sound(720, .16); }
    publish();
  }, [publish, sound]);
  const pauseOrResume = useCallback(() => {
    if (runtimeRef.current.phase === 'playing' || runtimeRef.current.phase === 'paused') togglePause();
  }, [togglePause]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', ' '].includes(key)) event.preventDefault();
      if (key === 'p' || key === 'escape') { pauseOrResume(); return; }
      if (key === 'r') { startGame(); return; }
      keysRef.current[key] = true;
    };
    const up = (event: KeyboardEvent) => { keysRef.current[event.key.toLowerCase()] = false; };
    const clearKeys = () => { keysRef.current = {}; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clearKeys);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clearKeys); };
  }, [pauseOrResume, startGame]);

  useEffect(() => {
    let raf = 0;
    let lastPublish = 0;
    const frame = (time: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) { raf = requestAnimationFrame(frame); return; }
      const r = runtimeRef.current;
      const dt = Math.min((time - (lastTickRef.current || time)) / 16.667, 2);
      lastTickRef.current = time;
      r.elapsed += dt;
      const level = levels[r.level] ?? levels[0];
      if (r.phase === 'playing') {
        const player = r.player;
        const keys = keysRef.current;
        const left = keys.arrowleft || keys.a;
        const right = keys.arrowright || keys.d;
        if (left) { player.vx = -4.25; player.facing = -1; }
        else if (right) { player.vx = 4.25; player.facing = 1; }
        else player.vx *= .72;
        const jump = keys[' '] || keys.arrowup || keys.w;
        if (jump && player.grounded) { player.vy = -11.7; player.grounded = false; sound(380, .07); }
        player.x += player.vx * dt;
        player.x = Math.max(0, Math.min(level.width - PLAYER_W, player.x));
        const previousBottom = player.y + PLAYER_H;
        player.vy = Math.min(13, player.vy + .55 * dt);
        player.y += player.vy * dt;
        player.grounded = false;
        for (const platform of level.platforms) {
          if (player.vy >= 0 && previousBottom <= platform.y + 5 && player.y + PLAYER_H >= platform.y &&
              player.x + PLAYER_W > platform.x && player.x < platform.x + platform.w) {
            player.y = platform.y - PLAYER_H; player.vy = 0; player.grounded = true;
          }
        }
        if (r.invulnerable > 0) r.invulnerable -= dt * 16.67;
        for (const coin of r.coins) {
          if (!coin.got && Math.abs(player.x + PLAYER_W / 2 - coin.x) < 28 && Math.abs(player.y + PLAYER_H / 2 - coin.y) < 32) {
            coin.got = true; r.levelCoins++; r.totalCoins++; r.status = 'Wah! Ek aur sikka!';
            sound(830 + (r.levelCoins % 3) * 120, .1);
          }
        }
        for (const enemy of r.enemies) {
          enemy.x += enemy.speed * enemy.dir * dt;
          if (enemy.x < enemy.left || enemy.x > enemy.right) enemy.dir *= -1;
          if (r.invulnerable <= 0 && player.x + PLAYER_W - 5 > enemy.x + 4 && player.x + 5 < enemy.x + 37 &&
              player.y + PLAYER_H - 5 > enemy.y && player.y + 5 < enemy.y + 37) {
            r.lives--;
            if (r.lives <= 0) { r.phase = 'gameover'; r.status = 'Khel khatam! Phir se koshish karo.'; }
            else { player.x = Math.max(45, player.x - player.facing * 95); player.y = 437; player.vx = 0; player.vy = 0; r.invulnerable = 1450; r.status = 'Arre! Ek jaan kam hui'; }
            sound(180, .2, 'square');
          }
        }
        if (player.y > H + 45) {
          r.lives--;
          if (r.lives <= 0) { r.phase = 'gameover'; r.status = 'Khel khatam! Phir se koshish karo.'; }
          else { player.x = Math.max(45, Math.min(level.width - 100, r.camera + 65)); player.y = 437; player.vx = 0; player.vy = 0; r.invulnerable = 1550; r.status = 'Gir gaye! Safe jagah par wapas'; }
          sound(160, .18, 'triangle');
        }
        r.camera = Math.max(0, Math.min(level.width - W, player.x - 280));
        const gateX = level.width - 105;
        if (player.x + PLAYER_W > gateX && r.levelCoins >= level.requirement) {
          r.phase = 'complete'; r.status = 'Shabash! Gate khul gaya!'; sound(900, .22);
        } else if (player.x + PLAYER_W > gateX && r.levelCoins < level.requirement) {
          r.status = `Gate ke liye ${level.requirement - r.levelCoins} sikke aur chahiye!`;
        }
      }

      ctx.clearRect(0, 0, W, H);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, level.sky); sky.addColorStop(1, '#d9edce');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // Painted sun, clouds and distant ridges
      ctx.fillStyle = 'rgba(255,223,119,.92)'; ctx.beginPath(); ctx.arc(790 - r.camera * .08, 90, 42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.66)';
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 230 + 70 - r.camera * .18) % (W + 220) + W + 220) % (W + 220) - 70;
        ctx.beginPath(); ctx.ellipse(cx, 124 + (i % 2) * 42, 44, 14, 0, 0, Math.PI * 2); ctx.ellipse(cx + 22, 116 + (i % 2) * 42, 27, 20, 0, 0, Math.PI * 2); ctx.ellipse(cx + 48, 126 + (i % 2) * 42, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = level.hill;
      ctx.beginPath(); ctx.moveTo(0, 392);
      for (let x = 0; x <= W + 25; x += 25) ctx.lineTo(x, 350 + Math.sin((x + r.camera * .14) / 90) * 23 + Math.sin((x + r.camera * .14) / 37) * 7);
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
      ctx.fillStyle = 'rgba(255,249,223,.47)';
      for (let i = 0; i < 7; i++) {
        const x = ((i * 177 - r.camera * .35) % (W + 80) + W + 80) % (W + 80) - 25;
        ctx.fillRect(x, 428 + (i % 2) * 18, 7, 18); ctx.beginPath(); ctx.arc(x + 4, 427 + (i % 2) * 18, 12, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save(); ctx.translate(-r.camera, 0);
      for (const platform of level.platforms) {
        ctx.fillStyle = '#528c69'; ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
        ctx.fillStyle = '#8fc56f'; ctx.fillRect(platform.x, platform.y, platform.w, 10);
        ctx.fillStyle = 'rgba(39,91,70,.19)';
        for (let x = platform.x + 13; x < platform.x + platform.w; x += 35) ctx.fillRect(x, platform.y + 18, 4, 4);
        if (platform.h > 30) {
          ctx.fillStyle = '#e9c47c'; ctx.fillRect(platform.x, platform.y + 12, platform.w, 7);
          ctx.fillStyle = '#b88a55'; ctx.fillRect(platform.x, platform.y + 19, platform.w, platform.h - 19);
        }
      }
      // Gate
      const gateX = level.width - 105;
      ctx.fillStyle = '#397f6a'; ctx.fillRect(gateX, 352, 75, 128);
      ctx.fillStyle = '#f7d45c'; ctx.fillRect(gateX + 12, 364, 51, 116);
      ctx.fillStyle = '#438c75'; ctx.beginPath(); ctx.arc(gateX + 37, 364, 25, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#fff4c8'; ctx.fillRect(gateX + 25, 394, 24, 86);
      ctx.fillStyle = '#e9a947'; ctx.beginPath(); ctx.arc(gateX + 44, 438, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#315f53'; ctx.font = 'bold 14px "Baloo 2", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('FINISH', gateX + 37, 337);
      for (const coin of r.coins) {
        if (coin.got) continue;
        const bob = Math.sin(r.elapsed * .08 + coin.x) * 3;
        ctx.fillStyle = '#dc9226'; ctx.beginPath(); ctx.ellipse(coin.x, coin.y + bob + 2, 11, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd655'; ctx.beginPath(); ctx.ellipse(coin.x, coin.y + bob, 10, 13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff0a1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(coin.x, coin.y + bob, 5, 8, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#db9c28'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('1', coin.x, coin.y + bob + 4);
      }
      for (const enemy of r.enemies) {
        ctx.fillStyle = '#c94e48'; ctx.beginPath(); ctx.roundRect(enemy.x, enemy.y, 40, 38, 11); ctx.fill();
        ctx.fillStyle = '#f47760'; ctx.beginPath(); ctx.roundRect(enemy.x + 3, enemy.y + 2, 34, 11, 6); ctx.fill();
        ctx.fillStyle = '#fff7df'; ctx.fillRect(enemy.x + 9, enemy.y + 12, 8, 10); ctx.fillRect(enemy.x + 24, enemy.y + 12, 8, 10);
        ctx.fillStyle = '#28364a'; ctx.fillRect(enemy.x + 13 + (enemy.dir > 0 ? 2 : 0), enemy.y + 15, 4, 6); ctx.fillRect(enemy.x + 27 + (enemy.dir > 0 ? 2 : 0), enemy.y + 15, 4, 6);
        ctx.fillStyle = '#873c3c'; ctx.fillRect(enemy.x + 8, enemy.y + 34, 9, 5); ctx.fillRect(enemy.x + 25, enemy.y + 34, 9, 5);
      }
      // Little hero: warm scarf, expressive eyes, tiny backpack.
      const p = r.player;
      if (!(r.invulnerable > 0 && Math.floor(r.elapsed / 5) % 2 === 0)) {
        ctx.fillStyle = '#bd6f3b'; ctx.fillRect(p.x + 3, p.y + 31, 10, 12); ctx.fillRect(p.x + 21, p.y + 31, 10, 12);
        ctx.fillStyle = '#324e68'; ctx.fillRect(p.x + 1, p.y + 39, 13, 5); ctx.fillRect(p.x + 20, p.y + 39, 13, 5);
        ctx.fillStyle = '#de8346'; ctx.beginPath(); ctx.roundRect(p.x + 4, p.y + 13, 27, 23, 8); ctx.fill();
        ctx.fillStyle = '#f4c98a'; ctx.beginPath(); ctx.roundRect(p.x + 7, p.y + 4, 24, 22, 8); ctx.fill();
        ctx.fillStyle = '#273b51'; ctx.fillRect(p.x + (p.facing > 0 ? 23 : 10), p.y + 12, 3, 5);
        ctx.fillStyle = '#e9573c'; ctx.beginPath(); ctx.moveTo(p.x + 7, p.y + 25); ctx.lineTo(p.x + 29, p.y + 29); ctx.lineTo(p.x + 25, p.y + 34); ctx.lineTo(p.x + 6, p.y + 30); ctx.fill();
        ctx.fillStyle = '#324e68'; ctx.beginPath(); ctx.roundRect(p.x + 2, p.y + 2, 29, 7, 4); ctx.fill();
        ctx.fillStyle = '#f4c447'; ctx.fillRect(p.x + 8, p.y, 17, 4);
      }
      ctx.restore();
      // world progress tick marks
      ctx.fillStyle = 'rgba(255,249,232,.68)'; ctx.fillRect(18, 18, 128, 5);
      ctx.fillStyle = '#f0643d'; ctx.fillRect(18, 18, 128 * Math.min(1, (r.player.x + 22) / level.width), 5);
      if (time - lastPublish > 110) { lastPublish = time; publish(); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [publish, sound]);

  const level = levels[view.level] ?? levels[0];
  const progress = Math.min(100, view.levelCoins / level.requirement * 100);
  const overlay = view.phase !== 'playing';
  const onTouch = (key: string, down: boolean) => {
    keysRef.current[key] = down;
    if (down && key === ' ') sound(380, .07);
  };
  return (
    <main className="game-shell" data-testid="game-screen">
      <header className="game-top">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none"><path d="M5 24 11 8l5 10 4-7 7 13H5Z" fill="#fff2cf" stroke="#fff2cf" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="24" cy="7" r="3" fill="#ffd65a"/></svg>
          </div>
          <div><h1 className="brand-name">Coin Hero 2D</h1><p className="brand-tag">Chhoti si badi adventure</p></div>
        </div>
        <div className="top-actions">
          <button className="quiet-button" type="button" onClick={toggleSound} aria-label={view.muted ? 'Sound on' : 'Sound off'} data-testid="button-toggle-sound">
            {view.muted ? <VolumeX /> : <Volume2 />} {view.muted ? 'Sound on' : 'Sound off'}
          </button>
          <button className="quiet-button" type="button" onClick={pauseOrResume} disabled={view.phase !== 'playing' && view.phase !== 'paused'} aria-label={view.phase === 'paused' ? 'Resume game' : 'Pause game'} data-testid="button-pause">
            {view.phase === 'paused' ? <Play /> : <Pause />} {view.phase === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button className="quiet-button" type="button" onClick={startGame} aria-label="Restart game" data-testid="button-restart"><RotateCcw /> Restart</button>
        </div>
      </header>
      <section className="game-layout" aria-label="Coin Hero game">
        <div className="play-column">
          <div className="hud-row">
            <div className="hud-chip primary-chip">
              <span className="hud-icon"><KeyRound /></span><span><span className="hud-label">Level</span><strong className="hud-value" data-testid="text-current-level">{String(view.level + 1).padStart(2, '0')}<small> / 04</small></strong></span>
            </div>
            <div className="hud-chip">
              <span className="hud-icon"><Coins /></span><span><span className="hud-label">Is level ke sikke</span><strong className="hud-value" data-testid="text-level-coins">{view.levelCoins}<small> / {level.requirement}</small></strong></span>
            </div>
            <div className="hud-chip">
              <span className="hud-icon"><Zap /></span><span><span className="hud-label">Total jama</span><strong className="hud-value" data-testid="text-total-coins">{String(view.totalCoins).padStart(2, '0')}</strong></span>
            </div>
            <div className="hud-chip">
              <span className="hud-icon"><Heart /></span><span><span className="hud-label">Jaan</span><span className="lives" aria-label={`${view.lives} lives remaining`} data-testid="status-lives">{[0,1,2].map(i => <i key={i} className={`life-dot ${i >= view.lives ? 'lost' : ''}`} />)}</span></span>
            </div>
          </div>
          <div className="game-frame">
            <canvas ref={canvasRef} className="game-canvas" width={W} height={H} aria-label="Coin Hero platform game" data-testid="game-canvas" />
            {view.phase === 'playing' && <div className="game-status" role="status" data-testid="status-message">{view.status}</div>}
            {overlay && <div className="game-overlay">
              <div className="overlay-card" data-testid="panel-game-state">
                <div className="hero-illustration" aria-hidden="true"><svg viewBox="0 0 130 78" fill="none"><path d="m18 66 23-42 16 25 14-20 38 37H18Z" fill="#84b6a2"/><path d="m44 66 20-33 12 18 9-13 29 28H44Z" fill="#4c8f7b"/><circle cx="96" cy="19" r="11" fill="#f6c74d"/><path d="M53 56c0-10 6-17 15-17s15 7 15 17v11H53V56Z" fill="#e77b45"/><circle cx="68" cy="38" r="12" fill="#f4c98a"/><path d="M55 37c1-13 24-15 28-1-9-3-19-2-28 1Z" fill="#334b5d"/><circle cx="72" cy="39" r="1.7" fill="#26394d"/></svg></div>
                <div className="overlay-kicker">{view.phase === 'start' ? 'Taiyaar ho, hero?' : view.phase === 'complete' ? `Level ${view.level + 1} saaf!` : view.phase === 'victory' ? 'Adventure complete' : view.phase === 'paused' ? 'Break time' : view.phase === 'gameover' ? 'Ek aur chance?' : 'Agla level unlock!'}</div>
                <h2 className="overlay-title">{view.phase === 'start' ? 'Sikke bachao. Gate tak jao.' : view.phase === 'complete' ? 'Kamaal kar diya!' : view.phase === 'victory' ? 'Asli Coin Hero!' : view.phase === 'paused' ? 'Game ruki hui hai' : view.phase === 'gameover' ? 'Oops, jaan khatam!' : 'Chalo aage!'}</h2>
                <p className="overlay-copy">{view.phase === 'start' ? 'Har level mein naye sikke, tez dushman aur ek naya raasta. Gate tak pahunchne se pehle mission ke sikke ikattha karo.' : view.phase === 'complete' ? `${view.levelCoins} sikke jama kiye — ab agle adventure ki baari!` : view.phase === 'victory' ? `Chaaron levels paar! Aapne ${view.totalCoins} sikke jama kiye. Shabaash!` : view.phase === 'paused' ? 'Jab ready ho, wahi se shuru karo.' : view.phase === 'gameover' ? 'Dushman aur khaaiyon se bachkar phir se try karo.' : 'Agli duniya mein aur platforms aur dushman intezaar kar rahe hain.'}</p>
                {view.phase === 'start' && <button type="button" className="primary-button" onClick={startGame} data-testid="button-start-game"><Play fill="currentColor" /> Khel shuru karo</button>}
                {view.phase === 'paused' && <button type="button" className="primary-button" onClick={togglePause} data-testid="button-resume-game"><Play fill="currentColor" /> Wapas khelo</button>}
                {(view.phase === 'gameover' || view.phase === 'victory') && <button type="button" className="primary-button" onClick={startGame} data-testid="button-play-again"><RotateCcw /> {view.phase === 'victory' ? 'Phir se khelo' : 'Dobara koshish'}</button>}
                {view.phase === 'complete' && <button type="button" className="primary-button" onClick={nextLevel} data-testid="button-next-level">{view.level === levels.length - 1 ? 'Jeet ka jashn' : 'Agla level'} <ArrowRight /></button>}
                <p className="overlay-hint"><kbd>←</kbd> <kbd>→</kbd> chalo&nbsp;&nbsp; <kbd>Space</kbd> jump&nbsp;&nbsp; <kbd>P</kbd> pause</p>
              </div>
            </div>}
          </div>
          <div className="touch-controls" aria-label="Touch game controls">
            <div className="touch-group">
              <button className={`touch-button ${keysRef.current.arrowleft ? 'pressed' : ''}`} type="button" aria-label="Move left" data-testid="button-touch-left" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onTouch('arrowleft', true); }} onPointerUp={() => onTouch('arrowleft', false)} onPointerCancel={() => onTouch('arrowleft', false)}><ArrowLeft /></button>
              <button className="touch-button" type="button" aria-label="Move right" data-testid="button-touch-right" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onTouch('arrowright', true); }} onPointerUp={() => onTouch('arrowright', false)} onPointerCancel={() => onTouch('arrowright', false)}><ArrowRight /></button>
            </div>
            <button className="touch-button jump-button" type="button" aria-label="Jump" data-testid="button-touch-jump" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onTouch(' ', true); }} onPointerUp={() => onTouch(' ', false)} onPointerCancel={() => onTouch(' ', false)}><Wind /></button>
          </div>
        </div>
        <aside className="side-panel">
          <section className="side-card mission-card" aria-label="Level mission">
            <h2 className="side-heading">Aaj ka mission <span>01 / 03</span></h2>
            <div className="mission-line">
              <span className="mission-coin"><Coins /></span><span className="mission-text">Sikke jama karo<small>Is level mein {level.requirement} chahiye</small></span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
            <div className="progress-caption"><span>Mission progress</span><span data-testid="text-mission-progress">{view.levelCoins} / {level.requirement}</span></div>
          </section>
          <section className="side-card">
            <h2 className="side-heading">Safar ka haal <span>LEVELS</span></h2>
            <div className="level-list" aria-label={`Level ${view.level + 1} of ${levels.length}`} data-testid="status-level-progress">
              {levels.map((item, i) => <i key={item.title} className={`level-marker ${i < view.level ? 'done' : i === view.level ? 'active' : ''}`} title={`Level ${i + 1}: ${item.title}`} />)}
            </div>
            <p className="sidebar-note" data-testid="text-level-name">{level.title} · {view.level + 1} / {levels.length}</p>
          </section>
          <section className="side-card controls-card">
            <h2 className="side-heading">Controls <span>KEYBOARD</span></h2>
            <div className="control-row"><span>Move</span><span className="key-stack"><kbd className="key">←</kbd><kbd className="key">→</kbd></span></div>
            <div className="control-row"><span>Jump</span><kbd className="key">SPACE</kbd></div>
            <div className="control-row"><span>Pause / resume</span><kbd className="key">P</kbd></div>
            <div className="control-row"><span>Restart</span><kbd className="key">R</kbd></div>
          </section>
        </aside>
      </section>
      <footer className="game-footer"><span><strong>Coin Hero 2D</strong> · chhote kadam, badi jeet</span><span>← → / A D move&nbsp;&nbsp; · &nbsp;&nbsp;SPACE jump</span></footer>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Game} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
