import type { Container, DisplayObject, FederatedPointerEvent, Sprite, Texture } from 'pixi.js';
import { AssetBundle, AxisId, ColorId, Constants, DirectionId, GridId, NetworkPuzzle, Strings, TileId, type TexturePalette } from '../gen/constants';
import type { Menu } from '../menu';
import { VolumeButton } from '../music';
import { Navigator } from './navigator';
import { State } from './save';
import { Simulator } from './simulator';
import { Tile } from './tile';
import { Util } from './util';


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

    readonly menu: Menu;
    readonly root: Container;
    readonly core: AssetBundle;
    readonly tiles: (Tile | null)[];

    // UI Layer (background display)
    readonly gridContainer: Container; // The NxN grid, which is puzzle-dependent
    readonly buttonsContainer: RestrictContainer<Container, DisplayObject, 0>; // All tile buttons, start, stop, etc.)
    readonly tilesContainer: Container; // All placed tiles
    readonly edgesContainer: Container; // All input / output edges. Also holds input / output flows, added by the simulator
    readonly topContainer: Container; // Top layer (held sprite, things that need to be fully top level)

    readonly tileButtonsContainer: Container; // The buttons for picking up + dragging each tile
    readonly colorButtonsContainer: Container; // The buttons for selecting a color for the unmix configuration

    readonly palettes: PaletteMap<Texture>;
    readonly tileButtonPalette: ReadonlyArray<Texture>;

    readonly btnPlay: Sprite;
    readonly btnStop: Sprite;
    readonly btnNext: Sprite;
    readonly btnVolume: VolumeButton;

    readonly simulator: Simulator.Kind;

    puzzle: NetworkPuzzle | null = null;
    state: StateId = StateId.UNLOADED;
    tabState: StateId.MAIN_CONFIGURE | StateId.MAIN_TILE = StateId.MAIN_TILE;
    unloadState: StateId = StateId.MAIN_TILE;
    grid: GridId = GridId.default;

    private heldTile: { root: Sprite, tileId: TileId } | null = null;

    // colorId:
    //     ColorId : A color
    //     -1      : Apply a `null` color
    //     null    : Don't apply any color (pressure label)
    // pressure:
    //     -1 | 1  : Apply a delta pressure, either +1 or -1
    //     null    : Don't apply any pressure (color label)
    private heldLabel: { root: DisplayObject, colorId: ColorId | -1 | null, pressure: -1 | 1 | null } | null = null;
    
    // When a mouse down occurs, we don't know a priori if it's a drag or rotate
    // While we wait for a substantial mouse movement, we hold the mouse position here
    // If we move enough, then we snap to assuming it's a click and drag, if not, we clear this on tap
    private movedTile: (Point & { index: number }) | null = null;

    // The last recorded screenX / screenY of the mouse, from mouse move event
    private screenX: number = 0;
    private screenY: number = 0;

    // If `true`, the next tap on the stage will by ignored
    private bypassNextTap: boolean = false;

    constructor(menu: Menu, root: Container) {
        
        this.menu = menu;
        this.root = root;
        this.core = menu.core;
        this.tiles = [];

        const buttonsContainer = new PIXI.Container();

        this.gridContainer = new PIXI.Container();
        this.buttonsContainer = buttonsContainer;
        this.tilesContainer = new PIXI.Container();
        this.edgesContainer = new PIXI.Container();
        this.topContainer = new PIXI.Container();

        this.tileButtonsContainer = new PIXI.Container();
        this.colorButtonsContainer = new PIXI.Container();

        this.palettes = Util.buildPalettes(menu.core);
        this.simulator = Simulator.create(this.edgesContainer);

        const core = menu.core.core.textures;
        const ui = new PIXI.Sprite(this.core.core.textures.ui_background);

        const tabTopBackground = new PIXI.Sprite(core.ui_tab_top);
        const tabBotBackground = new PIXI.Sprite(core.ui_tab_bot);

        tabTopBackground.position.set(271, 431);
        tabBotBackground.position.set(271, 431);

        this.tileButtonsContainer.addChild(tabTopBackground);
        this.colorButtonsContainer.addChild(tabBotBackground);

        this.tileButtonPalette = [
            core.ui_btn_pipe_empty,
            core.ui_btn_pipe_straight,
            core.ui_btn_pipe_curve,
            core.ui_btn_pipe_cross,
            core.ui_btn_pipe_mix,
            core.ui_btn_pipe_unmix,
            core.ui_btn_pipe_up,
            core.ui_btn_pipe_down
        ] as const;

        for (let i = 0; i <= TileId.last; i++) {
            const tileId: TileId = i;
            const btn = new PIXI.Sprite(this.tileButtonPalette[i]);

            btn.position.set(22 + (i % 4) * 66, 438 + Math.floor(i / 4) * 66);
            btn.eventMode = 'static';
            btn.on('pointerdown', event => this.grabTile(event, tileId));
            
            this.tileButtonsContainer.addChild(btn);
        }

        for (let i = 0; i <= ColorId.last; i++) {
            const color: ColorId = i;
            const btn = new PIXI.Graphics();
            const offset = color == ColorId.BROWN ? 7
                : color < ColorId.BROWN ? i : i + 2;

            btn.beginFill(Util.COLORS[color]);
            btn.drawCircle(0, 0, 12);
            btn.position.set(48 + Math.floor(offset / 3) * 41, 460 + (offset % 3) * 41);

            btn.eventMode = 'static';
            btn.on('pointerdown', event => this.grabColor(event, color));
            btn.cursor = Strings.CURSOR;

            this.colorButtonsContainer.addChild(btn);
        }

        const emptyBtn = new PIXI.Sprite(this.core.pipe_72.textures.pipe_72_unmix);

        emptyBtn.anchor.set(0.5);
        emptyBtn.position.set(48 + 2 * 41 - 1, 460 - 1);
        emptyBtn.eventMode = 'static';
        emptyBtn.on('pointerdown', event => this.grabColor(event, null));

        this.colorButtonsContainer.addChild(emptyBtn);

        const btnPressureUp = new PIXI.Sprite(this.core.pipe_72.textures.pipe_72_up);
        const btnPressureDown = new PIXI.Sprite(this.core.pipe_72.textures.pipe_72_down);

        btnPressureUp.position.set(240, 447);
        btnPressureUp.eventMode = 'static';
        btnPressureUp.on('pointerdown', event => this.grabPressure(event, 1));
        btnPressureUp.cursor = Strings.CURSOR;
        
        btnPressureDown.position.set(240, 529);
        btnPressureDown.eventMode = 'static';
        btnPressureDown.on('pointerdown', event => this.grabPressure(event, -1));
        btnPressureDown.cursor = Strings.CURSOR;

        this.colorButtonsContainer.addChild(btnPressureUp);
        this.colorButtonsContainer.addChild(btnPressureDown);

        this.btnPlay = new PIXI.Sprite(core.ui_btn_play);
        this.btnPlay.position.set(324, 438);
        this.btnPlay.eventMode = 'static';
        this.btnPlay.on('pointertap', () => this.onPlay());
        buttonsContainer.addChild(this.btnPlay);

        this.btnStop = new PIXI.Sprite(core.ui_btn_stop);
        this.btnStop.position.set(355, 440);
        this.btnStop.eventMode = 'static';
        this.btnStop.alpha = 0.5;
        this.btnStop.on('pointertap', () => this.onStop());
        buttonsContainer.addChild(this.btnStop);

        const btnTabTop = new PIXI.Sprite();
        const btnTabBot = new PIXI.Sprite();

        btnTabTop.hitArea = new PIXI.Rectangle(274, 431, 35, 70);
        btnTabTop.eventMode = 'static';
        btnTabTop.on('pointertap', () => this.onTabTop());

        btnTabBot.hitArea = new PIXI.Rectangle(274, 431 + 70, 35, 70);
        btnTabBot.eventMode = 'static';
        btnTabBot.on('pointertap', () => this.onTabBot());

        buttonsContainer.addChild(btnTabTop);
        buttonsContainer.addChild(btnTabBot);

        const btnMenu = new PIXI.Sprite(core.menu_btn_main);

        btnMenu.position.set(Constants.BTN_MAIN_X, Constants.BTN_MAIN_Y);
        btnMenu.eventMode = 'static';
        btnMenu.on('pointertap', () => this.onMenu());
        buttonsContainer.addChild(btnMenu);

        this.btnNext = new PIXI.Sprite(core.menu_btn_left);

        this.btnNext.angle += 180;
        this.btnNext.position.set(Constants.BTN_NEXT_X, Constants.BTN_NEXT_Y);
        this.btnNext.eventMode = 'static';
        this.btnNext.on('pointertap', () => this.onNext());
        buttonsContainer.addChild(this.btnNext);

        this.btnVolume = new VolumeButton(menu.core, menu.music);
        this.btnVolume.root.position.set(324, 543);
        this.btnVolume.root.eventMode = 'static';
        this.btnVolume.root.on('pointertap', () => this.btnVolume.toggle());
        buttonsContainer.addChild(this.btnVolume.root);

        // Default with tile buttons visible
        this.buttonsContainer.addChildAt(this.tileButtonsContainer, 0);

        root.addChild(ui);
        root.addChild(this.gridContainer);
        root.addChild(buttonsContainer);
        root.addChild(this.tilesContainer);
        root.addChild(this.edgesContainer);
        root.addChild(this.topContainer);
    }

    /**
     * Initializes per-puzzle data
     */
    public init(puzzle: NetworkPuzzle, nextIsValid: boolean = false, saveState: SavedPuzzleState | null = null): void {
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

        for (const [x, y, dir, color] of puzzle?.filters ?? []) {
            const filter = new PIXI.Sprite(palette.textures.filter);
            const pos = Util.getFilterPos(palette, x, y, dir);

            filter.anchor.set(0.5);
            filter.angle = dir === DirectionId.UP ? 0 : 90;
            filter.position.set(pos.x, pos.y);
            filter.tint = Util.COLORS[color];

            this.edgesContainer.addChild(filter);
        }

        this.puzzle = puzzle;
        this.updateNextPuzzle(nextIsValid);
        this.btnVolume.update();
        
        if (saveState !== null) {
            State.restoreState(this, saveState, palette);

            // If any tiles were added here, they won't be present on the tile container yet
            // Adding these unconditionally is safe since before this, there shouldn't be any tiles present on the container
            for (const tile of this.tiles) {
                if (tile !== null) {
                    this.tilesContainer.addChild(tile.root);
                }
            }
        }
    }

    /**
     * Enables interactivity, after the game has finished loading / animating
     */
    public postInit(): void {
        this.state = this.unloadState;
    }

    /**
     * Disables interactivity, before the animation to teardown starts
     */
    public preTeardown(): void {
        this.unloadState = this.state;
        this.state = StateId.UNLOADED;
    }

    /**
     * Removes all puzzle-specific data
     */
    public teardown(): void {

        if (this.unloadState === StateId.SIMULATION) {
            this.onStop(true);
            this.unloadState = this.tabState; // Since we nuke the simulation, our actual unload state will be switching to the tab state
        }

        Util.clear(this.tilesContainer);
        Util.clear(this.gridContainer);
        Util.clear(this.edgesContainer);

        (this as Mutable<Game>).tiles = [];

        this.puzzle = null;
        this.state = StateId.UNLOADED;
    }

    public onVictory(): void {
        this.menu.onVictory(this.puzzle!.id);
    }

    public updateNextPuzzle(valid: boolean): void {
        this.btnNext.visible = valid && this.puzzle !== null && this.puzzle.id >= 0;
    }

    private grabTile(event: FederatedPointerEvent, tileId: TileId): void {
        if (this.state == StateId.MAIN_TILE) {
            this.heldTile = {
                root: new PIXI.Sprite(this.tileButtonPalette[tileId]),
                tileId,
            };

            this.heldTile.root.anchor.set(0.5);
            this.heldTile.root.position.set(event.screenX, event.screenY);
            this.state = StateId.DRAGGING_TILE;

            this.topContainer.addChild(this.heldTile.root);
        }
    }

    private grabColor(event: FederatedPointerEvent, colorId: ColorId | null): void {
        if (this.state === StateId.MAIN_CONFIGURE) {
            let root;

            if (colorId !== null) {
                root = new PIXI.Graphics();
                root.beginFill(Util.COLORS[colorId]);
                root.drawCircle(0, 0, 12);
            } else {
                root = new PIXI.Sprite(this.core.pipe_72.textures.pipe_72_unmix);
                root.anchor.set(0.5);
            }

            root.position.set(event.screenX, event.screenY);

            this.heldLabel = { root, colorId: colorId === null ? -1 : colorId, pressure: null };
            this.state = StateId.DRAGGING_LABEL;

            this.topContainer.addChild(this.heldLabel.root);
        }
    }

    private grabPressure(event: FederatedPointerEvent, pressure: -1 | 1): void {
        if (this.state === StateId.MAIN_CONFIGURE) {
            const textureSrc = this.core.pipe_72.textures;
            const root = new PIXI.Sprite(pressure === -1 ? textureSrc.pipe_72_down : textureSrc.pipe_72_up);
            
            root.position.set(event.screenX, event.screenY);
            root.anchor.set(0.5);

            this.heldLabel = { root, colorId: null, pressure };
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

        // Check if we reach the threshold to be considered dragging a tile
        if ((this.state === StateId.MAIN_TILE || this.state === StateId.MAIN_CONFIGURE) &&
            this.movedTile !== null &&
            this.tiles[this.movedTile.index] !== null &&
            Util.norm2(this.movedTile, { x: this.screenX, y: this.screenY }) > Constants.DRAG_TILE_MIN_NORM2
        ) {
            const index = this.movedTile.index;
            const oldTile = this.tiles[index]!;

            this.state = StateId.MAIN_TILE; // Force this, so `grabTile()` works
            this.grabTile(event, oldTile.tileId); // Pickup the old tile

            oldTile.destroy(); // And destroy it on the board
            
            this.tiles[index] = null;
            
            this.menu.saveState();
        }
    }

    public onPointerDown(event: FederatedPointerEvent): void {
        if (this.state === StateId.MAIN_TILE || this.state === StateId.MAIN_CONFIGURE) {
            if (this.isInGrid(event)) {
                const pos = this.projectToGrid(event);

                // Mark this as the starting point of a click-and-drag to move a tile
                const tile = this.tiles[pos.index];
                if (tile !== null) {
                    this.movedTile = { x: event.screenX, y: event.screenY, index: pos.index };
                }
            } else {
                // Set when the tap down occurs outside the grid - prevents the tap from occurring on the grid
                // This is a QoL improvement for mobile, when trying (and failing) to pickup a tile or color
                // Instead of causing a rotation (down - miss color + drag + up/tap in tile), this no-ops it.
                this.bypassNextTap = true;
            }
        }
    }

    public onPointerUp(event: FederatedPointerEvent): void {

        if (this.movedTile !== null) {
            this.movedTile = null; // Always reset the moved tile
        }

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
                    const newTile = new Tile(palette, heldTile.tileId, pos.x, pos.y);
                    
                    this.tiles[pos.index] = newTile;
                    this.tilesContainer.addChild(newTile.root);

                    Navigator.updateTile(this, pos, newTile);
                }
                this.menu.saveState();
            }

            this.heldTile = null;
            this.state = this.tabState;
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
                            property.color = heldLabel.colorId === -1 ? null : heldLabel.colorId;
                        }
                        if (heldLabel.pressure !== null) {
                            property.pressure = Util.clamp(property.pressure + (heldLabel?.pressure ?? 0), 1, 4) as PressureId;
                        }
                        
                        // Applies the update to not only this tile, but all connecting tiles
                        Navigator.updateFrom(this, pos, tile, key);

                        this.menu.saveState();
                    }
                }
            }

            this.heldLabel = null;
            this.state = this.tabState;
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

                this.menu.saveState();
            }
        }
    }

    private onPlay(): void {
        if (this.state === StateId.MAIN_TILE || this.state === StateId.MAIN_CONFIGURE) {
            this.btnPlay.alpha = 0.5;
            this.btnStop.alpha = 1.0;

            this.state = StateId.SIMULATION;
            this.simulator.init(this.palettes[this.grid], this);
            PIXI.Ticker.shared.add(this.onSimulatorTick, this);
        }
    }

    private onStop(bypass: boolean = false): void {
        if (this.state === StateId.SIMULATION || bypass) {
            this.btnPlay.alpha = 1.0;
            this.btnStop.alpha = 0.5;

            if (!bypass) this.state = this.tabState;
            this.simulator.reset();
            PIXI.Ticker.shared.remove(this.onSimulatorTick, this);

            // Remove all flows from all tiles if simulation is stopped
            for (const tile of this.tiles) {
                tile?.clearFlow();
            }
        }
    }

    private onTabTop(): void {
        if (this.state === StateId.MAIN_CONFIGURE || this.state === StateId.SIMULATION) {
            this.tabState = StateId.MAIN_TILE;
            if (this.state !== StateId.SIMULATION) {
                this.state = this.tabState;
            }
            
            // Switch out buttons
            this.buttonsContainer.removeChild(this.colorButtonsContainer);
            this.buttonsContainer.addChildAt(this.tileButtonsContainer, 0);
        }
    }

    private onTabBot(): void {
        if (this.state === StateId.MAIN_TILE || this.state === StateId.SIMULATION) {
            this.tabState = StateId.MAIN_CONFIGURE;
            if (this.state !== StateId.SIMULATION) {
                this.state = this.tabState;
            }
            
            // Switch out buttons
            this.buttonsContainer.removeChild(this.tileButtonsContainer);
            this.buttonsContainer.addChildAt(this.colorButtonsContainer, 0);
        }
    }

    private onMenu(): void {
        if (this.state === StateId.MAIN_TILE || this.state === StateId.MAIN_CONFIGURE || this.state === StateId.SIMULATION) {
            this.menu.unload();
        }
    }

    private onNext(): void {
        if ((this.state === StateId.MAIN_TILE || this.state === StateId.MAIN_CONFIGURE || this.state === StateId.SIMULATION) && this.btnNext.visible) {
            this.menu.nextPuzzle();
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