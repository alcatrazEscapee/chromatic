import type { Texture, Application, Container, FederatedPointerEvent, Sprite } from 'pixi.js';

import { Util, COLORS } from './util.js';
import { Tile } from './tile.js';
import { Simulator } from './simulator.js';

declare global {
    interface Window {
        game: Game;
    }
}

const enum StateId {
    PLAY = 0,
    SIMULATION = 1,
    VICTORY = 2,
    MENU = 3,
}


class Game {

    readonly app: Application;
    readonly core: AssetMap<Texture>;
    readonly tiles: (Tile | null)[];

    readonly gridContainer: Container;
    readonly tilesContainer: Container;
    readonly edgesContainer: Container;
    readonly heldContainer: Container;
    readonly palettes: PaletteMap<Texture>;

    readonly btnPlay: Sprite;
    readonly btnStop: Sprite;

    readonly simulator: Simulator;

    puzzle: NetworkPuzzle | null = null;
    state: StateId = StateId.PLAY;
    grid: GridId = GridId.DEFAULT;
    heldTile: Tile | null = null;

    constructor(app: Application, core: AssetMap<Texture>) {
        
        this.app = app;
        this.core = core;
        this.tiles = [];

        this.gridContainer = new PIXI.Container();
        this.tilesContainer = new PIXI.Container();
        this.edgesContainer = new PIXI.Container();
        this.heldContainer = new PIXI.Container();

        this.palettes = [
            {
                width: 3,
                tileWidth: 120,
                insideWidth: 38,
                insideLength: 37,
                insideTop: 41,
                grid: core.grid_3x3,
                textures: [
                    core.pipe_empty, core.pipe_straight_120, core.pipe_curve_120, core.pipe_cross_120,
                    core.pipe_mix_120, core.pipe_unmix_120, core.pipe_up_120, core.pipe_down_120,
                    core.pipe_action_120, core.pipe_edge_120,
                ],
            },
            {
                width: 4,
                tileWidth: 90,
                insideWidth: 28,
                insideLength: 28,
                insideTop: 31,
                grid: core.grid_4x4,
                textures: [
                    core.pipe_empty, core.pipe_straight_90, core.pipe_curve_90, core.pipe_cross_90,
                    core.pipe_mix_90, core.pipe_unmix_90, core.pipe_up_90, core.pipe_down_90,
                    core.pipe_action_90, core.pipe_edge_90,
                ],
            },
            {
                width: 5,
                tileWidth: 72,
                insideWidth: 22,
                insideLength: 22,
                insideTop: 25,
                grid: core.grid_5x5,
                textures: [
                    core.pipe_empty, core.pipe_straight_72, core.pipe_curve_72, core.pipe_cross_72,
                    core.pipe_mix_72, core.pipe_unmix_72, core.pipe_up_72, core.pipe_down_72,
                    core.pipe_action_72, core.pipe_edge_72,
                ],
            }
        ]

        this.simulator = new Simulator(this.edgesContainer);

        const ui = new PIXI.Sprite(this.core.play_ui);
        const buttons = new PIXI.Container();

        for (let i = 0; i <= TileId.LAST; i++) {
            const tileId: TileId = i;
            const btn = new PIXI.Sprite();

            btn.hitArea = new PIXI.Rectangle(10 + (i % 4) * 80, 438 + Math.floor(i / 4) * 80, 72, 72);
            btn.eventMode = 'static';
            btn.on('pointerdown', event => this.grabTile(event, tileId));
            
            buttons.addChild(btn);
        }

        this.btnPlay = new PIXI.Sprite(this.core.ui_btn_play);
        this.btnPlay.position.set(333, 438);
        this.btnPlay.eventMode = 'static';
        this.btnPlay.on('pointertap', event => this.onPlay(event));
        buttons.addChild(this.btnPlay);

        this.btnStop = new PIXI.Sprite(this.core.ui_btn_stop);
        this.btnStop.position.set(364, 440);
        this.btnStop.eventMode = 'static';
        this.btnStop.alpha = 0.5;
        this.btnStop.on('pointertap', event => this.onStop(event));
        buttons.addChild(this.btnStop);

        const stage = this.app.stage;

        stage.addChild(ui);
        stage.addChild(this.gridContainer);
        stage.addChild(buttons);
        stage.addChild(this.tilesContainer);
        stage.addChild(this.edgesContainer);
        stage.addChild(this.heldContainer);

        stage.eventMode = 'static';
        stage.on('pointertap', event => this.rotateTile(event));
        stage.on('pointerup', event => this.dropTile(event));
        stage.on('pointermove', event => this.move(event));
    }

    /**
     * Initializes per-puzzle data
     */
    public init(puzzle: NetworkPuzzle): void {
        this.grid = puzzle.size;

        const palette: TexturePalette<Texture> = this.palettes[this.grid];

        const grid = new PIXI.Sprite(palette.grid);
        grid.position.set(Constants.GRID_LEFT, Constants.GRID_TOP);

        if (this.gridContainer.children) {
            this.gridContainer.children[0]?.destroy();
        }
        this.gridContainer.addChild(grid);

        (this as Mutable<Game>).tiles = [];
        for (let i = 0; i < palette.width * palette.width; i++) {
            this.tiles.push(null);
        }

        for (const [x, y, dir, color, pressure] of puzzle.inputs) {
            const edge = new PIXI.Container();
            const edgePipe = new PIXI.Sprite(palette.textures[TileId.EDGE]);
            
            edgePipe.anchor.set(0.5);

            const edgeColor = new PIXI.Graphics();

            // Arrow facing left, i.e. '<'
            edgeColor.beginFill(COLORS[color]);
            edgeColor.moveTo(10, -palette.insideWidth / 2);
            edgeColor.lineTo(10, palette.insideWidth / 2);
            edgeColor.lineTo(-10 + 1, 0);
            edgeColor.lineTo(10, -palette.insideWidth / 2);
            edgeColor.endFill();


            edge.addChild(edgeColor);
            edge.addChild(edgePipe);

            const pos = Util.getInputPos(palette, x, y, dir);
            edge.position.set(pos.x, pos.y);
            edge.angle = 90 * dir;

            this.edgesContainer.addChild(edge);
        }

        for (const [x, y, dir, color, pressure] of puzzle.outputs) {
            const edge = new PIXI.Container();
            const edgePipe = new PIXI.Sprite(palette.textures[TileId.EDGE]);

            edgePipe.anchor.set(0.5);

            const edgeColor = new PIXI.Graphics();

            // Arrow facing left, i.e. '<'
            edgeColor.beginFill(COLORS[color]);
            edgeColor.moveTo(10 - 1, -palette.insideWidth / 2);
            edgeColor.lineTo(10 - 1, palette.insideWidth / 2);
            edgeColor.lineTo(-10, 0);
            edgeColor.lineTo(10 - 1, -palette.insideWidth / 2);
            edgeColor.endFill();

            edge.addChild(edgeColor);
            edge.addChild(edgePipe);

            const pos = Util.getOutputPos(palette, x, y, dir);
            edge.position.set(pos.x, pos.y);
            edge.angle = 90 * dir;

            this.edgesContainer.addChild(edge);
        }

        this.puzzle = puzzle;
    }

    private move(event: FederatedPointerEvent): void {
        if (this.heldTile) {
            const held = this.heldContainer.children[0]!;
            held.x = event.screenX;
            held.y = event.screenY;
        }
    }

    private grabTile(event: FederatedPointerEvent, tileId: TileId): void {
        if (this.state == StateId.PLAY && !this.heldTile) {
            this.heldTile = new Tile(this.palettes[Constants.HELD_TILE_GRID_ID], tileId);
            this.heldTile.root.position.set(event.screenX, event.screenY);

            this.heldContainer.addChild(this.heldTile.root);
        }
    }

    private dropTile(event: FederatedPointerEvent): void {
        if (this.heldTile) {
            const heldTile: Tile = this.heldTile;

            if (Util.isIn(event.screenX, event.screenY, Constants.GRID_LEFT, Constants.GRID_TOP, Constants.GRID_SIZE)) {
                const palette = this.palettes[this.grid];
                const tileX: number = Math.floor((event.screenX - Constants.GRID_LEFT) / palette.tileWidth);
                const tileY: number = Math.floor((event.screenY - Constants.GRID_TOP) / palette.tileWidth);
                const tileIndex: number = tileX + palette.width * tileY;

                // Replace the previous tile, if it exists
                const prevTile = this.tiles[tileIndex]!;
                if (prevTile !== null) {
                    this.tiles[tileIndex] = null;
                    prevTile.destroy();
                }

                // Add a new tile, if we're not creating an empty tile
                if (heldTile.tileId != TileId.EMPTY) {
                    const newTile = new Tile(palette, heldTile.tileId);
                    
                    newTile.root.position.set(
                        Constants.GRID_LEFT + tileX * palette.tileWidth + palette.tileWidth / 2,
                        Constants.GRID_TOP + tileY * palette.tileWidth + palette.tileWidth / 2);
                    
                    this.tiles[tileIndex] = newTile;
                    this.tilesContainer.addChild(newTile.root);
                }
            }

            this.heldTile = null;
            heldTile.destroy();
        }
    }

    private rotateTile(event: FederatedPointerEvent): void {
        if (this.state == StateId.PLAY &&
            !this.heldTile &&
            Util.isIn(event.screenX, event.screenY, Constants.GRID_LEFT, Constants.GRID_TOP, Constants.GRID_SIZE)) {
            const palette = this.palettes[this.grid];

            const tileX: number = Math.floor((event.screenX - Constants.GRID_LEFT) / palette.tileWidth);
            const tileY: number = Math.floor((event.screenY - Constants.GRID_TOP) / palette.tileWidth);
            const tileIndex: number = tileX + palette.width * tileY;

            const tile = this.tiles[tileIndex]!;
            if (tile !== null) {
                tile.rotate();
            }
        }
    }

    private onPlay(event: FederatedPointerEvent): void {
        if (this.state == StateId.PLAY) {
            this.btnPlay.alpha = 0.5;
            this.btnStop.alpha = 1.0;

            this.state = StateId.SIMULATION;
            this.simulator.init(this.palettes[this.grid], this.puzzle!);
            PIXI.Ticker.shared.add(this.onSimulatorTick, this);
        }
    }

    private onStop(event: FederatedPointerEvent): void {
        if (this.state == StateId.SIMULATION) {
            this.btnPlay.alpha = 1.0;
            this.btnStop.alpha = 0.5;

            this.state = StateId.PLAY;
            this.simulator.reset();
            PIXI.Ticker.shared.remove(this.onSimulatorTick, this);

            // Remove all flows from all tiles if simulation is stopped
            for (const tile of this.tiles) {
                tile?.clearFlow();
            }
        }
    }

    private onSimulatorTick(delta: number): void {
        this.simulator.tick(delta, this.palettes[this.grid], this.tiles);
    }
}


async function main() {

    // Settings
    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
    PIXI.settings.RESOLUTION = devicePixelRatio;

    // Load Assets
    const coreManifest: {[key in AssetId]: AssetUrl<key>} = {
        puzzles: 'lib/puzzles.json',

        play_ui: 'art/play_ui.png',

        ui_btn_play: 'art/ui_btn_play.png',
        ui_btn_stop: 'art/ui_btn_stop.png',

        grid_3x3: 'art/grid_3x3.png',
        grid_4x4: 'art/grid_4x4.png',
        grid_5x5: 'art/grid_5x5.png',

        pipe_empty: 'art/pipe_empty.png',
        
        pipe_edge_72: 'art/pipe_edge_72.png',
        pipe_straight_72: 'art/pipe_straight_72.png',
        pipe_curve_72: 'art/pipe_curve_72.png',
        pipe_cross_72: 'art/pipe_cross_72.png',
        pipe_mix_72: 'art/pipe_mix_72.png',
        pipe_unmix_72: 'art/pipe_unmix_72.png',
        pipe_up_72: 'art/pipe_up_72.png',
        pipe_down_72: 'art/pipe_down_72.png',
        pipe_action_72: 'art/pipe_action_72.png',
        
        pipe_edge_90: 'art/pipe_edge_90.png',
        pipe_straight_90: 'art/pipe_straight_90.png',
        pipe_curve_90: 'art/pipe_curve_90.png',
        pipe_cross_90: 'art/pipe_cross_90.png',
        pipe_mix_90: 'art/pipe_mix_90.png',
        pipe_unmix_90: 'art/pipe_unmix_90.png',
        pipe_up_90: 'art/pipe_up_90.png',
        pipe_down_90: 'art/pipe_down_90.png',
        pipe_action_90: 'art/pipe_action_90.png',

        pipe_edge_120: 'art/pipe_edge_120.png',
        pipe_straight_120: 'art/pipe_straight_120.png',
        pipe_curve_120: 'art/pipe_curve_120.png',
        pipe_cross_120: 'art/pipe_cross_120.png',
        pipe_mix_120: 'art/pipe_mix_120.png',
        pipe_unmix_120: 'art/pipe_unmix_120.png',
        pipe_up_120: 'art/pipe_up_120.png',
        pipe_down_120: 'art/pipe_down_120.png',
        pipe_action_120: 'art/pipe_action_120.png',
    }
    PIXI.Assets.addBundle('core', coreManifest);

    // Initialize loading bar
    const bar = new PIXI.Graphics();
    bar.lineStyle(2, Constants.COLOR_WHITE);
    bar.drawRect(50, 225, Constants.STAGE_WIDTH - 100, 25);

    const progress = new PIXI.Graphics();
    progress.position.set(50 + 2, 225 + 2);
    progress.beginFill(Constants.COLOR_GREEN);
    progress.drawRect(0, 0, Constants.STAGE_WIDTH - 100 - 2, 25 - 4);
    progress.width = 0;

    const app = new PIXI.Application({
        background: '#000',
        width: Constants.STAGE_WIDTH,
        height: Constants.STAGE_HEIGHT,
        view: document.getElementById('main-canvas') as HTMLCanvasElement,
    });

    app.stage.addChild(progress);
    app.stage.addChild(bar);

    const core: AssetMap<Texture> = await PIXI.Assets.loadBundle('core', pct => {
        progress.width = (Constants.STAGE_WIDTH - 100 - 2) * pct;
    });

    app.stage.removeChild(bar, progress);
    bar.destroy();
    progress.destroy();

    const ALL_INPUTS_3x3: NetworkPuzzle = {
        size: GridId._3x3,
        inputs: [
            [0, 0, DirectionId.DOWN, ColorId.RED, 0],
            [1, 0, DirectionId.DOWN, ColorId.BLUE, 0],
            [2, 0, DirectionId.DOWN, ColorId.YELLOW, 0],
            [2, 0, DirectionId.LEFT, ColorId.GREEN, 0],
            [2, 1, DirectionId.LEFT, ColorId.ORANGE, 0],
            [2, 2, DirectionId.LEFT, ColorId.PURPLE, 0],
            [2, 2, DirectionId.UP, ColorId.LIME, 0],
            [1, 2, DirectionId.UP, ColorId.CYAN, 0],
            [0, 2, DirectionId.UP, ColorId.AMBER, 0],
            [0, 2, DirectionId.RIGHT, ColorId.GOLD, 0],
            [0, 1, DirectionId.RIGHT, ColorId.MAGENTA, 0],
            [0, 0, DirectionId.RIGHT, ColorId.VIOLET, 0],
        ],
        outputs: []
    };

    const ALL_OUTPUTS_3x3: NetworkPuzzle = {
        size: GridId._3x3,
        inputs: [],
        outputs: [
            [0, 3, DirectionId.DOWN, ColorId.RED, 0],
            [1, 3, DirectionId.DOWN, ColorId.BLUE, 0],
            [2, 3, DirectionId.DOWN, ColorId.YELLOW, 0],
            [-1, 0, DirectionId.LEFT, ColorId.GREEN, 0],
            [-1, 1, DirectionId.LEFT, ColorId.ORANGE, 0],
            [-1, 2, DirectionId.LEFT, ColorId.PURPLE, 0],
            [2, -1, DirectionId.UP, ColorId.LIME, 0],
            [1, -1, DirectionId.UP, ColorId.CYAN, 0],
            [0, -1, DirectionId.UP, ColorId.AMBER, 0],
            [3, 2, DirectionId.RIGHT, ColorId.GOLD, 0],
            [3, 1, DirectionId.RIGHT, ColorId.MAGENTA, 0],
            [3, 0, DirectionId.RIGHT, ColorId.VIOLET, 0],
        ],
    };

    const ALL_STRAIGHT_3x3: NetworkPuzzle = {
        size: GridId._3x3,
        inputs: [
            [0, 0, DirectionId.DOWN, ColorId.RED, 0],
            [1, 0, DirectionId.DOWN, ColorId.BLUE, 0],
            [2, 2, DirectionId.LEFT, ColorId.PURPLE, 0],
            [2, 2, DirectionId.UP, ColorId.LIME, 0],
            [0, 1, DirectionId.RIGHT, ColorId.MAGENTA, 0],
            [0, 0, DirectionId.RIGHT, ColorId.VIOLET, 0],
        ],
        outputs: [
            [0, 3, DirectionId.DOWN, ColorId.RED, 0],
            [1, 3, DirectionId.DOWN, ColorId.BLUE, 0],
            [-1, 2, DirectionId.LEFT, ColorId.PURPLE, 0],
            [2, -1, DirectionId.UP, ColorId.LIME, 0],
            [3, 1, DirectionId.RIGHT, ColorId.MAGENTA, 0],
            [3, 0, DirectionId.RIGHT, ColorId.VIOLET, 0],
        ],
    };

    window.game = new Game(app, core);
    window.game.init(ALL_STRAIGHT_3x3);
}

window.onload = () => main();