import base64
import io
import json
import os
import socket
import struct
import subprocess
import time
import urllib.request
from PIL import Image

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORT = 9333
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT = os.path.join(ROOT, "public", "landing", "previews")
PROFILE = os.path.join(os.environ.get("TEMP", ROOT), "undc-preview-capture")
PAGES = {
    "ensamblar-pc.png": "view=assembly",
    "ensamblar-laptop.png": "view=laptop",
    "conectar-estacion.png": "view=setup",
    "explorar-modelos.png": "view=library&model=motherboard",
}
ACTIONS = {
    "ensamblar-pc.png": [
        ("Disipador", 1),
        ("Vista frontal del interior", 1),
        ("Cerrar y atornillar gabinete", 1),
    ],
    "ensamblar-laptop.png": [("Comprobar y encender", 1), ("Alejar", 2)],
    "conectar-estacion.png": [("Comprobar y encender", 1), ("Acercar", 2)],
    "explorar-modelos.png": [("Alejar modelo", 1)],
}


class DevTools:
    def __init__(self, url: str):
        host_port, path = url.removeprefix("ws://").split("/", 1)
        host, port = host_port.split(":")
        self.socket = socket.create_connection((host, int(port)), timeout=30)
        key = base64.b64encode(os.urandom(16)).decode()
        request = (
            f"GET /{path} HTTP/1.1\r\nHost: {host_port}\r\nUpgrade: websocket\r\n"
            f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
        )
        self.socket.sendall(request.encode())
        response = b""
        while b"\r\n\r\n" not in response:
            response += self.socket.recv(4096)
        if b" 101 " not in response.split(b"\r\n", 1)[0]:
            raise RuntimeError("No se pudo conectar con DevTools")
        self.serial = 0

    def _send(self, payload: bytes):
        mask = os.urandom(4)
        length = len(payload)
        header = bytearray([0x81])
        if length < 126:
            header.append(0x80 | length)
        elif length < 65536:
            header.append(0x80 | 126)
            header.extend(struct.pack("!H", length))
        else:
            header.append(0x80 | 127)
            header.extend(struct.pack("!Q", length))
        header.extend(mask)
        header.extend(bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload)))
        self.socket.sendall(header)

    def _exact(self, length: int) -> bytes:
        data = b""
        while len(data) < length:
            chunk = self.socket.recv(length - len(data))
            if not chunk:
                raise ConnectionError("DevTools cerró la conexión")
            data += chunk
        return data

    def _receive(self) -> str:
        fragments = bytearray()
        while True:
            first, second = self._exact(2)
            finished = bool(first & 0x80)
            opcode = first & 0x0F
            length = second & 0x7F
            if length == 126:
                length = struct.unpack("!H", self._exact(2))[0]
            elif length == 127:
                length = struct.unpack("!Q", self._exact(8))[0]
            mask = self._exact(4) if second & 0x80 else None
            payload = bytearray(self._exact(length))
            if mask:
                payload = bytearray(
                    byte ^ mask[index % 4] for index, byte in enumerate(payload)
                )
            if opcode == 0x9:
                continue
            if opcode in (0x1, 0x0):
                fragments.extend(payload)
                if finished:
                    return fragments.decode()

    def command(self, method: str, params=None):
        self.serial += 1
        request_id = self.serial
        self._send(
            json.dumps(
                {"id": request_id, "method": method, "params": params or {}}
            ).encode()
        )
        while True:
            response = json.loads(self._receive())
            if response.get("id") == request_id:
                if "error" in response:
                    raise RuntimeError(response["error"])
                return response.get("result", {})


def targets():
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json", timeout=2) as response:
        return json.load(response)


def main():
    os.makedirs(OUTPUT, exist_ok=True)
    process = subprocess.Popen(
        [
            EDGE,
            "--headless=new",
            f"--remote-debugging-port={PORT}",
            f"--user-data-dir={PROFILE}",
            "--no-first-run",
            "--disable-default-apps",
            "--hide-scrollbars",
            "--window-size=1600,900",
            "--force-device-scale-factor=1",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        deadline = time.time() + 20
        page = None
        while time.time() < deadline:
            try:
                page = next(item for item in targets() if item["type"] == "page")
                break
            except (OSError, StopIteration):
                time.sleep(0.25)
        if not page:
            raise RuntimeError("Edge no inició DevTools")
        devtools = DevTools(page["webSocketDebuggerUrl"])
        devtools.command("Page.enable")
        devtools.command(
            "Emulation.setDeviceMetricsOverride",
            {"width": 1600, "height": 900, "deviceScaleFactor": 1, "mobile": False},
        )
        devtools.command("Page.navigate", {"url": "http://127.0.0.1:5173/"})
        time.sleep(4)
        installed_pc = [
            "standoffs", "board", "board-screws", "cpu", "paste", "cooler", "ram",
            "ssd", "gpu", "psu", "fan-top", "fan-middle", "fan-bottom", "fan-rear",
        ]
        connected_pc = [
            "fan-top", "fan-middle", "fan-bottom", "fan-rear", "cpu-fan", "atx",
            "eps", "pcie",
        ]
        installed_laptop = [
            "base", "motherboard", "ram", "ssd", "wifi", "screen", "antennas",
            "heatpipe", "fan", "fanConnector", "screenFlex", "speakers", "battery",
            "batteryConnector", "keyboard", "keyboardConnector", "lowerCover", "screws",
        ]
        storage = {
            "ensamble-pc-undc:v2": json.dumps({
                "version": 3,
                "session": {
                    "mode": "learn",
                    "assembly": {
                        "installed": installed_pc,
                        "connected": connected_pc,
                        "powered": False,
                    },
                    "errors": 0,
                    "hints": 0,
                    "guidedInstalls": 0,
                    "modeChanges": 0,
                    "log": [],
                },
            }),
            "undc-laptop-assembly-v3": json.dumps({"installed": installed_laptop}),
            "ensamble-pc-undc:setup-v1": json.dumps([
                "video", "monitor-power", "pc-power", "keyboard-usb", "mouse-usb",
            ]),
        }
        devtools.command(
            "Runtime.evaluate",
            {
                "expression": "".join(
                    f"localStorage.setItem({json.dumps(key)}, {json.dumps(value)});"
                    for key, value in storage.items()
                )
            },
        )
        only = os.environ.get("PREVIEW_ONLY")
        for filename, query in PAGES.items():
            if only and filename != only:
                continue
            devtools.command(
                "Page.navigate", {"url": f"http://127.0.0.1:5173/?{query}"}
            )
            time.sleep(10)
            if filename != "ensamblar-pc.png":
                devtools.command(
                    "Runtime.evaluate",
                    {
                        "expression": """(() => {
                            const style = document.createElement('style');
                            style.textContent = '.scene-label,.airflow-label{display:none!important}';
                            document.head.appendChild(style);
                        })()""",
                    },
                )
            for label, count in ACTIONS.get(filename, []):
                for _ in range(count):
                    devtools.command(
                        "Runtime.evaluate",
                        {
                            "expression": f"""(() => {{
                                const label = {json.dumps(label)};
                                const button = [...document.querySelectorAll('button')].find(
                                    item => !item.disabled && (
                                        item.textContent.trim().includes(label) ||
                                        item.getAttribute('aria-label') === label
                                    )
                                );
                                if (button) button.click();
                                return Boolean(button);
                            }})()""",
                            "returnByValue": True,
                        },
                    )
                    time.sleep(1.2)
            devtools.command(
                "Runtime.evaluate",
                {
                    "expression": "document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))",
                    "awaitPromise": True,
                    "returnByValue": True,
                },
            )
            bounds = devtools.command(
                "Runtime.evaluate",
                {
                    "expression": """(() => {
                        const canvas = document.querySelector('.canvas-container canvas');
                        if (!canvas) throw new Error('No se encontró el visor 3D');
                        const rect = canvas.getBoundingClientRect();
                        return {x: rect.x, y: rect.y, width: rect.width, height: rect.height};
                    })()""",
                    "returnByValue": True,
                },
            )["result"]["value"]
            result = devtools.command(
                "Page.captureScreenshot",
                {
                    "format": "png",
                    "fromSurface": True,
                    "captureBeyondViewport": True,
                    "clip": {
                        "x": bounds["x"],
                        "y": bounds["y"],
                        "width": bounds["width"],
                        "height": bounds["height"],
                        "scale": 1,
                    },
                },
            )
            image = Image.open(io.BytesIO(base64.b64decode(result["data"]))).convert("RGB")
            if filename == "ensamblar-laptop.png":
                width, height = image.size
                left = min(80, max(0, width - 907))
                crop_width = width - left
                crop_height = round(crop_width * 9 / 16)
                top = 0
                image = image.crop((left, top, width, top + crop_height))
            elif filename == "conectar-estacion.png":
                width, height = image.size
                crop_width = min(width, round(height * 16 / 9))
                left = min(100, max(0, width - crop_width))
                image = image.crop((left, 0, left + crop_width, height))
                centered = Image.new("RGB", image.size, image.getpixel((0, 0)))
                centered.paste(image, (-130, 0))
                image = centered
            image.save(os.path.join(OUTPUT, filename), "PNG", optimize=True)
        devtools.socket.close()
    finally:
        process.terminate()
        try:
            process.wait(timeout=8)
        except subprocess.TimeoutExpired:
            process.kill()


if __name__ == "__main__":
    main()
