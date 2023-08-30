import type { Application, Container, Text, Texture } from "pixi.js";
import type { NetworkData } from "./game/constants.js";

import { Game } from "./game/main.js";
import { Animations } from "./animation.js";
import { Constants } from "./game/constants.js";
import { Util } from "./game/util.js";


export class Menu {

    readonly app: Application;
    readonly core: AssetBundle<NetworkData, Texture>;

    readonly menuContainer: Container;
    readonly gameContainer: Container;
    readonly overlayContainer: Container;
    readonly titleContainer: Container;

    readonly game: Game;
    readonly maxPageExclusive: number;

    panel: Panel | null;

    delta: number;
    active: boolean;

    constructor(app: Application, core: AssetBundle<NetworkData, Texture>) {

        this.app = app;
        this.core = core;

        this.menuContainer = new PIXI.Container();
        this.gameContainer = new PIXI.Container();
        this.overlayContainer = new PIXI.Container();
        this.titleContainer = new PIXI.Container();

        this.game = new Game(app, this.gameContainer, core);
        this.maxPageExclusive = Math.ceil(core.puzzles.puzzles.length / 16);

        this.panel = new Panel(this, 0);

        const title = 'CHROMATIC';
        
        let x = 20;
        for (let i = 0; i < title.length; i++) {
            const letter = new PIXI.Text(title[i], {
                fontFamily: 'Arial',
                fontSize: 44,
                fill: Constants.COLOR_WHITE,
            });
            letter.position.set(x, 30);
            x += letter.width + 10;
            this.titleContainer.addChild(letter);
        }

        this.menuContainer.addChild(this.titleContainer);

        this.delta = 0;
        this.active = true;

        this.enterMenu();
        this.app.stage.addChild(this.overlayContainer); // Top level, so all other children need to be added under this
    }

    load(puzzleId: number): void {
        this.active = false;

        Animations.fadeToBlack(this.overlayContainer, () => {
            this.leaveMenu();
            this.enterGame(puzzleId);
        }, () => {
            this.game.postInit();
        });
    }

    unload(): void {
        this.game.preTeardown();
        Animations.fadeToBlack(this.overlayContainer, () => {
            this.leaveGame();
            this.enterMenu();
        }, () => {
            this.active = true;
        });
    }

    tick(delta: number): void {
        this.delta += delta;

        // Tick title rainbow colors
        for (let i = 0; i < this.titleContainer.children.length; i++) {
            const color = Util.RAINBOW[Math.floor((this.delta / 8 + i) % Util.RAINBOW.length)]!;
            (this.titleContainer.children[i] as Text).tint = color;
        }
    }

    selectPuzzle(puzzle: number): void {
        if (this.active) {
            this.load(puzzle);
        }
    }

    switchPage(sign: -1 | 1): void {
        if (!this.active || this.panel === null) {
            return; // Inactive (animating)
        }

        if ((sign === -1 && this.panel.page === 0) || (sign === 1 && this.panel.page === this.maxPageExclusive)) {
            return; // No more puzzles to the left / right
        }

        const oldPanel = this.panel;
        const newPanel = new Panel(this, oldPanel.page + sign);

        this.active = false;
        this.panel = null;

        newPanel.root.position.set(-sign * Constants.STAGE_WIDTH, 0);

        Animations.easeInOut(oldPanel.root, Util.ZERO, { x: -sign * Constants.STAGE_WIDTH, y: 0 }, () => {
            oldPanel.root.destroy();
        });

        Animations.easeInOut(newPanel.root, { x: sign * Constants.STAGE_WIDTH, y: 0 }, Util.ZERO, () => {
            this.panel = newPanel;
            this.active = true;
        });
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


class Panel {

    readonly root: Container;
    readonly page: number;

    constructor(menu: Menu, page: number) {
        this.root = new PIXI.Container();
        this.page = page;

        const max = Math.min(16, menu.core.puzzles.puzzles.length - (16 * page));
        for (let i = 0; i < max; i++) {
            const puzzleId: number = i + page * 16;
            const button = new PIXI.Container();
            const back = new PIXI.Sprite(menu.core.ui_btn_pipe_empty); // todo: sprite

            const label = new PIXI.Text(String(i + page * 16), {
                fontFamily: 'Arial',
                fontSize: 16,
                fill: Constants.COLOR_WHITE,
            });

            label.position.set(5, 5);

            button.addChild(back);
            button.addChild(label);

            button.eventMode = 'static';
            button.position.set(26 + (i % 4) * 90, 117 + Math.floor(i / 4) * 90);
            button.on('pointertap', () => menu.selectPuzzle(puzzleId));

            this.root.addChild(button);
        }

        menu.menuContainer.addChild(this.root);
    }
}