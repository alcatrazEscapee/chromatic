import type { IMediaInstance, Sound } from '@pixi/sound';
import type { Container, Sprite } from 'pixi.js';
import { AssetBundle } from './constants';
import { Util } from './game/util';


/**
 * A manager around the `@pixi/sound` library for playing a single background music track. This handles:
 * 
 * - Auto playing and looping the music.
 * - Stopping + starting when called for.
 */
export class MusicPlayer {

    private loaded: boolean = false;
    private music: Sound | null = null;
    private instance: IMediaInstance | null = null;

    public async setup(): Promise<void> {
        if (this.loaded) {
            return;
        }
        this.loaded = true; // Prevent loading multiple times

        Util.debug('Loading @pixi/sound on first interaction');

        const script = document.createElement('script');

        script.type = 'text/javascript';
        script.src = 'lib/pixi-sound.js';
        script.onload = () => {
            Util.debug('Loaded @pixi/sound, performing audio setup');

            script.remove();
            PIXI.sound.Sound.from({
                url: 'audio/music.mp3',
                preload: true,
                loaded: (err, sound) => {
                    if (sound) {
                        Util.debug('Loaded music, audio playback is now possible');
                        this.music = sound;
                    } else {
                        throw err;
                    }
                }
            });
        };
        document.body.appendChild(script);
    }

    public start(): void {
        this.instance = this.music?.play({ loop: true, volume: 0.2 }) as IMediaInstance ?? null;
    }

    public stop(): void {
        this.instance?.stop();
        this.instance = null;
    }

    public isPlaying(): boolean {
        return this.instance !== null;
    }
}

export class VolumeButton {
    
    readonly root: Container;
    readonly on: Sprite;
    readonly off: Sprite;
    readonly parent: MusicPlayer;

    constructor(core: AssetBundle, parent: MusicPlayer) {
        this.root = new PIXI.Container();
        this.on = new PIXI.Sprite(core.core.textures.volume_on);
        this.off = new PIXI.Sprite(core.core.textures.volume_off);
        this.parent = parent;

        this.root.addChild(parent.isPlaying() ? this.on : this.off);
    }

    public toggle(): void {
        if (this.parent.isPlaying()) {
            this.parent.stop();
            this.root.removeChild(this.on);
            this.root.addChild(this.off);
        } else {
            this.parent.start();
            if (this.parent.isPlaying()) { // Need to check if start playing actually worked
                this.root.removeChild(this.off);
                this.root.addChild(this.on);
            }
        }
    }

    public update(): void {
        this.root.removeChildAt(0);
        this.root.addChild(this.parent.isPlaying() ? this.on : this.off);
    }
}