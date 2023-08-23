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
    PLAY,
    DRAGGING_TILE,
    CONFIGURE_TILE,
    DRAGGING_COLOR,
    SIMULATION,
    VICTORY,
    MENU,
}


class Game {

    readonly app: Application;
    readonly core: AssetMap<Texture>;
    readonly tiles: (Tile | null)[];

    // UI Layer (background display)
    readonly gridContainer: Container; // The NxN grid, which is puzzle-dependent
    readonly buttonsContainer: Container; // All tile buttons, start, stop, etc.)
    readonly tilesContainer: Container; // All placed tiles
    readonly edgesContainer: Container; // All input / output edges. Also holds input / output flows, added by the simulator
    readonly topContainer: Container; // Top layer (held sprite, things that need to be fully top level)

    readonly tileButtonsContainer: Container; // The buttons for picking up + dragging each tile
    readonly colorButtonsContainer: Container; // The buttons for selecting a color for the unmix configuration

    readonly palettes: PaletteMap<Texture>;

    readonly btnPlay: Sprite;
    readonly btnStop: Sprite;

    readonly simulator: Simulator;

    puzzle: NetworkPuzzle | null = null;
    state: StateId = StateId.PLAY;
    grid: GridId = GridId.DEFAULT;

    held: Tile | null = null;
    heldColor: Sprite | null = null;

    cfgWaitHandle: NodeJS.Timeout | null = null;
    cfgIndex: number = 0;

    // The last recorded screenX / screenY of the mouse, from mouse move event
    screenX: number = 0;
    screenY: number = 0;

    // If `true`, the next tap on the stage will by ignored
    bypassNextTap: boolean = false;;

    constructor(app: Application, core: AssetMap<Texture>) {
        
        this.app = app;
        this.core = core;
        this.tiles = [];

        this.gridContainer = new PIXI.Container();
        this.buttonsContainer = new PIXI.Container();
        this.tilesContainer = new PIXI.Container();
        this.edgesContainer = new PIXI.Container();
        this.topContainer = new PIXI.Container();

        this.tileButtonsContainer = new PIXI.Container();
        this.colorButtonsContainer = new PIXI.Container();

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

        const tileButtonTextures = [core.ui_btn_pipe_empty, core.ui_btn_pipe_straight, core.ui_btn_pipe_curve, core.ui_btn_pipe_cross, core.ui_btn_pipe_mix, core.ui_btn_pipe_unmix, core.ui_btn_pipe_up, core.ui_btn_pipe_down];
        for (let i = 0; i <= TileId.LAST; i++) {
            const tileId: TileId = i;
            const btn = new PIXI.Sprite(tileButtonTextures[i]);

            btn.position.set(10 + (i % 4) * 66, 438 + Math.floor(i / 4) * 66);
            btn.eventMode = 'static';
            btn.on('pointerdown', event => this.grabTile(event, tileId));
            
            this.tileButtonsContainer.addChild(btn);
        }

        for (let i = 0; i <= ColorId.last; i++) {
            const color: ColorId = i;
            const btn = new PIXI.Graphics();
            const offset = color == ColorId.BROWN ? 7
                : color < ColorId.BROWN ? i : i + 2;

            btn.beginFill(COLORS[color]);
            btn.drawCircle(0, 0, 12);
            btn.position.set(22 + Math.floor(offset / 3) * 40, 460 + (offset % 3) * 40);

            btn.eventMode = 'static';
            btn.on('pointerdown', event => this.grabColor(event, color));

            this.colorButtonsContainer.addChild(btn);
        }

        this.btnPlay = new PIXI.Sprite(this.core.ui_btn_play);
        this.btnPlay.position.set(330, 438);
        this.btnPlay.eventMode = 'static';
        this.btnPlay.on('pointertap', event => this.onPlay(event));
        this.buttonsContainer.addChild(this.btnPlay);

        this.btnStop = new PIXI.Sprite(this.core.ui_btn_stop);
        this.btnStop.position.set(361, 440);
        this.btnStop.eventMode = 'static';
        this.btnStop.alpha = 0.5;
        this.btnStop.on('pointertap', event => this.onStop(event));
        this.buttonsContainer.addChild(this.btnStop);

        const stage = this.app.stage;

        // Default with tile buttons visible
        this.buttonsContainer.addChild(this.tileButtonsContainer);

        stage.addChild(ui);
        stage.addChild(this.gridContainer);
        stage.addChild(this.buttonsContainer);
        stage.addChild(this.tilesContainer);
        stage.addChild(this.edgesContainer);
        stage.addChild(this.topContainer);

        stage.eventMode = 'static';
        stage.on('pointertap', event => this.onPointerTap(event));
        stage.on('pointerdown', event => this.onPointerDown(event));
        stage.on('pointerup', event => this.onPointerUp(event));
        stage.on('pointermove', event => this.onPointerMove(event));
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

        for (const [x, y, dir, color, _] of puzzle.inputs) {
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

        for (const [x, y, dir, color, _] of puzzle.outputs) {
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

    private grabTile(event: FederatedPointerEvent, tileId: TileId): void {
        if (this.state == StateId.PLAY) {
            this.held = new Tile(this.palettes[Constants.HELD_TILE_GRID_ID], tileId);
            this.held.root.position.set(event.screenX, event.screenY);
            this.state = StateId.DRAGGING_TILE;

            this.topContainer.addChild(this.held.root);
        }
    }

    private grabColor(event: FederatedPointerEvent, color: ColorId): void {
        if (this.state === StateId.CONFIGURE_TILE) {
            this.heldColor = new PIXI.Sprite(this.core.ui_btn_stop);
            this.state = StateId.DRAGGING_COLOR;

            this.topContainer.addChild(this.heldColor);
        }
    }

    private onPointerMove(event: FederatedPointerEvent): void {
        this.screenX = event.screenX;
        this.screenY = event.screenY;

        // Update the position of the held object
        if (this.held) {
            this.held.root.position.set(event.screenX, event.screenY);
        }
        if (this.heldColor) {
            this.heldColor.position.set(event.screenX, event.screenY);
        }
    }

    private onPointerDown(event: FederatedPointerEvent): void {
        // Clear any previous handle
        if (this.cfgWaitHandle !== null) {
            clearTimeout(this.cfgWaitHandle);
            this.cfgWaitHandle = null;
        }

        if (this.state == StateId.PLAY && this.isInGrid(event)) {
            // Detect if we have a long tap on a action tile which supports configuration
            const pos = this.projectToGrid(event);
            const tile: Tile | null = this.tiles[pos.index]!;
            
            if (tile !== null && (tile.tileId == TileId.UNMIX || tile.tileId == TileId.DOWN)) {
                this.cfgWaitHandle = setTimeout(() => this.onPointerHeld(), Constants.POINTER_HOLD_MS);
                this.cfgIndex = pos.index;
            }
        }
    }

    private onPointerHeld(): void {
        this.cfgWaitHandle = null; // Clear any handles

        if (this.state == StateId.PLAY && this.isInGrid(this)) {
            const pos = this.projectToGrid(this);

            if (pos.index === this.cfgIndex) { // If we are on the same tile we started holding on, then start configuring
                this.enterCfg();
                this.state = StateId.CONFIGURE_TILE;
                this.bypassNextTap = true;
            }
        }
    }

    private onPointerUp(event: FederatedPointerEvent): void {
        if (this.state === StateId.DRAGGING_TILE) {
            const heldTile: Tile = this.held!;

            let placedTileHasCfg = false;
            if (this.isInGrid(event)) {
                const palette = this.palettes[this.grid];
                const pos = this.projectToGrid(event);

                // Replace the previous tile, if it exists
                const prevTile = this.tiles[pos.index]!;
                if (prevTile !== null) {
                    this.tiles[pos.index] = null;
                    prevTile.destroy();
                }

                // Add a new tile, if we're not creating an empty tile
                if (heldTile.tileId != TileId.EMPTY) {
                    const newTile = new Tile(palette, heldTile.tileId);
                    
                    newTile.root.position.set(
                        Constants.GRID_LEFT + pos.x * palette.tileWidth + palette.tileWidth / 2,
                        Constants.GRID_TOP + pos.y * palette.tileWidth + palette.tileWidth / 2);
                    
                    this.tiles[pos.index] = newTile;
                    this.tilesContainer.addChild(newTile.root);

                    placedTileHasCfg = newTile.tileId === TileId.UNMIX || newTile.tileId === TileId.DOWN;
                }
            }

            this.held = null;
            this.state = StateId.PLAY;
            this.bypassNextTap = true; // Don't rotate the tile immediately

            heldTile.destroy();

            // If we just placed a new tile requiring configuration, then jump straight to the cfg UI
            if (placedTileHasCfg) {
                this.enterCfg();
                this.state = StateId.CONFIGURE_TILE;
            } 
        }
    }

    private onPointerTap(event: FederatedPointerEvent): void {
        if (this.bypassNextTap) {
            this.bypassNextTap = false;
            return;
        }

        if (this.state == StateId.PLAY && this.isInGrid(event)) {
            const pos = this.projectToGrid(event);
            const tile: Tile | null = this.tiles[pos.index]!;

            if (tile !== null) {
                tile.rotate();
            }
        }

        if (this.state == StateId.CONFIGURE_TILE) {
            // If we tap elsewhere on the stage while configuring a tile, then it's done
            this.state = StateId.PLAY;
            this.leaveCfg();
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

    private enterCfg(): void {
        const root: Container = new PIXI.Container();

        // Add an overlay at 80% opacity over the rest
        const overlay = new PIXI.Graphics();
        overlay.beginFill('#000');
        overlay.drawRect(0, 0, 400, 400);
        overlay.alpha = 0.8;

        root.addChild(overlay);

        this.topContainer.addChild(root);

        // Switch out buttons
        this.buttonsContainer.removeChild(this.tileButtonsContainer);
        this.buttonsContainer.addChild(this.colorButtonsContainer);
    }

    private leaveCfg(): void {
        // Remove the overlay
        this.topContainer.children[0]?.destroy();

        // Switch out buttons
        this.buttonsContainer.removeChild(this.colorButtonsContainer);
        this.buttonsContainer.addChild(this.tileButtonsContainer);
    }

    private onSimulatorTick(delta: number): void {
        this.simulator.tick(delta, this.palettes[this.grid], this.tiles);
    }

    /** Returns true if the given position is within the grid */
    private isInGrid(event: { screenX: number, screenY: number }): boolean {
        return Util.isIn(event.screenX, event.screenY, Constants.GRID_LEFT, Constants.GRID_TOP, Constants.GRID_SIZE);
    }

    /** If a point is `isInGrid()`, then this returns the tile X, Y coordinates for that point. */
    private projectToGrid(event: { screenX: number, screenY: number }): Point & { index: number } {
        const palette = this.palettes[this.grid];
        const x: number = Math.floor((event.screenX - Constants.GRID_LEFT) / palette.tileWidth);
        const y: number = Math.floor((event.screenY - Constants.GRID_TOP) / palette.tileWidth);
        const index: number = x + palette.width * y;
        
        return { x, y, index };
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

        ui_btn_pipe_empty: 'art/ui_btn_pipe_empty.png',
        ui_btn_pipe_straight: 'art/ui_btn_pipe_straight.png',
        ui_btn_pipe_curve: 'art/ui_btn_pipe_curve.png',
        ui_btn_pipe_cross: 'art/ui_btn_pipe_cross.png',
        ui_btn_pipe_mix: 'art/ui_btn_pipe_mix.png',
        ui_btn_pipe_unmix: 'art/ui_btn_pipe_unmix.png',
        ui_btn_pipe_up: 'art/ui_btn_pipe_up.png',
        ui_btn_pipe_down: 'art/ui_btn_pipe_down.png',

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
        id: -1,
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
        id: -2,
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
        id: -3,
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
    window.game.init(core.puzzles.puzzles[16+16+16+16+15]!);
}

window.onload = () => main();