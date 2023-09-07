import type { Container, DisplayObject } from "pixi.js";
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

        const core = menu.core.core.textures;
        const overlay = new PIXI.Graphics();
        const title = new PIXI.Text('puzzle complete!', {
            fontFamily: Fonts.ERAS_BOLD_ITC,
            fontSize: 24,
            fill: Constants.COLOR_WHITE,
        });
        const btnX = new PIXI.Sprite(core.menu_btn_x);
        const btnMain = new PIXI.Sprite(core.menu_btn_main);
        const star = new PIXI.Sprite(core.victory_star);

        overlay.beginFill(Constants.COLOR_BLACK);
        overlay.drawRect(0, 0, Constants.STAGE_WIDTH, Constants.STAGE_HEIGHT);
        overlay.alpha = 0.8;

        title.position.set(Constants.STAGE_WIDTH / 2, 220);
        title.anchor.set(0.5, 0);

        btnX.position.set(10, 10);
        btnX.eventMode = 'static';
        btnX.on('pointertap', () => this.onX());

        btnMain.position.set(Constants.BTN_MAIN_X, Constants.BTN_MAIN_Y);
        btnMain.eventMode = 'static';
        btnMain.on('pointertap', () => this.onMain());

        star.position.set(144, -160);

        this.root.addChild(overlay, star, title, btnX, btnMain);

        const nextPuzzleIsValid: boolean = puzzleId < menu.maxPuzzleInclusive;
        if (nextPuzzleIsValid) {
            const btnNext = new PIXI.Sprite(core.menu_btn_left);

            btnNext.position.set(Constants.BTN_NEXT_X, Constants.BTN_NEXT_Y);
            btnNext.angle += 180;
            btnNext.eventMode = 'static';
            btnNext.on('pointertap', () => this.onNext());

            this.root.addChild(btnNext);
        }

        Animations.fadeIn(this.root, () => {
            this.active = true;
            this.menu.game.updateNextPuzzle(nextPuzzleIsValid); // Once we're finished animating, update the 'next' button on the game beneath us
            this.animateStar(star);
        }, Constants.ANIM_VICTORY_FADE_IN_DELAY_TICKS);

        parent.addChild(this.root);
    }

    private animateStar(star: DisplayObject): void {
        // Star animation pops in from the bottom, after we are fully faded in
        // If we exit this menu before the star is finished moving, that's okay, it will fade out with the rest
        Animations.easeOutBounce(star, { x: star.position.x, y: star.position.y } as const, { x: 144, y: 85 } as const, () => {});
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
                this.menu.enterNextPuzzle(); // And advance back to the next puzzle. Safe because the button is only added if next puzzle is legal
            }, () => {
                this.menu.game.postInit(); // Enable interactivity
            });
        }
    }
}