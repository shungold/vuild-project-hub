from PIL import Image
import os, glob

dirs = [
    'photos/projects/onomichi_club/',
    'photos/projects/toyama_tateyama/',
    'photos/projects/rakuten_optimism/'
]
count = 0
saved = 0
for d in dirs:
    for f in glob.glob(d + '*.jpg') + glob.glob(d + '*.png'):
        try:
            img = Image.open(f)
            orig = os.path.getsize(f)
            w, h = img.size
            if w > 1600:
                ratio = 1600 / w
                img = img.resize((1600, int(h * ratio)), Image.LANCZOS)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            img.save(f, 'JPEG', quality=80)
            new_size = os.path.getsize(f)
            saved += orig - new_size
            count += 1
        except Exception as e:
            print('Skip ' + f + ': ' + str(e))

print('Done: ' + str(count) + ' images, saved ' + str(round(saved/1024/1024, 1)) + ' MB')
