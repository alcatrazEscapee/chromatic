import type { Container, DisplayObject } from 'pixi.js';
import { Animations } from './animation';
import { ColorId, Constants, Fonts } from './constants';
import { Util } from './game/util';
import type { Menu } from './menu';


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
        const title = Util.text('puzzle complete!', Fonts.ERAS_BOLD_ITC, 24);
        const btnX = new PIXI.Sprite(core.menu_btn_x);
        const btnMain = new PIXI.Sprite(core.menu_btn_main);
        const star = new PIXI.Sprite(core.victory_star);

        overlay.beginFill(Constants.COLOR_BLACK);
        overlay.drawRect(0, 0, Constants.STAGE_WIDTH, Constants.STAGE_HEIGHT);
        overlay.alpha = 0.8;

        title.position.set(Constants.STAGE_WIDTH_HALF, 220);
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


export class TooltipModal {

    readonly root: Container;
    done: boolean;

    constructor(parent: Container, menu: Menu, type: 'Input' | 'Output' | 'Filter', color: ColorId, pressure: PressureId = 1) {
        this.root = new PIXI.Container();
        this.done = false;

        menu.game.preTeardown(); // Disable interactivity on the game object
        parent.addChild(this.root);

        Animations.fadeIn(this.root, () => {
            this.done = true;
        });

        const overlay = new PIXI.Graphics();

        overlay.beginFill(Constants.COLOR_BLACK);
        overlay.drawRect(0, 0, Constants.STAGE_WIDTH, Constants.STAGE_HEIGHT);
        overlay.alpha = 0.8;

        this.root.addChild(overlay);

        const textIO = Util.text(type, Fonts.ARIAL, 32, Constants.COLOR_WHITE, true);
        const textColor = Util.text(Util.COLOR_NAMES[color], Fonts.ARIAL, 20, Util.COLORS[color], true);

        this.root.addChild(textIO, textColor);

        textIO.anchor.set(0.5, 0);
        textIO.position.set(Constants.STAGE_WIDTH_HALF, 120);

        let lineY = 170;

        // For filters, we don't display the multiplier, but everything else renders mostly identically
        // It slightly changes the positioning for colors that are not mixes
        const mixes = Util.mixes(color);
        const textMultiplier = type === 'Filter' ? null : Util.text(`${pressure} x `, Fonts.ARIAL, 20);

        if (textMultiplier !== null) {
            this.root.addChild(textMultiplier);
        }

        if (mixes.length === 0) {
            // This color is not a mix, so we just display two lines
            //  Input
            // 1 x Red
            if (textMultiplier !== null) {
                const width = textMultiplier.width + textColor.width;

                textMultiplier.position.set(Constants.STAGE_WIDTH_HALF - width / 2, lineY);
                textColor.position.set(Constants.STAGE_WIDTH_HALF - width / 2 + textMultiplier.width, lineY);
            } else {
                textColor.anchor.set(0.5, 0);
                textColor.position.set(Constants.STAGE_WIDTH_HALF, lineY);
            }
        } else {
            // This color is a mix, so we display each mix (one, or three if brown)
            //         Input
            // 1 x Green = Blue + Yellow
            //           = ...
            let equalWidth: number = -1;

            for (const [lhs, rhs] of mixes) {
                const textEqual = Util.text(' = ', Fonts.ARIAL, 20);
                const textLeft = Util.text(Util.COLOR_NAMES[lhs], Fonts.ARIAL, 20, Util.COLORS[lhs], true);
                const textAdd = Util.text(' + ', Fonts.ARIAL, 20);
                const textRight = Util.text(Util.COLOR_NAMES[rhs], Fonts.ARIAL, 20, Util.COLORS[rhs], true);

                // First iteration initialization - need to do this once we created the ' = ' text for proper positioning
                if (equalWidth === -1) {
                    equalWidth = textEqual.width;

                    textColor.position.set(Constants.STAGE_WIDTH_HALF - equalWidth / 2 - textColor.width, lineY);
                    
                    if (textMultiplier !== null) {
                        textMultiplier.position.set(textColor.x - textMultiplier.width, lineY);
                    }
                }

                textEqual.anchor.set(0.5, 0);
                textEqual.position.set(Constants.STAGE_WIDTH_HALF, lineY);

                textLeft.position.set(Constants.STAGE_WIDTH_HALF + equalWidth / 2, lineY);
                textAdd.position.set(textLeft.x + textLeft.width, lineY);
                textRight.position.set(textAdd.x + textAdd.width, lineY);

                this.root.addChild(textEqual, textLeft, textAdd, textRight);

                lineY += 30;
            }
        }
    }
}