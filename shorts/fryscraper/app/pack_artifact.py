"""Assemble the artifact page: inline the single JS + CSS bundle into a body-only HTML (the host adds the skeleton)."""
import glob, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, "dist-artifact")
js = open(glob.glob(os.path.join(D, "assets", "*.js"))[0], encoding="utf8").read()
css = open(glob.glob(os.path.join(D, "assets", "*.css"))[0], encoding="utf8").read()
js = js.replace("</script", "<\\/script")
page = f"""<title>Skyscraper Cooked a Car</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>{css}</style>
<div id="root"></div>
<script type="module">{js}</script>
"""
out = os.path.join(HERE, "artifact", "index.html")
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "w", encoding="utf8").write(page)
print(out, round(len(page) / 1e6, 2), "MB")
