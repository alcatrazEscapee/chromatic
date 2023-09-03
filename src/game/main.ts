import type { Texture, Container, FederatedPointerEvent, Sprite, DisplayObject } from 'pixi.js';

import { AssetBundle, AxisId, ColorId, DirectionId, GridId, NetworkPuzzle, TileId, type TexturePalette } from '../gen/constants.js';
import { Util } from './util.js';
import { Tile } from './tile.js';
import { Simulator } from './simulator.js';
import { Navigator } from './navigator.js';


const enum StateId {
    UNLOADED,
    MAIN_TILE,
    MAIN_CONFIGURE,
    DRAGGING_TILE,
    DRAGGING_LABEL,
    SIMULATION,
    VICTORY,
    MENU,
}


export class Game {

    readonly root: Container;
    readonly core: AssetBundle;
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

    readonly simulator: Simulator.Kind;

    puzzle: NetworkPuzzle | null = null;
    state: StateId = StateId.UNLOADED;
    tabState: StateId.MAIN_CONFIGURE | StateId.MAIN_TILE = StateId.MAIN_TILE;
    grid: GridId = GridId.default;

    heldTile: { root: Sprite, tileId: TileId } | null = null;
    heldLabel: { root: DisplayObject, colorId: ColorId | null, pressureId: -1 | 1 | null } | null = null;

    // The last recorded screenX / screenY of the mouse, from mouse move event
    screenX: number = 0;
    screenY: number = 0;

    // If `true`, the next tap on the stage will by ignored
    bypassNextTap: boolean = false;

    constructor(root: Container, core: AssetBundle) {
        
        this.root = root;
        this.core = core;
        this.tiles = [];

        this.gridContainer = new PIXI.Container();
        this.buttonsContainer = new PIXI.Container();
        this.tilesContainer = new PIXI.Container();
        this.edgesContainer = new PIXI.Container();
        this.topContainer = new PIXI.Container();

        this.tileButtonsContainer = new PIXI.Container();
        this.colorButtonsContainer = new PIXI.Container();

        this.palettes = Util.buildPalettes(core);

        this.simulator = Simulator.create(this.edgesContainer);

        const ui = new PIXI.Sprite(this.core.ui_background);

        const tileButtonTextures = [core.ui_btn_pipe_empty, core.ui_btn_pipe_straight, core.ui_btn_pipe_curve, core.ui_btn_pipe_cross, core.ui_btn_pipe_mix, core.ui_btn_pipe_unmix, core.ui_btn_pipe_up, core.ui_btn_pipe_down];
        for (let i = 0; i <= TileId.last; i++) {
            const tileId: TileId = i;
            const texture: Texture = tileButtonTextures[i];
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

            btn.beginFill(Util.COLORS[color]);
            btn.drawCircle(0, 0, 12);
            btn.position.set(22 + Math.floor(offset / 3) * 40, 460 + (offset % 3) * 40);

            btn.eventMode = 'static';
            btn.on('pointerdown', event => this.grabColor(event, color));

            this.colorButtonsContainer.addChild(btn);
        }

        const btnPressureUp = new PIXI.Sprite(core.pipe_72.textures.pipe_72_up);
        const btnPressureDown = new PIXI.Sprite(core.pipe_72.textures.pipe_72_down);

        btnPressureUp.position.set(22 + 5 * 40 - 13, 460 + 0 * 40 - 13);
        btnPressureUp.eventMode = 'static';
        btnPressureUp.on('pointerdown', event => this.grabPressure(event, 1));
        
        btnPressureDown.position.set(22 + 5 * 40 - 13, 460 + 2 * 40 - 13);
        btnPressureDown.eventMode = 'static';
        btnPressureDown.on('pointerdown', event => this.grabPressure(event, -1));

        this.colorButtonsContainer.addChild(btnPressureUp);
        this.colorButtonsContainer.addChild(btnPressureDown);

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

        root.addChild(ui);
        root.addChild(this.gridContainer);
        root.addChild(this.buttonsContainer);
        root.addChild(this.tilesContainer);
        root.addChild(this.edgesContainer);
        root.addChild(this.topContainer);
    }

    /**
     * Initializes per-puzzle data
     */
    public init(puzzle: NetworkPuzzle): void {
        this.grid = puzzle.size;

        const palette: TexturePalette = this.palettes[this.grid];

        const grid = new PIXI.Sprite(palette.grid);
        grid.position.set(Constants.GRID_LEFT, Constants.GRID_TOP);

        this.gridContainer.addChild(grid);

        (this as Mutable<Game>).tiles = Util.nulls(palette.width * palette.width)

        for (const [x, y, dir, color, pressure] of puzzle.inputs) {
            const edge = new PIXI.Container();
            const edgePipe = new PIXI.Sprite(palette.textures.edge[pressure - 1]);
            
            edgePipe.anchor.set(0.5);

            const edgeColor = new PIXI.Graphics();
            const insideWidth = Util.insideWidth(palette, pressure);

            // Arrow facing left, i.e. '<'
            edgeColor.beginFill(Util.COLORS[color]);
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
            edgeColor.beginFill(Util.COLORS[color]);
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
    }

    /**
     * Enables interactivity, after the game has finished loading / animating
     */
    public postInit(): void {
        this.state = this.tabState;
    }

    /**
     * Disables interactivity, before the animation to teardown starts
     */
    public preTeardown(): void {
        this.state = StateId.UNLOADED;
    }

    /**
     * Removes all puzzle-specific data
     */
    public teardown(): void {

        if (this.state === StateId.SIMULATION) {
            this.onStop(null);
        }

        Util.clear(this.tilesContainer);
        Util.clear(this.gridContainer);
        Util.clear(this.edgesContainer);

        (this as Mutable<Game>).tiles = [];

        this.puzzle = null;
        this.state = StateId.UNLOADED;
    }

    public onVictory(): void {

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

            root.beginFill(Util.COLORS[colorId]);
            root.drawCircle(0, 0, 12);
            root.position.set(event.screenX, event.screenY);

            this.heldLabel = { root, colorId, pressureId: null };
            this.state = StateId.DRAGGING_LABEL;

            this.topContainer.addChild(this.heldLabel.root);
        }
    }

    private grabPressure(event: FederatedPointerEvent, pressureId: -1 | 1): void {
        if (this.state === StateId.MAIN_CONFIGURE) {
            const textureSrc = this.core.pipe_72.textures;
            const root = new PIXI.Sprite(pressureId === -1 ? textureSrc.pipe_72_down : textureSrc.pipe_72_up);
            
            root.position.set(event.screenX, event.screenY);

            this.heldLabel = { root, colorId: null, pressureId };
            this.state = StateId.DRAGGING_LABEL;

            this.topContainer.addChild(this.heldLabel.root);
        }
    }

    public onPointerMove(event: FederatedPointerEvent): void {
        this.screenX = event.screenX;
        this.screenY = event.screenY;

        // Update the position of the held object(s)
        this.heldTile?.root.position.set(event.screenX, event.screenY);
        this.heldLabel?.root.position.set(event.screenX, event.screenY);
    }

    public onPointerDown(_: FederatedPointerEvent): void {}

    public onPointerUp(event: FederatedPointerEvent): void {
        if (this.state === StateId.DRAGGING_TILE) {
            const heldTile = this.heldTile!;

            if (this.isInGrid(event)) {
                const palette = this.palettes[this.grid];
                const pos = this.projectToGrid(event);

                // Replace the previous tile, if it exists
                const prevTile = this.tiles[pos.index];
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
        } else if (this.state === StateId.DRAGGING_LABEL) {
            const heldLabel = this.heldLabel!;

            if (this.isInGrid(event)) {
                const pos = this.projectToGrid(event);
                const tile = this.tiles[pos.index]!;

                if (tile !== null) {
                    let key: DirectionId | AxisId | null = null;

                    const targetDir = Util.unitClosestDir({ x: pos.hitX, y: pos.hitY }, 1);
                    switch (tile.tileId) {
                        case TileId.STRAIGHT:
                        case TileId.CURVE:
                            key = DirectionId.INTERNAL; // Single part tiles
                            break;
                        case TileId.CROSS:
                            // property indexed by AxisId, in original rotation, so need to un-rotate first
                            key = Util.dirToAxis(Util.unrotate(targetDir, tile.dir));
                            break;
                        default:
                            // property indexed by direction, in original rotation, so we need to un-rotate
                            key = Util.unrotate(targetDir, tile.dir);
                            if (key === DirectionId.DOWN){
                                key = null; // There is no down direction, so don't color this one.
                            }
                            break;
                    }

                    if (key !== null) {
                        const property = tile.property(key);

                        if (heldLabel.colorId !== null) {
                            property.color = heldLabel.colorId;
                        }
                        if (heldLabel.pressureId !== null) {
                            property.pressure = Util.clamp(property.pressure + heldLabel.pressureId, 1, 4) as PressureId;
                        }
                        
                        // Applies the update to not only this tile, but all connecting tiles
                        Navigator.updateFrom(this, pos, tile, key);
                    }
                }
            }

            this.heldLabel = null;
            this.state = StateId.MAIN_CONFIGURE;
            this.bypassNextTap = true;

            heldLabel.root.destroy();
        }
    }

    public onPointerTap(event: FederatedPointerEvent): void {
        if (this.bypassNextTap) {
            this.bypassNextTap = false;
            return;
        }

        if ((this.state === StateId.MAIN_TILE || this.state === StateId.MAIN_CONFIGURE) && this.isInGrid(event)) {
            const pos = this.projectToGrid(event);
            const tile: Tile | null = this.tiles[pos.index];

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
            this.simulator.init(this.palettes[this.grid], this);
            PIXI.Ticker.shared.add(this.onSimulatorTick, this);
        }
    }

    private onStop(_: FederatedPointerEvent | null): void {
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
        this.simulator.tick(delta, this.palettes[this.grid], this);
    }

    /** Returns true if the given position is within the grid */
    private isInGrid(event: { screenX: number, screenY: number }): boolean {
        return Util.isIn(event.screenX, event.screenY, Constants.GRID_LEFT, Constants.GRID_TOP, Constants.GRID_SIZE);
    }

    /** If a point is `isInGrid()`, then this returns the tile X, Y coordinates for that point. */
    private projectToGrid(event: { screenX: number, screenY: number }): Point & { index: number, hitX: number, hitY: number } {
        const palette = this.palettes[this.grid];
        const dx: number = (event.screenX - Constants.GRID_LEFT) / palette.tileWidth;
        const dy: number = (event.screenY - Constants.GRID_TOP) / palette.tileWidth;
        
        const x = Math.floor(dx);
        const y = Math.floor(dy);

        const hitX: number = dx - x;
        const hitY: number = dy - y;
        
        const index: number = x + palette.width * y;
        
        return { x, y, index, hitX, hitY };
    }
}