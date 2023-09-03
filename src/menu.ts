import type { Application, Container, FederatedPointerEvent, Sprite, Text } from "pixi.js";
import type { AssetBundle } from "./gen/constants.js";

import { Game } from "./game/main.js";
import { Animations } from "./animation.js";
import { DirectionId } from "./gen/constants.js";
import { Util } from "./game/util.js";



export class Menu {

    readonly app: Application;
    readonly core: AssetBundle;

    readonly menuContainer: Container;
    readonly gameContainer: Container;
    readonly overlayContainer: Container;
    readonly titleContainer: Container;

    readonly game: Game;
    readonly maxPageInclusive: number;

    readonly btnLeft: Sprite;
    readonly btnRight: Sprite;
    
    pageText: Text | null = null;

    panel: Container | null;
    page: number;

    delta: number;
    active: boolean;

    swipeStart: (Point & { readonly instant: number }) | null = null;

    saveData: LocalSaveData;

    constructor(app: Application, core: AssetBundle) {

        this.app = app;
        this.core = core;

        this.menuContainer = new PIXI.Container();
        this.gameContainer = new PIXI.Container();
        this.overlayContainer = new PIXI.Container();
        this.titleContainer = new PIXI.Container();

        this.menuContainer.addChild(new PIXI.Sprite(core.menu_background)); // Needs to be before createPanel()

        this.game = new Game(this.gameContainer, core);
        this.maxPageInclusive = Math.ceil(core.puzzles.puzzles.length / 16) - 1;

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

        const title = 'CHROMATIC';
        const leftX = 24;
        let x = leftX;
        for (let i = 0; i < title.length; i++) {
            const letter = new PIXI.Text(title[i], {
                fontFamily: Fonts.ARIAL,
                fontWeight: 'bold',
                fontSize: 44,
                fill: Constants.COLOR_WHITE,
            });
            letter.position.set(x, 30);
            x += letter.width + 10;
            this.titleContainer.addChild(letter);
        }

        if (DebugMode.ENABLED && leftX !== Constants.STAGE_WIDTH - (x - 10)) {
            throw new Error(`Title is misaligned, in menu.ts set leftX = ${(Constants.STAGE_WIDTH - ((x - 10) - leftX)) / 2}px`);        
        }

        this.btnLeft = new PIXI.Sprite(core.menu_btn_left);
        this.btnRight = new PIXI.Sprite(core.menu_btn_left);

        this.btnLeft.position.set(10, 523);
        this.btnLeft.eventMode = 'static';
        this.btnLeft.on('pointertap', () => this.switchPage(-1));

        this.btnRight.position.set(365 + 25, 523 + 40);
        this.btnRight.angle += 180;
        this.btnRight.eventMode = 'static';
        this.btnRight.on('pointertap', () => this.switchPage(1));

        this.menuContainer.addChild(this.titleContainer);
        this.menuContainer.addChild(this.btnLeft);
        this.menuContainer.addChild(this.btnRight);

        this.pageText = null;

        this.updatePage();

        this.delta = 0;
        this.active = true;

        const stage = app.stage;

        this.enterMenu(); // Adds the menu container to root
        stage.addChild(this.overlayContainer); // Top level, so all other children need to be added under this

        stage.eventMode = 'static';
        stage.on('pointertap', event => this.onPointerTap(event));
        stage.on('pointerdown', event => this.onPointerDown(event));
        stage.on('pointerup', event => this.onPointerUp(event));
        stage.on('pointermove', event => this.onPointerMove(event));
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

        // Detect swipes
        if (this.swipeStart !== null) {
            const swipeEnd = { x: event.screenX, y: event.screenY, instant: event.timeStamp };
            const swipe = Util.interpretAsSwipe(this.swipeStart, swipeEnd);

            // N.B. convention is grab puzzles + move; so a left swipe = move content left = next page (right)
            if (swipe === DirectionId.RIGHT) {
                this.switchPage(-1);
            } else if (swipe === DirectionId.LEFT) {
                this.switchPage(1);
            }

            this.swipeStart = null;
        }
    }

    private onPointerMove(event: FederatedPointerEvent): void {
        this.game.onPointerMove(event);
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

    private unload(): void {
        this.game.preTeardown();
        Animations.fadeToBlack(this.overlayContainer, () => {
            this.leaveGame();
            this.enterMenu();
        }, () => {
            this.active = true;
        });
    }

    private tick(delta: number): void {
        this.delta += delta;

        // Tick title rainbow colors
        for (let i = 0; i < this.titleContainer.children.length; i++) {
            const color = Util.RAINBOW[Math.floor((this.delta / 8 + i) % Util.RAINBOW.length)]!;
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

        newPanel.position.set(-sign * Constants.STAGE_WIDTH, 0);

        Animations.easeInOut(oldPanel, Util.ZERO, { x: -sign * Constants.STAGE_WIDTH, y: 0 }, () => {
            oldPanel.destroy();
        });

        Animations.easeInOut(newPanel, { x: sign * Constants.STAGE_WIDTH, y: 0 }, Util.ZERO, () => {
            this.updatePage();
            this.panel = newPanel;
            this.active = true;
        });
    }

    private createPanel(page: number): Container {
        const panel = new PIXI.Container();

        const max = Math.min(16, this.core.puzzles.puzzles.length - (16 * page));
        for (let i = 0; i < max; i++) {
            const puzzleId: number = i + page * 16;
            const button = new PIXI.Container();
            const back = new PIXI.Sprite(this.core.menu_panel);

            const label = new PIXI.Text(String(i + page * 16 + 1), {
                fontFamily: Fonts.ERAS_BOLD_ITC,
                fontSize: 16,
                fill: Constants.COLOR_WHITE,
            });

            label.position.set(5, 5);

            button.addChild(back);
            button.addChild(label);

            button.eventMode = 'static';
            button.position.set(26 + (i % 4) * 90, 117 + Math.floor(i / 4) * 90);
            button.on('pointertap', () => this.selectPuzzle(puzzleId));

            panel.addChild(button);
        }

        this.menuContainer.addChild(panel);
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

        this.pageText = new PIXI.Text(`${1 + this.page} / ${1 + this.maxPageInclusive}`, {
            fontFamily: Fonts.ERAS_BOLD_ITC,
            fontSize: 20,
            fill: Constants.COLOR_WHITE,
        });
        this.pageText.position.set(45, 521 + 8);
        this.menuContainer.addChild(this.pageText);
    }

    private save(): void {
        try {
            localStorage.setItem(Strings.LOCAL_STORAGE_KEY, JSON.stringify(this.saveData));
        } catch (e) {
            if (DebugMode.ENABLED) {
                throw e;
            }
        }
    }

    public clearSave(): void {
        try {
            localStorage.setItem(Strings.LOCAL_STORAGE_KEY, '{version: 0}');
        } catch (e) {
            if (DebugMode.ENABLED) {
                throw e;
            }
        }
    }

    // Transitions

    private enterMenu(): void {
        this.app.stage.addChildAt(this.menuContainer, 0);
        PIXI.Ticker.shared.add(this.tick, this);
    }

    private leaveMenu(): void {
        this.app.stage.removeChild(this.menuContainer);
        PIXI.Ticker.shared.remove(this.tick, this);
    }

    private enterGame(puzzleId: number): void {
        this.app.stage.addChildAt(this.gameContainer, 0);
        this.game.init(this.core.puzzles.puzzles[puzzleId]!);
    }

    private leaveGame(): void {
        this.game.teardown();
        this.app.stage.removeChild(this.gameContainer);
    }
}