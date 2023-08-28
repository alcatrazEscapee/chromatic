import type { Texture, Application, Container, FederatedPointerEvent, Sprite, Color, Graphics } from 'pixi.js';

import { ColorId, Constants, DirectionId, GridId, NetworkPuzzle, TileId } from './constants.js';
import { Util, COLORS } from './util.js';
import { Tile } from './tile.js';
import { Simulator } from './simulator.js';
import { Navigator } from './navigator.js';

declare global {
    interface Window {
        game: Game;
    }
}

const enum StateId {
    UNLOADED,
    MAIN_TILE,
    MAIN_CONFIGURE,
    DRAGGING_TILE,
    DRAGGING_COLOR,
    DRAGGING_PRESSURE,
    SIMULATION,
    VICTORY,
    MENU,
}


class Game {

    readonly app: Application;
    readonly core: AssetBundle<Texture>;
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
    state: StateId = StateId.UNLOADED;
    tabState: StateId.MAIN_CONFIGURE | StateId.MAIN_TILE = StateId.MAIN_TILE;
    grid: GridId = GridId.default;

    heldTile: { root: Sprite, tileId: TileId } | null = null;
    heldColor: { root: Graphics, colorId: ColorId } | null = null;

    // The last recorded screenX / screenY of the mouse, from mouse move event
    screenX: number = 0;
    screenY: number = 0;

    // If `true`, the next tap on the stage will by ignored
    bypassNextTap: boolean = false;

    constructor(app: Application, core: AssetBundle<Texture>) {
        
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
                pressureWidth: 5,
                pipeWidth: 4,
                insideWidth: 18,
                insideTop: 51,
                portWidth: 27,
                grid: core.grid_3x3,
                textures: Util.buildPalette('pipe_120', core.pipe_120),
            },
            {
                width: 4,
                tileWidth: 90,
                pressureWidth: 4,
                pipeWidth: 4,
                insideWidth: 12,
                insideTop: 39,
                portWidth: 20,
                grid: core.grid_4x4,
                textures: Util.buildPalette('pipe_90', core.pipe_90),
            },
            {
                width: 5,
                tileWidth: 72,
                pressureWidth: 3,
                pipeWidth: 5,
                insideWidth: 10,
                insideTop: 31,
                portWidth: 16,
                grid: core.grid_5x5,
                textures: Util.buildPalette('pipe_72', core.pipe_72),
            }
        ];

        this.simulator = new Simulator(this.edgesContainer);

        const ui = new PIXI.Sprite(this.core.ui_background);

        const tileButtonTextures = [core.ui_btn_pipe_empty, core.ui_btn_pipe_straight, core.ui_btn_pipe_curve, core.ui_btn_pipe_cross, core.ui_btn_pipe_mix, core.ui_btn_pipe_unmix, core.ui_btn_pipe_up, core.ui_btn_pipe_down];
        for (let i = 0; i <= TileId.last; i++) {
            const tileId: TileId = i;
            const texture: Texture = tileButtonTextures[i]!;
            const btn = new PIXI.Sprite(texture);

            btn.position.set(10 + (i % 4) * 66, 438 + Math.floor(i / 4) * 66);
            btn.eventMode = 'static';
            btn.on('pointerdown', event => this.grabTile(event, tileId, texture));
            
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

        const btnTabTop = new PIXI.Sprite();
        const btnTabBot = new PIXI.Sprite();

        btnTabTop.hitArea = new PIXI.Rectangle(275, 431, 22, 70);
        btnTabTop.eventMode = 'static';
        btnTabTop.on('pointertap', event => this.onTabTop(event));

        btnTabBot.hitArea = new PIXI.Rectangle(275, 431 + 70, 22, 70);
        btnTabBot.eventMode = 'static';
        btnTabBot.on('pointertap', event => this.onTabBot(event));

        this.buttonsContainer.addChild(btnTabTop);
        this.buttonsContainer.addChild(btnTabBot);

        // Default with tile buttons visible
        this.buttonsContainer.addChild(this.tileButtonsContainer);

        const stage = this.app.stage;

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

        this.gridContainer.addChild(grid);

        for (let i = 0; i < palette.width * palette.width; i++) {
            this.tiles.push(null);
        }

        for (const [x, y, dir, color, pressure] of puzzle.inputs) {
            const edge = new PIXI.Container();
            const edgePipe = new PIXI.Sprite(palette.textures.edge[pressure - 1]);
            
            edgePipe.anchor.set(0.5);

            const edgeColor = new PIXI.Graphics();
            const insideWidth = Util.insideWidth(palette, pressure);

            // Arrow facing left, i.e. '<'
            edgeColor.beginFill(COLORS[color]);
            edgeColor.moveTo(10, -insideWidth / 2);
            edgeColor.lineTo(10, insideWidth / 2);
            edgeColor.lineTo(-10 + 1, 0);
            edgeColor.lineTo(10, -insideWidth / 2);
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
            const edgePipe = new PIXI.Sprite(palette.textures.edge[pressure - 1]);

            edgePipe.anchor.set(0.5);

            const edgeColor = new PIXI.Graphics();
            const insideWidth = Util.insideWidth(palette, pressure);

            // Arrow facing left, i.e. '<'
            // Arrow uses inside width for pressure = 1 always
            edgeColor.beginFill(COLORS[color]);
            edgeColor.moveTo(10 - 1, -insideWidth / 2);
            edgeColor.lineTo(10 - 1, insideWidth / 2);
            edgeColor.lineTo(-10, 0);
            edgeColor.lineTo(10 - 1, -insideWidth / 2);
            edgeColor.endFill();

            edge.addChild(edgeColor);
            edge.addChild(edgePipe);

            const pos = Util.getOutputPos(palette, x, y, dir);
            edge.position.set(pos.x, pos.y);
            edge.angle = 90 * dir;

            this.edgesContainer.addChild(edge);
        }

        this.puzzle = puzzle;
        this.state = this.tabState;
    }

    /**
     * Removes all puzzle-specific data, prepared for a new call to `init()` with a new puzzle
     */
    public teardown(): void {

        Util.clear(this.tilesContainer);
        Util.clear(this.gridContainer);
        Util.clear(this.edgesContainer);

        (this as Mutable<Game>).tiles = [];

        this.puzzle = null;
        this.state = StateId.UNLOADED;
    }

    private grabTile(event: FederatedPointerEvent, tileId: TileId, texture: Texture): void {
        if (this.state == StateId.MAIN_TILE) {
            this.heldTile = {
                root: new PIXI.Sprite(texture),
                tileId,
            };

            this.heldTile.root.anchor.set(0.5);
            this.heldTile.root.position.set(event.screenX, event.screenY);
            this.state = StateId.DRAGGING_TILE;

            this.topContainer.addChild(this.heldTile.root);
        }
    }

    private grabColor(event: FederatedPointerEvent, colorId: ColorId): void {
        if (this.state === StateId.MAIN_CONFIGURE) {
            const root = new PIXI.Graphics();

            root.beginFill(COLORS[colorId]);
            root.drawCircle(0, 0, 12);
            root.position.set(event.screenX, event.screenY);

            this.heldColor = { root, colorId };
            this.state = StateId.DRAGGING_COLOR;

            this.topContainer.addChild(this.heldColor.root);
        }
    }

    private onPointerMove(event: FederatedPointerEvent): void {
        this.screenX = event.screenX;
        this.screenY = event.screenY;

        // Update the position of the held object(s)
        this.heldTile?.root.position.set(event.screenX, event.screenY);
        this.heldColor?.root.position.set(event.screenX, event.screenY);
    }

    private onPointerDown(_: FederatedPointerEvent): void {
        
    }

    private onPointerUp(event: FederatedPointerEvent): void {
        if (this.state === StateId.DRAGGING_TILE) {
            const heldTile = this.heldTile!;

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
                if (heldTile.tileId !== TileId.EMPTY) {
                    const newTile = new Tile(heldTile.tileId);
                    
                    newTile.root.position.set(
                        Constants.GRID_LEFT + pos.x * palette.tileWidth + palette.tileWidth / 2,
                        Constants.GRID_TOP + pos.y * palette.tileWidth + palette.tileWidth / 2);
                    
                    this.tiles[pos.index] = newTile;
                    this.tilesContainer.addChild(newTile.root);

                    Navigator.updateTile(this, pos, newTile);
                }
            }

            this.heldTile = null;
            this.state = StateId.MAIN_TILE;
            this.bypassNextTap = true; // Don't rotate the tile immediately

            heldTile.root.destroy();
        } else if (this.state === StateId.DRAGGING_COLOR) {
            const heldColor = this.heldColor!;

            if (this.isInGrid(event)) {
                const pos = this.projectToGrid(event);
                const tile = this.tiles[pos.index]!;

                if (tile !== null) {
                    // todo: target individual sections of multipart tiles
                    const key = 0;

                    tile.property(key).color = heldColor.colorId;
                    
                    // Applies the update to not only this tile, but all connecting tiles
                    Navigator.updateFrom(this, pos, tile);
                }
            }

            this.heldColor = null;
            this.state = StateId.MAIN_CONFIGURE;
            this.bypassNextTap = true;

            heldColor.root.destroy();
        }
    }

    private onPointerTap(event: FederatedPointerEvent): void {
        if (this.bypassNextTap) {
            this.bypassNextTap = false;
            return;
        }

        if ((this.state === StateId.MAIN_TILE || this.state === StateId.MAIN_CONFIGURE) && this.isInGrid(event)) {
            const pos = this.projectToGrid(event);
            const tile: Tile | null = this.tiles[pos.index]!;

            if (tile !== null) {
                tile.rotate();

                Navigator.updateTile(this, pos, tile);
            }
        }
    }

    private onPlay(_: FederatedPointerEvent): void {
        if (this.state === StateId.MAIN_TILE || this.state === StateId.MAIN_CONFIGURE) {
            this.btnPlay.alpha = 0.5;
            this.btnStop.alpha = 1.0;

            this.state = StateId.SIMULATION;
            this.simulator.init(this.palettes[this.grid], this.puzzle!);
            PIXI.Ticker.shared.add(this.onSimulatorTick, this);
        }
    }

    private onStop(_: FederatedPointerEvent): void {
        if (this.state === StateId.SIMULATION) {
            this.btnPlay.alpha = 1.0;
            this.btnStop.alpha = 0.5;

            this.state = this.tabState;
            this.simulator.reset();
            PIXI.Ticker.shared.remove(this.onSimulatorTick, this);

            // Remove all flows from all tiles if simulation is stopped
            for (const tile of this.tiles) {
                tile?.clearFlow();
            }
        }
    }

    private onTabTop(_: FederatedPointerEvent): void {
        if (this.state === StateId.MAIN_CONFIGURE) {
            this.state = this.tabState = StateId.MAIN_TILE;
            
            // Switch out buttons
            this.buttonsContainer.removeChild(this.colorButtonsContainer);
            this.buttonsContainer.addChild(this.tileButtonsContainer);
        }
    }

    private onTabBot(_: FederatedPointerEvent): void {
        if (this.state === StateId.MAIN_TILE) {
            this.state = this.tabState = StateId.MAIN_CONFIGURE;
            
            // Switch out buttons
            this.buttonsContainer.removeChild(this.tileButtonsContainer);
            this.buttonsContainer.addChild(this.colorButtonsContainer);
        }
    }

    public updateTile(pos: Point): void {
        const palette = this.palettes[this.grid];
        const index = pos.x + palette.width * pos.y;

        this.tiles[index]?.update(palette);
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

    // Initialize loading bar
    const bar = new PIXI.Graphics();
    bar.lineStyle(2, Constants.COLOR_WHITE);
    bar.drawRect(50, 225, Constants.STAGE_WIDTH - 100, 25);

    const progress = new PIXI.Graphics();
    progress.position.set(50 + 2, 225 + 2);
    progress.beginFill(Constants.COLOR_GREEN);
    progress.drawRect(0, 0, Constants.STAGE_WIDTH - 100 - 2, 25 - 4);
    progress.width = 0;

    const updateProgress = (pct: number) => progress.width = (Constants.STAGE_WIDTH - 100 - 2) * pct;

    const app = new PIXI.Application({
        background: '#000',
        width: Constants.STAGE_WIDTH,
        height: Constants.STAGE_HEIGHT,
        view: document.getElementById('main-canvas') as HTMLCanvasElement,
    });

    app.stage.addChild(progress);
    app.stage.addChild(bar);

    PIXI.Assets.addBundle('core', setupAssetManifests());

    const core: AssetBundle<Texture> = await PIXI.Assets.loadBundle('core', updateProgress);

    app.stage.removeChild(bar, progress);
    bar.destroy();
    progress.destroy();

    const examplePuzzles: {[key in ExamplePuzzle]: NetworkPuzzle} = setupExamplePuzzles();

    window.game = new Game(app, core);
    window.game.init(examplePuzzles['straight_3x3']);
}


type ExamplePuzzle = 'straight_3x3' | 'all_input_3x3' | 'all_output_3x3';


function setupAssetManifests(): AssetManifest {
    return {
        puzzles: 'lib/puzzles.json',

        pipe_72: 'art/sheets/pipe_72@1x.png.json',
        pipe_90: 'art/sheets/pipe_90@1x.png.json',
        pipe_120: 'art/sheets/pipe_120@1x.png.json',

        ui_background: 'art/ui_background.png',

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
    };
}

function setupExamplePuzzles(): {[key in ExamplePuzzle]: NetworkPuzzle} {
    const ALL_INPUTS_3x3: NetworkPuzzle = {
        id: -1,
        size: GridId._3x3,
        inputs: [
            [0, 0, DirectionId.DOWN, ColorId.RED, 1],
            [1, 0, DirectionId.DOWN, ColorId.BLUE, 2],
            [2, 0, DirectionId.DOWN, ColorId.YELLOW, 3],
            [2, 0, DirectionId.LEFT, ColorId.GREEN, 4],
            [2, 1, DirectionId.LEFT, ColorId.ORANGE, 1],
            [2, 2, DirectionId.LEFT, ColorId.PURPLE, 2],
            [2, 2, DirectionId.UP, ColorId.LIME, 3],
            [1, 2, DirectionId.UP, ColorId.CYAN, 4],
            [0, 2, DirectionId.UP, ColorId.AMBER, 1],
            [0, 2, DirectionId.RIGHT, ColorId.GOLD, 2],
            [0, 1, DirectionId.RIGHT, ColorId.MAGENTA, 3],
            [0, 0, DirectionId.RIGHT, ColorId.VIOLET, 4],
        ],
        outputs: []
    };

    const ALL_OUTPUTS_3x3: NetworkPuzzle = {
        id: -2,
        size: GridId._3x3,
        inputs: [],
        outputs: [
            [0, 3, DirectionId.DOWN, ColorId.RED, 1],
            [1, 3, DirectionId.DOWN, ColorId.BLUE, 2],
            [2, 3, DirectionId.DOWN, ColorId.YELLOW, 3],
            [-1, 0, DirectionId.LEFT, ColorId.GREEN, 4],
            [-1, 1, DirectionId.LEFT, ColorId.ORANGE, 1],
            [-1, 2, DirectionId.LEFT, ColorId.PURPLE, 2],
            [2, -1, DirectionId.UP, ColorId.LIME, 3],
            [1, -1, DirectionId.UP, ColorId.CYAN, 4],
            [0, -1, DirectionId.UP, ColorId.AMBER, 1],
            [3, 2, DirectionId.RIGHT, ColorId.GOLD, 2],
            [3, 1, DirectionId.RIGHT, ColorId.MAGENTA, 3],
            [3, 0, DirectionId.RIGHT, ColorId.VIOLET, 4],
        ],
    };

    const ALL_STRAIGHT_3x3: NetworkPuzzle = {
        id: -3,
        size: GridId._3x3,
        inputs: [
            [0, 0, DirectionId.DOWN, ColorId.RED, 1],
            [1, 0, DirectionId.DOWN, ColorId.BLUE, 2],
            [2, 2, DirectionId.LEFT, ColorId.PURPLE, 3],
            [2, 2, DirectionId.UP, ColorId.LIME, 4],
            [0, 1, DirectionId.RIGHT, ColorId.MAGENTA, 3],
            [0, 0, DirectionId.RIGHT, ColorId.VIOLET, 2],
        ],
        outputs: [
            [0, 3, DirectionId.DOWN, ColorId.RED, 1],
            [1, 3, DirectionId.DOWN, ColorId.BLUE, 2],
            [-1, 2, DirectionId.LEFT, ColorId.PURPLE, 3],
            [2, -1, DirectionId.UP, ColorId.LIME, 4],
            [3, 1, DirectionId.RIGHT, ColorId.MAGENTA, 3],
            [3, 0, DirectionId.RIGHT, ColorId.VIOLET, 2],
        ],
    };

    return {
        straight_3x3: ALL_STRAIGHT_3x3,
        all_input_3x3: ALL_INPUTS_3x3,
        all_output_3x3: ALL_OUTPUTS_3x3,
    };
}

window.onload = () => main();