from pathlib import Path


ROOT = Path(__file__).resolve().parent
html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "styles.css").read_text(encoding="utf-8")

assert 'id="loading"' in html
assert 'id="app"' in html
assert "[hidden]{display:none!important}" in css, (
    "O atributo hidden precisa prevalecer sobre .loading{display:grid}; "
    "caso contrário, a camada de carregamento continua cobrindo o dashboard."
)
print("OK: o estado hidden remove a camada de carregamento.")
