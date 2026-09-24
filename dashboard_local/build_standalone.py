"""Gera uma versão autônoma do dashboard que abre diretamente pelo Explorador."""

from __future__ import annotations

import json
import base64
import re
import mimetypes
from pathlib import Path


LOCAL = Path(__file__).resolve().parent
ROOT = LOCAL.parent
CLIENT_OUTPUT = ROOT / "Dashboard Atualizado.html"
ADMIN_OUTPUT = ROOT / "Dashboard Administrativo.html"


def client_payload(data: dict) -> dict:
    """Keep the shareable artifact client-facing while retaining all client filters."""
    payload = dict(data)
    payload.pop("quality", None)
    return payload


def client_logos(data: dict) -> str:
    """Discover logos by client key; embed them so file:// copies remain portable."""
    logos = {}
    folder = ROOT / "logos"
    files = sorted(folder.iterdir(), key=lambda path: path.name.lower()) if folder.exists() else []
    for client in data.get("clients", []):
        key = client["key"]
        aliases = [key, "ASUS"] if key == "ACBZ" else [key]
        matches = [path for path in files if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".svg"}
                   and any(re.match(re.escape(alias) + r"(?:$|[^a-z0-9])", path.stem, re.I) for alias in aliases)]
        if matches:
            exact = next((path for path in matches if path.stem.upper() == key.upper()), matches[0])
            mime = mimetypes.guess_type(exact.name)[0] or "image/png"
            logos[key] = f"data:{mime};base64,{base64.b64encode(exact.read_bytes()).decode('ascii')}"
    return "window.CLIENT_LOGOS=" + json.dumps(logos) + ";"


def build(mode: str, output: Path) -> None:
    html = (LOCAL / "index.html").read_text(encoding="utf-8")
    css = (LOCAL / "styles.css").read_text(encoding="utf-8")
    app = (LOCAL / "app.js").read_text(encoding="utf-8")
    data = json.loads((LOCAL / "data" / "dashboard_data.json").read_text(encoding="utf-8"))
    logos_script = client_logos(data)
    (LOCAL / "assets" / "client-logos.js").write_text(logos_script, encoding="utf-8")
    html = html.replace('<script src="assets/client-logos.js?v=1"></script>', f'<script>{logos_script}</script>')
    if mode == "client":
        data = client_payload(data)
    data_text = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    safe_data = data_text.replace("</script", "<\\/script").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")

    logo_path = LOCAL / "assets" / "dsv-logo.png"
    logo_data = base64.b64encode(logo_path.read_bytes()).decode("ascii")
    html = html.replace('src="assets/dsv-logo.png"', f'src="data:image/png;base64,{logo_data}"')

    favicon_path = LOCAL / "assets" / "favicon.png"
    favicon_data = base64.b64encode(favicon_path.read_bytes()).decode("ascii")
    html = html.replace('href="assets/favicon.png?v=2"', f'href="data:image/png;base64,{favicon_data}"')

    html = html.replace('<link rel="stylesheet" href="styles.css?v=13">', f"<style>\n{css}\n</style>")
    html = html.replace('<script src="app.js?v=12" defer></script>', f'<script>window.DASHBOARD_MODE="{mode}";window.EMBEDDED_DASHBOARD_DATA={safe_data};</script>\n<script>\n{app}\n</script>')
    html = html.replace('href="../outputs/01a08633-89b4-7283-8814-f0b65f6970f7/ParametrosOperacionais.xlsx"', 'href="outputs/01a08633-89b4-7283-8814-f0b65f6970f7/ParametrosOperacionais.xlsx"')
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(html, encoding="utf-8")
    temporary.replace(output)
    print(f"Gerado: {output} ({output.stat().st_size:,} bytes)")


def main() -> None:
    build("client", CLIENT_OUTPUT)
    build("admin", ADMIN_OUTPUT)


if __name__ == "__main__":
    main()
