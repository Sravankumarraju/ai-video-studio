from pathlib import Path
from PIL import Image, ImageDraw
import json
root=Path('data/productions/divine-wisdom/chapters-7-10-art')
manifest=json.loads((root/'manifest.json').read_text(encoding='utf8'))
files=[(item,root/(item['name']+'.png')) for item in manifest if (root/(item['name']+'.png')).exists()]
for group in range(0,len(files),4):
    sheet=Image.new('RGB',(1200,736),'#162030')
    draw=ImageDraw.Draw(sheet)
    for index,(item,path) in enumerate(files[group:group+4]):
        picture=Image.open(path).convert('RGB')
        picture.thumbnail((600,337))
        x=(index%2)*600;y=(index//2)*368
        sheet.paste(picture,(x+(600-picture.width)//2,y))
        draw.text((x+12,y+343),item['name'],fill='white')
    sheet.save(root/('review-sheet-'+str(group//4+1)+'.jpg'),quality=92)
print(json.dumps({'savedArt':len(files),'reviewSheets':(len(files)+3)//4}))
