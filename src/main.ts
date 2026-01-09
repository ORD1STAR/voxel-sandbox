import './style.css';
import { Game } from './engine/Game';
import { StartScreen } from './ui/StartScreen';

const canvas = document.querySelector<HTMLCanvasElement>('#c')!;
const startEl = document.querySelector<HTMLDivElement>('#startScreen')!;
const inventoryEl = document.querySelector<HTMLDivElement>('#inventory')!;
const debugEl = document.querySelector<HTMLDivElement>('#debug')!;
const healthEl = document.querySelector<HTMLDivElement>('#health')!;
const hotbarEl = document.querySelector<HTMLDivElement>('#hotbar')!;

const game = new Game(canvas, { debugEl, inventoryEl, healthEl, hotbarEl });

const start = new StartScreen(startEl, game);
start.init();
