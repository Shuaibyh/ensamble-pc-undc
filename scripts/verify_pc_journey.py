"""Local UI regression check. Uses a disposable Edge profile, never a user's session."""
import base64
import json
import os
import subprocess
import socket
import tempfile
import time
import urllib.request
from pathlib import Path
from capture_previews import DevTools, EDGE

OUTPUT = Path(__file__).resolve().parents[1] / 'docs' / 'qa-pc-journey'
with socket.socket() as endpoint:
    endpoint.bind(('127.0.0.1', 0))
    PORT = endpoint.getsockname()[1]


class Browser(DevTools):
    def __init__(self, url):
        super().__init__(url)
        self.errors = []
        self.network_errors = []

    def _receive(self):
        raw = super()._receive()
        event = json.loads(raw)
        if event.get('method') == 'Runtime.exceptionThrown':
            self.errors.append(event['params'])
        if event.get('method') == 'Runtime.consoleAPICalled' and event['params'].get('type') == 'error':
            self.errors.append(event['params'])
        if event.get('method') == 'Log.entryAdded':
            entry = event['params']['entry']
            if entry.get('level') == 'error':
                self.errors.append(entry)
        if event.get('method') == 'Network.responseReceived':
            response = event['params']['response']
            if response['status'] >= 400:
                self.network_errors.append([response['status'], response['url']])
        return raw

    def js(self, expression):
        result = self.command('Runtime.evaluate', {'expression': expression, 'returnByValue': True})
        if result.get('exceptionDetails'):
            raise AssertionError(result['exceptionDetails'])
        return result.get('result', {}).get('value')

    def wait(self, expression, timeout=25):
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                if self.js(expression):
                    return
            except RuntimeError as error:
                if not any(text in str(error) for text in ['navigated', 'context', 'active page']):
                    raise
            time.sleep(.25)
        raise AssertionError('Timed out: ' + expression + '\n' + str(self.js('document.body.innerText'))[-2500:])

    def click(self, text):
        selector = f"[...document.querySelectorAll('button,a')].find(e => e.textContent.replace(/\\s+/g, ' ').trim().startsWith({json.dumps(text)}) && !e.disabled)"
        self.wait(f'Boolean({selector})')
        self.js(f'({selector}).click()')
        time.sleep(.2)

    def screenshot(self, name):
        result = self.command('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': False})
        (OUTPUT / (name + '.png')).write_bytes(base64.b64decode(result['data']))

    def viewport(self, width, height=950):
        self.command('Emulation.setDeviceMetricsOverride', {'width': width, 'height': height, 'deviceScaleFactor': 1, 'mobile': False})
        time.sleep(.4)

    def navigate(self, path):
        self.command('Page.navigate', {'url': 'http://127.0.0.1:4173' + path})
        self.wait(f"location.pathname === {json.dumps(path.split('?')[0])} && document.readyState === 'complete' && Boolean(document.querySelector('h1'))")


def verify_secondary(browser):
    browser.viewport(1440)
    browser.navigate('/ensamblar-laptop')
    browser.wait("document.querySelector('.laptop-workspace canvas') !== null", timeout=40)
    browser.wait("document.querySelector('.laptop-load-message') === null", timeout=40)
    browser.click('Instalar')
    browser.wait("document.querySelector('.laptop-catalog .panel-heading').textContent.includes('1/17')")
    browser.wait("!document.querySelector('[data-part]').disabled")
    browser.screenshot('laptop')
    browser.click('← Volver al inicio')
    browser.click('Explorar modelos →')
    browser.wait("document.querySelector('.received-case canvas') !== null", timeout=40)
    browser.wait("document.querySelector('.resource-message') === null", timeout=40)
    browser.click('Monitor')
    browser.wait("document.querySelector('.received-details h2').textContent === 'Monitor'")
    browser.wait("document.querySelector('.resource-message') === null", timeout=40)
    time.sleep(1)
    browser.screenshot('explorer')
    browser.click('Volver al inicio')
    browser.click('Comenzar')
    browser.command('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-reduced-motion', 'value': 'reduce'}]})
    assert browser.js("getComputedStyle(document.querySelector('.pc-phase')).animationName") == 'none'
    browser.js("Storage.prototype.setItem = function() { throw new Error('QA: storage disabled'); }")
    browser.click('Practicar')
    browser.wait("document.body.textContent.includes('El navegador no permite guardar')")
    browser.click('Instalar')
    browser.wait("document.querySelector('[data-part=standoffs] .badge.success') !== null")
    browser.click('Inicio')
    browser.click('Comenzar')
    browser.wait("document.querySelector('[data-part=standoffs] .badge.success') !== null")
    assert not browser.errors, browser.errors
    assert not browser.network_errors, browser.network_errors


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    profile = tempfile.mkdtemp(prefix='undc-journey-qa-')
    preferences = Path(profile) / 'Default'
    preferences.mkdir()
    (preferences / 'Preferences').write_text(json.dumps({'signin': {'allowed': False}, 'browser': {'has_seen_welcome_page': True}}))
    process = subprocess.Popen([EDGE, '--headless=new', f'--remote-debugging-port={PORT}',
        f'--user-data-dir={profile}', '--no-first-run', '--disable-default-apps',
        '--window-size=1440,950', '--enable-unsafe-swiftshader',
        '--disable-features=msEdgeFirstRunExperience,msEdgeOnRampFRE,msImplicitSignin', 'about:blank'],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW)
    checks = []
    browser = None
    try:
        deadline = time.time() + 25
        while time.time() < deadline:
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json', timeout=2) as response:
                    target = next(x for x in json.load(response) if x['type'] == 'page' and not x['url'].startswith('edge:'))
                browser = Browser(target['webSocketDebuggerUrl'])
                break
            except (OSError, StopIteration):
                time.sleep(.25)
        assert browser, 'Edge did not start'
        for feature in ['Page', 'Runtime', 'Log', 'Network']:
            browser.command(feature + '.enable')
        print('Connected to disposable Edge; checking landing', flush=True)
        browser.navigate('/')
        if os.environ.get('QA_EXTRAS_ONLY'):
            verify_secondary(browser)
            checks.append('Laptop model loaded and installation works; explorer model loaded and switched; return navigation; reduced motion; in-memory progress with storage disabled')
            print(checks[-1], flush=True)
            return
        browser.wait("document.querySelectorAll('.module-card').length === 3")
        assert browser.js("[...document.querySelectorAll('.module-card h3')].map(e=>e.textContent)") == ['Ensamblar PC', 'Ensamblar laptop', 'Explorar modelos']
        assert browser.js("document.querySelector('.project-metrics').textContent.replace(/\\s+/g, ' ').includes('3 experiencias')")
        browser.click('Simuladores')
        assert browser.js("document.querySelectorAll('.simulator-dropdown a').length") == 3
        browser.click('Simuladores')
        for width in [1440, 900, 390]:
            browser.viewport(width)
            browser.js("document.querySelector('#experiencias').scrollIntoView()")
            assert browser.js('document.documentElement.scrollWidth <= innerWidth'), f'Overflow at {width}'
            browser.screenshot(f'landing-{width}')
        checks.append('Landing: 3 cards, 3 menu entries, metric, responsive 1440/900/390')
        browser.viewport(1440)
        browser.js('scrollTo(0,0)')
        browser.click('Comenzar')
        for mode in ['Aprender', 'Practicar']:
            browser.wait("location.pathname === '/ensamblar-pc'")
            browser.click(mode)
            browser.wait("document.querySelectorAll('[data-part]').length > 0")
            ids = browser.js("[...document.querySelectorAll('[data-part]')].map(e=>e.dataset.part)")
            for part in ids:
                browser.wait("![...document.querySelectorAll('[data-part]')].some(e=>e.disabled)", timeout=25)
                browser.js(f"document.querySelector('[data-part={part}]').click()")
                browser.wait(f"document.querySelector('[data-part={part}]').getAttribute('aria-pressed') === 'true'")
                browser.wait("Boolean(document.querySelector('.details-content .detail-actions button:not(:disabled)'))")
                browser.js("document.querySelector('.details-content .detail-actions button').click()")
                browser.wait(f"document.querySelector('[data-part={part}]').innerText.includes('Instalada')")
            browser.wait("![...document.querySelectorAll('[data-part]')].some(e=>e.disabled)")
            buttons = browser.js("[...document.querySelectorAll('.connection-row button')].map(e=>e.getAttribute('aria-label'))")
            for label in buttons:
                browser.js(f"document.querySelector('button[aria-label={json.dumps(label)}]').click()")
                time.sleep(.15)
            browser.click('Cerrar y atornillar gabinete')
            print(mode + ': internal assembly and closure passed', flush=True)
            browser.wait("document.querySelector('.progress-panel').innerText.includes('Ensamblaje interno completado')")
            browser.click('Continuar a conexión de estación →')
            browser.wait("location.pathname === '/conectar-estacion'")
            browser.wait("Boolean(document.querySelector('.setup-connection'))")
            assert mode in browser.js("document.querySelector('.setup-workspace .eyebrow').textContent")
            browser.click('Comprobar y encender')
            browser.wait("document.querySelector('.setup-panel [role=status]').innerText.includes('Falta conectar')")
            for index in range(5):
                browser.wait("![...document.querySelectorAll('.setup-connection')].some(e=>e.disabled)")
                browser.js(f"document.querySelectorAll('.setup-connection')[{index}].click()")
                browser.wait(f"document.querySelectorAll('.setup-connection')[{index}].getAttribute('aria-pressed') === 'true'")
            browser.click('← Volver al ensamblaje')
            browser.click('Continuar a conexión de estación →')
            browser.wait("document.querySelectorAll('.setup-connection.connected').length === 5")
            browser.js('window.__qaReloadPending = true')
            browser.command('Page.reload')
            browser.wait("!window.__qaReloadPending && document.readyState === 'complete'")
            browser.wait("document.querySelectorAll('.setup-connection.connected').length === 5")
            assert mode in browser.js("document.querySelector('.setup-workspace .eyebrow').textContent")
            browser.click('Comprobar y encender')
            browser.wait("document.querySelector('.pc-desktop.ready') !== null")
            browser.screenshot('completed-' + mode)
            browser.viewport(390)
            browser.js('scrollTo(0,0)')
            assert browser.js('document.documentElement.scrollWidth <= innerWidth'), 'Station mobile overflow'
            browser.screenshot('station-mobile-' + mode)
            browser.viewport(1440)
            browser.js('history.back()')
            browser.wait("location.pathname === '/ensamblar-pc'")
            browser.js('history.forward()')
            browser.wait("location.pathname === '/conectar-estacion'")
            browser.wait("document.querySelector('.pc-desktop.ready') !== null")
            browser.click('Reiniciar experiencia')
            browser.wait("location.pathname === '/ensamblar-pc'")
            browser.wait("document.querySelectorAll('.catalog-list .badge.success').length === 0")
            checks.append(mode + ': full UI assembly, closure, station, validation, boot, refresh, history, reset')
            print(checks[-1], flush=True)
            browser.command('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-reduced-motion', 'value': 'reduce'}]})
        browser.navigate('/conectar-estacion')
        browser.wait("document.querySelector('.setup-workspace .notice') !== null")
        assert browser.js("document.querySelectorAll('.setup-connection.connected').length") == 0
        browser.click('Ir al ensamblaje')
        browser.click('Inicio')
        browser.click('Armar laptop →')
        browser.wait("document.querySelector('.laptop-workspace canvas') !== null", timeout=40)
        browser.screenshot('laptop')
        browser.click('← Volver al inicio')
        browser.click('Explorar modelos →')
        browser.wait("document.querySelector('.received-case canvas') !== null", timeout=40)
        browser.screenshot('explorer')
        browser.click('Volver al inicio')
        checks.append('Direct station route preserved, laptop and explorer load and return home')
        assert not browser.network_errors, browser.network_errors
        assert not browser.errors, browser.errors
        checks.append('No browser exceptions, console errors or HTTP errors')
    finally:
        report = {'checks': checks, 'errors': browser.errors if browser else [], 'network_errors': browser.network_errors if browser else []}
        report_name = 'report-secondary.json' if os.environ.get('QA_EXTRAS_ONLY') else 'report.json'
        (OUTPUT / report_name).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        if browser:
            try:
                browser.screenshot('last-state')
            except (OSError, RuntimeError):
                pass
            try:
                browser.command('Browser.close')
            except (OSError, RuntimeError):
                pass
            browser.socket.close()
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
    print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)


if __name__ == '__main__':
    main()
