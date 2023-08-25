import os
import json

from PIL import Image
from argparse import ArgumentParser


class Sprite:
    img: Image.Image
    src: str
    x: int
    y: int
    w: int
    h: int

    def __init__(self, src: str, path: str):
        self.img = Image.open('%s/%s' % (src, path))
        self.src = path.split('.')[0]
        self.x = self.y = 0
        self.w, self.h = self.img.size


def main():
    parser = ArgumentParser('Basic Sprite-sheet Texture packer')
    parser.add_argument('--src', type=str, required=True)
    parser.add_argument('--dest', type=str, required=True)
    parser.add_argument('--key', type=str, required=True)
    parser.add_argument('--debug', action='store_true', default=False, dest='debug')

    args = parser.parse_args()
    make(args.src, args.dest, args.key, args.debug)


def make(src: str, dest: str, key: str, debug: bool):

    images: list[Sprite] = []
    for path in os.listdir(src):
        images.append(Sprite(src, path))
    
    images.sort(key=lambda k: (-k.h, -k.w))
    
    w, h = pack(images)

    sheet = Image.new('RGBA', (w, h))
    for img in images:
        sheet.paste(img.img, (img.x, img.y))
    
    frames = {
        'frames': {
            '%s_%s' % (key, img.src): {
                'frame': {
                    'x': img.x,
                    'y': img.y,
                    'w': img.w,
                    'h': img.h,
                }
            }
            for img in images
        },
        'meta': {
            'scale': 1,
            'image': '%s.png' % key,
        }
    }
    
    sheet.save('%s/%s.png' % (dest, key))

    with open('%s/%s@1x.png.json' % (dest, key), 'w', encoding='utf-8') as f:
        json.dump(frames, f, indent=2 if debug else None)


def pack(images: list[Sprite]) -> tuple[int, int]:
    limit_x = 128
    
    while True:  # Loop until we have an acceptable solution
        scan_x = 0
        scan_y = 0
        scan_y_next = 0

        for img in images:
            if img.w + scan_x > limit_x:  # Next row
                scan_x = 0
                scan_y = scan_y_next
            img.x = scan_x
            img.y = scan_y

            scan_x += img.w
            scan_y_next = max(scan_y_next, scan_y + img.h)
        
        width = max(i.x + i.w for i in images)
        height = max(i.y + i.h for i in images)

        if width >= height:  # Require that we get an answer that is wider than it is tall, which should make it square-ish
            return width, height
    
        limit_x *= 2


if __name__ == '__main__':
    main()
