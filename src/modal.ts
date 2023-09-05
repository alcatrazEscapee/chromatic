import type { Container } from "pixi.js";
import type { Menu } from "./menu";

import { Animations } from "./animation";
import { Constants, Fonts } from "./gen/constants";


export class VictoryModal {

    readonly menu: Menu;
    readonly root: Container;

    private active: boolean = false;

    constructor(parent: Container, menu: Menu, puzzleId: number) {
        this.menu = menu;
        this.root = new PIXI.Container();

        this.menu.game.preTeardown(); // Disable interactivity on the game object

        const overlay = new PIXI.Graphics();
        const title = new PIXI.Text('VICTORY', {
            fontFamily: Fonts.ERAS_BOLD_ITC,
            fontSize: 36,
            fill: Constants.COLOR_DARK_GREEN,
        });
        const btnX = new PIXI.Sprite(menu.core.menu_btn_x);
        const btnMain = new PIXI.Sprite(menu.core.menu_btn_main);

        overlay.beginFill(Constants.COLOR_BLACK);
        overlay.drawRect(0, 0, Constants.STAGE_WIDTH, Constants.STAGE_HEIGHT);
        overlay.alpha = 0.8;

        title.position.set(Constants.STAGE_WIDTH / 2, 180);
        title.anchor.set(0.5, 0);

        btnX.position.set(75, 180);
        btnX.eventMode = 'static';
        btnX.on('pointertap', () => this.onX());

        btnMain.position.set(75, 300);
        btnMain.eventMode = 'static';
        btnMain.on('pointertap', () => this.onMain());

        this.root.addChild(overlay, title, btnX, btnMain);

        const nextPuzzleId: number = puzzleId + 1;
        if (nextPuzzleId < menu.maxPuzzleInclusive) {
            const btnNext = new PIXI.Sprite(menu.core.menu_btn_left);

            btnNext.position.set(Constants.STAGE_WIDTH - 75, 300 + 40);
            btnNext.angle += 180;
            btnNext.eventMode = 'static';
            btnNext.on('pointertap', () => this.onNext());

            this.root.addChild(btnNext);
        }

        Animations.fadeIn(this.root, () => {
            this.active = true;
        }, Constants.ANIM_VICTORY_FADE_IN_DELAY_TICKS);

        parent.addChild(this.root);
    }

    private onX(): void {
        if (this.active) {
            Animations.fadeOut(this.root, () => {
                this.root.destroy(); // Nuke the modal
                this.menu.game.postInit(); // Re-enable interactivity on the game
            });
        }
    }

    private onMain(): void {
        if (this.active) {
            Animations.fadeToBlack(this.menu.overlayContainer, () => {
                this.root.destroy(); // Nuke the modal
                this.menu.leaveGame();
                this.menu.enterMenu();
            }, () => {
                this.menu.active = true;
            });
        }
    }

    private onNext(): void {
        if (this.active) {
            Animations.fadeToBlack(this.menu.overlayContainer, () => {
                this.root.destroy(); // Nuke the modal
                this.menu.nextPuzzle(); // And advance back to the next puzzle
            }, () => {
                this.menu.game.postInit(); // Enable interactivity
            });
        }
    }
}