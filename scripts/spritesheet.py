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
    
    def __str__(self) -> str: return repr(self)
    def __repr__(self) -> str: return '[x=%d y=%d w=%d h=%d]' % (self.x, self.y, self.w, self.h)


def main():
    parser = ArgumentParser('Basic spritesheet texture packer')
    parser.add_argument('--src', type=str, required=True)
    parser.add_argument('--dest', type=str, required=True)
    parser.add_argument('--key', type=str, required=True)
    parser.add_argument('--no-prefix', action='store_false', default=True, dest='prefix')
    parser.add_argument('--debug', action='store_true', default=False, dest='debug')

    args = parser.parse_args()
    make(args.src, args.dest, args.key, args.prefix, args.debug)


def make(src: str, dest: str, key: str, prefix: bool, debug: bool):

    images: list[Sprite] = []
    for path in os.listdir(src):
        images.append(Sprite(src, path))
    
    images.sort(key=lambda k: (-k.h, -k.w))
    
    area = sum(img.w * img.h for img in images)
    w, h = pack(images)

    if debug:
        print('Packed %d images of area %d into %d x %d = %d (%.2f%% increase)' % (len(images), area, w, h, w * h, 100 * w * h / area))

    sheet = Image.new('RGBA', (w, h))
    for img in images:
        sheet.paste(img.img, (img.x, img.y))
    
    frames = {
        'frames': {
            ('%s_%s' % (key, img.src) if prefix else img.src): {
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
            img.x = img.y = 0

        for n, img in enumerate(images):
            if img.w + scan_x > limit_x:  # Next row
                scan_x = 0
                scan_y = scan_y_next
            
            # Attempt to pack tightly first, in the unused area above the scan line
            # Experimentally, this results in better compression, especially for the 'core' spritesheet (132% -> 110%)
            if not pack_tightly(img, images[:n], max(i.x + i.w for i in images), scan_y):
                img.x = scan_x
                img.y = scan_y

                scan_x += img.w
                scan_y_next = max(scan_y_next, scan_y + img.h)

        width = max(i.x + i.w for i in images)
        height = max(i.y + i.h for i in images)

        if width >= height:  # Require that we get an answer that is wider than it is tall, which should make it square-ish
            return width, height
    
        limit_x += 128


def pack_tightly(img: Sprite, images: list[Sprite], width: int, height: int) -> bool:
    # Attempts to pack a single image within existing area, by placing at the corners of existing images
    # Aborts if it cannot pack without overlapping, or expanding the area
    for src in images:
        for (x, y) in ((src.x + src.w, src.y), (src.x, src.y + src.h)):
            img.x = x
            img.y = y
            if img.x + img.w <= width and img.y + img.h <= height and all(not intersect(img, other) for other in images):
                return True
    return False


def intersect(l: Sprite, r: Sprite) -> bool:
    # Returns true if two sprites intersect
    return not (l.x >= r.x + r.w or r.x >= l.x + l.w or l.y >= r.y + r.h or r.y >= l.y + l.h)


if __name__ == '__main__':
    main()
