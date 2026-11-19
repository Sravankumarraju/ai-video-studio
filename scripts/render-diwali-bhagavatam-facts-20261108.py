from pathlib import Path
import importlib.util,json
spec=importlib.util.spec_from_file_location('diwali_render',Path(__file__).with_name('render-diwali-special-20261108.py'))
v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
v.OUT=v.ROOT/'data/productions/divine-wisdom/diwali-bhagavatam-facts-2026-11-08'
v.P=json.loads((v.OUT/'plan.json').read_text(encoding='utf8'))
v.render('short')
