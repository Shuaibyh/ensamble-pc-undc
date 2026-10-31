"""Focused localhost QA for internal and workstation cable geometry."""
import json
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

import verify_pc_journey as qa

OUTPUT = Path(__file__).resolve().parents[2] / 'docs' / 'qa-cable-rescue'
OUTPUT.mkdir(parents=True, exist_ok=True)
qa.OUTPUT = OUTPUT


def main():
    with socket.socket() as endpoint:
        endpoint.bind(('127.0.0.1', 0))
        port = endpoint.getsockname()[1]
    profile = tempfile.mkdtemp(prefix='undc-cables-qa-')
    process = subprocess.Popen([
        qa.EDGE, '--headless=new', f'--remote-debugging-port={port}',
        f'--user-data-dir={profile}', '--no-first-run', '--disable-default-apps',
        '--window-size=1440,950', '--enable-unsafe-swiftshader',
        '--disable-features=msEdgeFirstRunExperience,msEdgeOnRampFRE,msImplicitSignin', 'about:blank',
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW)
    browser = None
    try:
        deadline = time.time() + 25
        while time.time() < deadline:
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{port}/json', timeout=2) as response:
                    target = next(item for item in json.load(response) if item['type'] == 'page' and not item['url'].startswith('edge:'))
                browser = qa.Browser(target['webSocketDebuggerUrl'])
                break
            except (OSError, StopIteration):
                time.sleep(.25)
        assert browser, 'Edge did not start'
        for feature in ['Page', 'Runtime', 'Log', 'Network']:
            browser.command(feature + '.enable')
        browser.viewport(1440, 950)
        browser.navigate('/')
        seeded = browser.command('Runtime.evaluate', {
            'awaitPromise': True,
            'returnByValue': True,
            'expression': """(async () => {
              const {parts,cables} = await import('/src/data/catalog.ts');
              const {transition} = await import('/src/domain/assembly.ts');
              const {newSession} = await import('/src/domain/session.ts');
              const {setupCables} = await import('/src/domain/setup.ts');
              const {STORAGE_KEY,serializeSession} = await import('/src/state/storage.ts');
              const session = newSession('learn');
              for (const part of parts) session.assembly = transition(session.assembly,{type:'install',id:part.id});
              for (const cable of cables) session.assembly = transition(session.assembly,{type:'connect',id:cable.id});
              session.caseClosed = false;
              session.setupConnected = setupCables.map(cable => cable.id);
              localStorage.setItem(STORAGE_KEY,serializeSession(session));
              return {parts:session.assembly.installed.length,cables:session.assembly.connected.length};
            })()""",
        })
        assert not seeded.get('exceptionDetails'), seeded
        browser.navigate('/ensamblar-pc')
        browser.wait("Boolean(document.querySelector('.canvas-container canvas'))", timeout=40)
        browser.wait("document.querySelector('.resource-message') === null", timeout=40)
        time.sleep(2)
        browser.screenshot('internal-cables')

        browser.js("""(() => { const key='ensamble-pc-undc:creagal-v1'; const saved=JSON.parse(localStorage.getItem(key)); saved.session.caseClosed=true; localStorage.setItem(key,JSON.stringify(saved)); })()""")
        browser.navigate('/conectar-estacion')
        browser.wait("document.querySelectorAll('.setup-connection.connected').length === 5", timeout=40)
        browser.wait("document.querySelector('.resource-message') === null", timeout=40)
        time.sleep(2)
        browser.screenshot('station-cables-general')
        for _ in range(5):
            browser.js("document.querySelector('button[aria-label=\"Girar a la izquierda\"]')?.click()")
            time.sleep(.15)
        browser.screenshot('station-cables-rear')
        browser.click('Comprobar y encender')
        browser.wait("document.querySelector('.pc-desktop.ready') !== null", timeout=15)
        assert not browser.errors, browser.errors
        assert not browser.network_errors, browser.network_errors
        report = {'status': 'passed', 'connected': 5, 'booted': True, 'errors': [], 'network_errors': []}
        (OUTPUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps(report), flush=True)
    finally:
        if browser:
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


if __name__ == '__main__':
    main()
