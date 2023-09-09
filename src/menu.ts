import type { Application, Container, DisplayObject, FederatedPointerEvent, Sprite, Text } from 'pixi.js';
import { Animations } from './animation';
import { Game } from './game/main';
import { State } from './game/save';
import { Util } from './game/util';
import type { AssetBundle } from './constants';
import { Constants, DirectionId, Fonts, Strings } from './constants';
import { VictoryModal } from './modal';
import { MusicPlayer, VolumeButton } from './music';


interface Panel {
    readonly root: Container;
    readonly stars: (Sprite | null)[];
    readonly page: number;
    
    progressDot: boolean;
}


export class Menu {

    readonly app: Application;
    readonly stage: RestrictContainer<Container, DisplayObject, 0>;
    readonly core: AssetBundle;
    readonly music: MusicPlayer;

    readonly menuContainer: Container;
    readonly gameContainer: Container;
    readonly overlayContainer: Container;
    readonly titleContainer: Container;

    readonly game: Game;
    readonly maxPageInclusive: number;
    readonly maxPuzzleInclusive: number;

    readonly btnLeft: Sprite;
    readonly btnRight: Sprite;
    readonly btnVolume: VolumeButton;
    
    pageText: Text | null = null;
    starsText: Text | null = null;

    panel: Panel | null;
    page: number;

    delta: number;
    active: boolean;

    swipeStart: (Point & { readonly instant: number }) | null = null;

    saveData: LocalSaveData;

    progressDot: { root: DisplayObject, id: number, panel: Panel } | null = null;

    constructor(app: Application, core: AssetBundle) {

        this.app = app;
        this.stage = app.stage;
        this.core = core;
        this.music = new MusicPlayer();

        this.menuContainer = new PIXI.Container();
        this.gameContainer = new PIXI.Container();
        this.overlayContainer = new PIXI.Container();
        this.titleContainer = new PIXI.Container();

        this.menuContainer.addChild(new PIXI.Sprite(core.core.textures.menu_background)); // Needs to be before createPanel()

        this.game = new Game(this, this.gameContainer);
        this.maxPageInclusive = Math.ceil(core.puzzles.puzzles.length / Constants.PUZZLES_PER_PAGE) - 1;
        this.maxPuzzleInclusive = core.puzzles.puzzles.length - 1;

        this.page = 0;

        this.saveData = {
            version: 1,
            page: 0,
            stars: Util.bitCreate(),
        };

        try {
            const json: string | null = localStorage.getItem(Strings.LOCAL_STORAGE_KEY);
            const data: LocalSaveData | null = json === null ? null : JSON.parse(json);

            if (data?.version === 1) {
                this.saveData = data;
                this.page = this.saveData.page;
            }
        } catch (e) {
            console.warn(`Error loading save data: ${e}`);
        }

        this.panel = this.createPanel(this.page);
        if (this.saveData.state) {
            this.updateProgressDot(this.panel);
        }

        const title = 'CHROMATIC';
        const leftX = 24;
        let x = leftX;
        for (let i = 0; i < title.length; i++) {
            const letter = Util.text(title[i], Fonts.ARIAL, 44, Constants.COLOR_WHITE, true);
            letter.position.set(x, 30);
            x += letter.width + 10;
            this.titleContainer.addChild(letter);
        }

        this.btnLeft = new PIXI.Sprite(core.core.textures.menu_btn_left);
        this.btnRight = new PIXI.Sprite(core.core.textures.menu_btn_left);

        this.btnLeft.position.set(10, 523);
        this.btnLeft.eventMode = 'static';
        this.btnLeft.on('pointertap', () => this.switchPage(-1));

        this.btnRight.position.set(365 + 25, 523 + 40);
        this.btnRight.angle += 180;
        this.btnRight.eventMode = 'static';
        this.btnRight.on('pointertap', () => this.switchPage(1));

        this.btnVolume = new VolumeButton(core, this.music);
        this.btnVolume.root.position.set(118, 533);
        this.btnVolume.root.eventMode = 'static';
        this.btnVolume.root.on('pointertap', () => this.btnVolume.toggle());

        this.menuContainer.addChild(this.titleContainer);
        this.menuContainer.addChild(this.btnLeft);
        this.menuContainer.addChild(this.btnRight);
        this.menuContainer.addChild(this.btnVolume.root);

        this.pageText = null;

        this.updatePage();
        this.updateStars();

        this.delta = 0;
        this.active = true;

        const stage: Container = app.stage;

        this.enterMenu(); // Adds the menu container to root
        stage.addChild(this.overlayContainer); // Top level, so all other children need to be added under this

        stage.eventMode = 'static';
        stage.on('pointertap', event => this.onPointerTap(event));
        stage.on('pointerdown', event => this.onPointerDown(event));
        stage.on('pointerup', event => this.onPointerUp(event));
        stage.on('pointerupoutside', event => this.onPointerUp(event));
        stage.on('pointermove', event => this.onPointerMove(event));
    }


    public onVictory(puzzleId: number): void {
        Util.bitSet(this.saveData.stars, puzzleId);
        
        this.save();
        this.updateStars();
        this.updateStar(this.panel, puzzleId);

        // Raise victory modal
        new VictoryModal(this.overlayContainer, this, puzzleId);
    }

    private onPointerTap(event: FederatedPointerEvent): void {
        this.game.onPointerTap(event);
    }

    private onPointerDown(event: FederatedPointerEvent): void {
        this.game.onPointerDown(event);
        this.swipeStart = { x: event.screenX, y: event.screenY, instant: event.timeStamp };
    }

    private onPointerUp(event: FederatedPointerEvent): void {
        this.game.onPointerUp(event);
    }

    private onPointerMove(event: FederatedPointerEvent): void {
        this.game.onPointerMove(event);

        // Detect swipes
        // Do this from pointer move, not pointer up, since we want to be able to move before the finger is lifted
        // This saves the need to animate the "before lifted" swipe part.
        if (this.swipeStart !== null) {
            const swipeEnd = { x: event.screenX, y: event.screenY, instant: event.timeStamp };
            const swipe = Util.interpretAsSwipe(this.swipeStart, swipeEnd);

            // N.B. convention is grab puzzles + move; so a left swipe = move content left = next page (right)
            if (swipe === DirectionId.RIGHT) {
                this.switchPage(-1);
            } else if (swipe === DirectionId.LEFT) {
                this.switchPage(1);
            } else {
                return;
            }

            // Only clear the swipe if we actually interpreted a swipe here
            this.swipeStart = null;
        }
    }


    private load(puzzleId: number): void {
        this.active = false;

        Animations.fadeToBlack(this.overlayContainer, () => {
            this.leaveMenu();
            this.enterGame(puzzleId);
        }, () => {
            this.game.postInit();
        });
    }

    public unload(): void {
        this.game.preTeardown();
        Animations.fadeToBlack(this.overlayContainer, () => {
            this.leaveGame();
            this.enterMenu();
        }, () => {
            this.active = true;
        });
    }

    public nextPuzzle(): void {
        // Only allow this transition if the puzzle is complete
        if (this.game.puzzle !== null && Util.bitGet(this.saveData.stars, this.game.puzzle.id) && this.game.puzzle.id < this.maxPuzzleInclusive) {
            this.game.preTeardown();
            Animations.fadeToBlack(this.overlayContainer, () => {
                this.enterNextPuzzle();
            }, () => {
                this.game.postInit();
            });
        }
    }

    public saveState(): void {
        const save = State.saveState(this.game);
        if (save === null) {
            delete this.saveData.state;
        } else {
            this.saveData.state = save;
        }
        this.updateProgressDot(this.panel);
        this.save();
    }

    private tick(delta: number): void {
        this.delta += delta;

        // Tick title rainbow colors
        for (let i = 0; i < this.titleContainer.children.length; i++) {
            const color = Util.RAINBOW[Math.floor((this.delta / 8 + i) % Util.RAINBOW.length)];
            (this.titleContainer.children[i] as Text).tint = color;
        }
    }

    private selectPuzzle(puzzle: number): void {
        if (this.active) {
            this.load(puzzle);
        }
    }

    private switchPage(sign: -1 | 1): void {
        if (!this.active || this.panel === null) {
            return; // Inactive (animating)
        }

        if ((sign === -1 && this.page === 0) || (sign === 1 && this.page === this.maxPageInclusive)) {
            return; // No more puzzles to the left / right
        }

        const oldPanel = this.panel;
        const newPanel = this.createPanel(this.page + sign);

        this.active = false;
        this.panel = null;
        this.page += sign;
        this.saveData.page = this.page;
        this.save(); // Update the saved main menu page

        newPanel.root.position.set(-sign * Constants.STAGE_WIDTH, 0);

        Animations.easeInOut(oldPanel.root, Util.ZERO, { x: -sign * Constants.STAGE_WIDTH, y: 0 }, () => {
            oldPanel.root.destroy();

            // If the old panel held the progress dot, the `destroy()` above will have freed it.
            // So we need to clear up the reference here.
            if (oldPanel.progressDot) {
                this.progressDot = null;
            }
        });

        Animations.easeInOut(newPanel.root, { x: sign * Constants.STAGE_WIDTH, y: 0 }, Util.ZERO, () => {
            this.updatePage();
            this.panel = newPanel;
            this.active = true;
        });
    }

    private createPanel(page: number): Panel {
        const root = new PIXI.Container();
        const stars: (Sprite | null)[] = Util.nulls(Constants.PUZZLES_PER_PAGE);
        const max = Math.min(Constants.PUZZLES_PER_PAGE, this.core.puzzles.puzzles.length - (Constants.PUZZLES_PER_PAGE * page));
        const panel: Panel = { root, stars, page, progressDot: false };

        for (let i = 0; i < max; i++) {
            const puzzleId: number = i + page * Constants.PUZZLES_PER_PAGE;
            const button = new PIXI.Container();
            const back = new PIXI.Sprite(this.core.core.textures.menu_panel);

            const label = Util.text(String(i + page * Constants.PUZZLES_PER_PAGE + 1), Fonts.ERAS_BOLD_ITC, 16);

            label.position.set(5, 5);

            button.addChild(back);
            button.addChild(label);

            button.eventMode = 'static';
            button.position.set(26 + (i % 4) * 90, 117 + Math.floor(i / 4) * 90);
            button.on('pointertap', () => this.selectPuzzle(puzzleId));

            root.addChild(button);
        }

        for (let i = 0; i < Constants.PUZZLES_PER_PAGE; i++) {
            this.updateStar(panel, i + page * Constants.PUZZLES_PER_PAGE);
        }

        this.updateProgressDot(panel);

        this.menuContainer.addChild(root);
        return panel;
    }

    /** Updates that need to run after changing the page is complete */
    private updatePage(): void {
        this.btnLeft.visible = this.page > 0;
        this.btnRight.visible = this.page < this.maxPageInclusive;

        if (this.pageText) {
            this.pageText.destroy();
            this.pageText = null;
        }

        this.pageText = Util.text(`${1 + this.page} / ${1 + this.maxPageInclusive}`, Fonts.ERAS_BOLD_ITC, 20);
        this.pageText.position.set(45, 521 + 8);
        this.menuContainer.addChild(this.pageText);
    }

    private updateStars(): void {
        if (this.starsText) {
            this.starsText.destroy();
            this.starsText = null;
        }

        this.starsText = Util.text(String(Util.bitCount(this.saveData.stars)), Fonts.ERAS_BOLD_ITC, 20);
        this.starsText.position.set(315 - this.starsText.width, 521 + 8);
        this.menuContainer.addChild(this.starsText);
    }

    private updateStar(panel: Panel | null, puzzleId: number): void {
        if (panel === null) {
            return;
        }

        const page: number = Math.floor(puzzleId / Constants.PUZZLES_PER_PAGE);
        const index: number = puzzleId % Constants.PUZZLES_PER_PAGE;

        // Update the star, if needed
        if (panel.page === page && panel.stars[index] === null && Util.bitGet(this.saveData.stars, puzzleId)) {
            const star = new PIXI.Sprite(this.core.core.textures.menu_star);

            star.position.set(21, 23);
            (panel.root.children[index] as Sprite).addChild(star);
            panel.stars[index] = star;
        }
    }

    private updateProgressDot(panel: Panel | null)
    {
        const currentId: number | null = this.saveData.state?.id ?? null;
        if (
            // If we have a non-null current ID, and either a progress dot that is null, or a different puzzle,
            (currentId !== null && (this.progressDot === null || this.progressDot.id !== currentId)) ||
            // Otherwise, if we have no current progress, and we have a progress dot
            (currentId === null && this.progressDot !== null)
        ) {
            // Clear the previous one; if it was pointing to a different puzzle
            if (this.progressDot !== null) {
                this.progressDot.panel.progressDot = false;
                this.progressDot.root.destroy();
                this.progressDot = null;
            }

            // Add a new progress dot, if we have a current ID, and we're updating the correct panel
            if (currentId !== null) {
                const page: number = Math.floor(currentId / Constants.PUZZLES_PER_PAGE);
                const index: number = currentId % Constants.PUZZLES_PER_PAGE;

                if (panel !== null && panel.page === page) {
                    const dot = new PIXI.Graphics();

                    dot.beginFill(Constants.COLOR_GREEN);
                    dot.drawCircle(0, 0, 4);
                    dot.position.set(69, 69);

                    (panel.root.children[index] as Sprite).addChild(dot);

                    this.progressDot = { root: dot, id: currentId, panel };
                    panel.progressDot = true; // Mark the panel as holding the current progress dot
                }
            }
        }

    }

    private save(): void {
        try {
            localStorage.setItem(Strings.LOCAL_STORAGE_KEY, JSON.stringify(this.saveData));
        } catch (e) {
            if (DEBUG) {
                throw e;
            }
        }
    }

    // Transitions

    public enterMenu(): void {
        this.stage.addChildAt(this.menuContainer, 0);
        this.btnVolume.update();
        PIXI.Ticker.shared.add(this.tick, this);
    }

    public leaveMenu(): void {
        this.stage.removeChild(this.menuContainer);
        PIXI.Ticker.shared.remove(this.tick, this);
    }

    public enterGame(puzzleId: number): void {
        this.stage.addChildAt(this.gameContainer, 0);
        this.game.init(this.core.puzzles.puzzles[puzzleId], this.nextIsValid(puzzleId), this.saveData?.state ?? null);
    }

    public leaveGame(): void {
        this.game.teardown();
        this.stage.removeChild(this.gameContainer);
    }

    /**
     * Leaves and enters the game UI, to go to the next puzzle.
     * Caller must have asserted that the next puzzle is valid first before calling. This is checked in debug.
     */
    public enterNextPuzzle(): void {
        const puzzleId: number = this.game.puzzle!.id + 1;

        if (DEBUG && puzzleId > this.maxPuzzleInclusive) {
            throw new Error(`Puzzle id ${puzzleId} is out of range of [0, ${this.maxPuzzleInclusive}], must not call.`);
        }

        this.game.teardown(); // Teardown the current puzzle
        this.game.init(this.core.puzzles.puzzles[puzzleId], this.nextIsValid(puzzleId), this.saveData?.state ?? null); // Immediately load the next puzzle
    }

    private nextIsValid(puzzleId: number): boolean {
        return puzzleId < this.maxPuzzleInclusive && Util.bitGet(this.saveData.stars, puzzleId);
    }

    // Cheats

    public unlockAll(): void {
        for (let puzzleId = 0; puzzleId <= this.maxPuzzleInclusive; puzzleId++) {
            Util.bitSet(this.saveData.stars, puzzleId);
            this.updateStar(this.panel, puzzleId);
        }

        this.save();
        this.updateStars();
    }

    public unlockNone(): void {
        try {
            localStorage.removeItem(Strings.LOCAL_STORAGE_KEY);
        } catch (e) {
            if (DEBUG) {
                throw e;
            }
        }
    }
}