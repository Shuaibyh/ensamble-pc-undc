"""UX regression on localhost, in a disposable headless Edge profile."""
import json
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path
import verify_pc_journey as qa

qa.OUTPUT = Path(__file__).resolve().parents[2] / 'docs' / 'qa-ux-polish'
qa.OUTPUT.mkdir(parents=True, exist_ok=True)


def input_value(browser, selector, value):
    browser.js(f"""(() => {{ const el = document.querySelector({json.dumps(selector)});
      const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, {json.dumps(value)});
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', {{bubbles:true}})); }})()""")
    time.sleep(.25)


def ready(browser):
    browser.wait("![...document.querySelectorAll('.resource-message, .laptop-load-message, .scene-fallback')].some(e => e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))", timeout=60)


def verify(browser, checks):
    sizes = [(1920, 1080), (1440, 900), (1366, 768), (900, 1024), (390, 844)]
    routes = [('/explorar-modelos', 'explorer'), ('/creditos', 'credits')]
    for path, name in routes:
        browser.navigate(path)
        ready(browser)
        if name == 'credits':
            browser.js("document.querySelector('.credits-section details').open = true")
        for width, height in sizes:
            browser.viewport(width, height)
            browser.js("document.querySelector('#creditos').scrollIntoView()" if name == 'credits' else 'scrollTo(0,0)')
            assert browser.js('document.documentElement.scrollWidth <= innerWidth'), (name, width, 'overflow')
            # Inspect viewer toolbar containment; document overflow alone misses clipped controls.
            assert browser.js("[...document.querySelectorAll('.viewer-toolbar')].every(e => e.getBoundingClientRect().bottom <= e.parentElement.getBoundingClientRect().bottom + 2)"), (name, width, 'clipped toolbar')
            browser.screenshot(f'{name}-{width}')
        checks.append(f'{name}: five viewport sizes, no horizontal overflow or clipped toolbar')
        print(checks[-1], flush=True)

    browser.viewport(1440, 900)
    browser.navigate('/explorar-modelos')
    ready(browser)
    total = browser.js("document.querySelectorAll('.model-chip').length")
    input_value(browser, '.model-filters input', 'monitor')
    assert browser.js("document.querySelectorAll('.model-chip').length") < total
    browser.click('Monitor')
    ready(browser)
    assert browser.js("document.querySelector('.received-details h2').textContent") == 'Monitor'
    assert browser.js("document.querySelectorAll('.received-details a').length") >= 2
    input_value(browser, '.model-filters input', 'zzzz-no-model')
    browser.wait("!!document.querySelector('.model-empty')")
    browser.click('Limpiar filtros')
    assert browser.js("document.querySelectorAll('.model-chip').length") == total
    input_value(browser, '.model-filters select', 'Laptop')
    assert browser.js("document.querySelectorAll('.model-chip').length") == 4
    browser.screenshot('explorer-filtered')
    checks.append('Explorer: search, category, empty state, reset, selection, attribution')

    browser.navigate('/ensamblar-laptop')
    ready(browser)
    for mode in ['Aprender', 'Practicar']:
        browser.click('Reiniciar laptop')
        browser.click(mode)
        assert browser.js("[...document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Comprobar y encender').disabled")
        assert not browser.js("document.querySelector('.laptop-completion')")
        if mode == 'Practicar':
            assert not browser.js("[...document.querySelectorAll('.laptop-details h3')].some(e => e.textContent === 'Ubicación')")
            browser.js("document.querySelector('[data-part=ram]').click()")
            browser.click('Instalar')
            browser.wait("document.querySelector('.evaluation-stats dd').textContent === '1'")
            browser.click('Ver ubicación')
            browser.wait("document.querySelectorAll('.evaluation-stats dd')[1].textContent === '1'")
        ids = browser.js("[...document.querySelectorAll('[data-part]')].map(e => e.dataset.part)")
        for index, part in enumerate(ids):
            browser.js(f"document.querySelector('[data-part={part}]').click()")
            browser.wait("!document.querySelector('[data-action=install-laptop]').disabled")
            browser.js("document.querySelector('[data-action=install-laptop]').click()")
            browser.wait(f"document.querySelector('.laptop-catalog .panel-heading').textContent.includes('{index + 1}/17')")
        browser.click('Comprobar montaje')
        browser.wait("document.querySelector('.laptop-status').textContent.includes('Montaje verificado')")
        browser.click('Comprobar y encender')
        if mode == 'Aprender':
            browser.wait("document.querySelector('.laptop-completion h2').textContent.includes('Iniciando')")
            browser.screenshot('laptop-booting')
        browser.wait("document.querySelector('.laptop-completion h2').textContent === 'Tu laptop está lista'")
        ready(browser)
        time.sleep(1)
        browser.js("document.querySelector('.laptop-viewer').scrollIntoView({block:'center'})")
        browser.screenshot('laptop-completed-' + mode)
        browser.click('Apagar')
        browser.wait("!document.querySelector('.laptop-completion')")
        browser.command('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-reduced-motion', 'value': 'reduce'}]})
        checks.append(mode + ': complete laptop via UI, validation, boot, shutdown; practice counters and reduced motion')
        print(checks[-1], flush=True)

    browser.navigate('/')
    browser.click('Simuladores')
    browser.command('Input.dispatchKeyEvent', {'type': 'keyDown', 'key': 'Escape', 'code': 'Escape', 'windowsVirtualKeyCode': 27})
    browser.command('Input.dispatchKeyEvent', {'type': 'keyUp', 'key': 'Escape', 'code': 'Escape', 'windowsVirtualKeyCode': 27})
    assert not browser.js("document.querySelector('.simulator-dropdown')")
    assert browser.js("document.activeElement.textContent.includes('Simuladores')")
    assert not browser.errors, browser.errors
    assert not browser.network_errors, browser.network_errors
    checks.append('Keyboard menu Escape/focus; no console exceptions or HTTP errors')


def main():
    profile = tempfile.mkdtemp(prefix='undc-ux-qa-')
    preferences = Path(profile) / 'Default'
    preferences.mkdir()
    (preferences / 'Preferences').write_text(json.dumps({'signin': {'allowed': False}, 'browser': {'has_seen_welcome_page': True}}))
    process = subprocess.Popen([qa.EDGE, '--headless=new', f'--remote-debugging-port={qa.PORT}',
        f'--user-data-dir={profile}', '--no-first-run', '--disable-default-apps',
        '--window-size=1440,900', '--enable-unsafe-swiftshader',
        '--disable-features=msEdgeFirstRunExperience,msEdgeOnRampFRE,msImplicitSignin', 'about:blank'],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW)
    browser = None
    checks = json.loads((qa.OUTPUT / 'report.json').read_text(encoding='utf-8'))['checks']
    try:
        deadline = time.time() + 25
        while time.time() < deadline:
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{qa.PORT}/json', timeout=2) as response:
                    target = next(x for x in json.load(response) if x['type'] == 'page' and not x['url'].startswith('edge:'))
                browser = qa.Browser(target['webSocketDebuggerUrl'])
                break
            except (OSError, StopIteration):
                time.sleep(.25)
        assert browser, 'Edge did not start'
        for feature in ['Page', 'Runtime', 'Log', 'Network']:
            browser.command(feature + '.enable')
        verify(browser, checks)
    finally:
        report = {'checks': checks, 'errors': browser.errors if browser else [], 'network_errors': browser.network_errors if browser else []}
        (qa.OUTPUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        if browser:
            try:
                browser.screenshot('last-state')
                browser.command('Browser.close')
            except (OSError, RuntimeError):
                pass
            browser.socket.close()
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
    print(json.dumps(report, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
