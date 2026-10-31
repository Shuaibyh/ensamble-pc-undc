"""Focused local visual/functional QA using the project's disposable Edge harness."""
import json
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path
import verify_pc_journey as qa

OUTPUT = Path(__file__).resolve().parents[2] / 'docs' / 'qa-sockets'
OUTPUT.mkdir(exist_ok=True)
qa.OUTPUT = OUTPUT

def main():
    with socket.socket() as endpoint:
        endpoint.bind(('127.0.0.1', 0))
        port = endpoint.getsockname()[1]
    profile = tempfile.mkdtemp(prefix='undc-socket-fit-')
    process = subprocess.Popen([qa.EDGE, '--headless=new', f'--remote-debugging-port={port}',
        f'--user-data-dir={profile}', '--no-first-run', '--disable-default-apps',
        '--window-size=1600,1100', '--enable-unsafe-swiftshader',
        '--disable-features=msEdgeFirstRunExperience,msEdgeOnRampFRE,msImplicitSignin', 'about:blank'],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW)
    browser = None
    try:
        deadline = time.time() + 25
        while time.time() < deadline:
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{port}/json', timeout=2) as response:
                    target = next(x for x in json.load(response) if x['type'] == 'page')
                browser = qa.Browser(target['webSocketDebuggerUrl'])
                break
            except (OSError, StopIteration):
                time.sleep(.25)
        assert browser, 'Temporary browser did not start'
        for feature in ['Page', 'Runtime', 'Log', 'Network']:
            browser.command(feature + '.enable')
        browser.viewport(1600, 1100)
        browser.navigate('/')
        seeded = browser.command('Runtime.evaluate', {'awaitPromise':True, 'returnByValue':True, 'expression':"""(async()=>{
          const {parts,cables}=await import('/src/data/catalog.ts');
          const {transition}=await import('/src/domain/assembly.ts');
          const {newSession}=await import('/src/domain/session.ts');
          const {STORAGE_KEY,serializeSession}=await import('/src/state/storage.ts');
          const session=newSession('learn');
          for(const p of parts)session.assembly=transition(session.assembly,{type:'install',id:p.id});
          for(const c of cables)session.assembly=transition(session.assembly,{type:'connect',id:c.id});
          session.caseClosed=true;
          localStorage.setItem(STORAGE_KEY,serializeSession(session));
        })()"""})
        assert not seeded.get('exceptionDetails'), seeded
        browser.navigate('/conectar-estacion')
        browser.wait("document.querySelectorAll('.setup-connection').length===5", timeout=40)
        # Resolve the same module URL as Vite uses, keeping R3F's live root registry.
        result = browser.command('Runtime.evaluate', {'awaitPromise':True, 'returnByValue':True, 'expression':r"""(async()=>{
          const source=await (await fetch('/src/scene/SetupScene.tsx')).text();
          const url=source.match(/from\s+[\"']([^\"']*@react-three_fiber[^\"']*)[\"']/)[1];
          const fiber=await import(url);
          window.socketQA={roots:fiber._roots};
          return [...fiber._roots.keys()].length;
        })()"""})
        assert not result.get('exceptionDetails'), result
        browser.wait("window.socketQA.roots.size>0", timeout=40)
        browser.js("window.socketQA.state=[...window.socketQA.roots.values()][0].store.getState(); void 0")
        browser.wait("Boolean(window.socketQA.state.scene.getObjectByName('Object_94')) && Boolean(window.socketQA.state.scene.getObjectByName('Cube_USB_0'))", timeout=60)
        for i in range(5):
            browser.js(f"document.querySelectorAll('.setup-connection')[{i}].click()")
            browser.wait(f"document.querySelectorAll('.setup-connection.connected').length==={i+1}")
            browser.wait("![...document.querySelectorAll('.setup-connection')].some(e=>e.disabled)")
        browser.js("document.querySelector('canvas').scrollIntoView({block:'center'})")
        browser.wait("Boolean([...window.socketQA.roots.values()][0].store.getState().controls)")
        browser.js("window.socketQA.state=[...window.socketQA.roots.values()][0].store.getState(); void 0")
        time.sleep(1)
        views = {
            'rear-close': ([-1,1.7,-.5],[2,1.7,-.5]),
            'lateral-close': ([.4,2.1,2.9],[2,1.65,-.5]),
            'oblique-close': ([-.7,2.6,1.7],[2,1.7,-.5]),
            'station-rear': ([-5,5,-8],[.1,1,-.7]),
            'monitor-rear': ([-.8,2.4,-4.8],[-.6,1.35,-1.3]),
        }
        for name,(position,target) in views.items():
            browser.js(f"window.socketQA.state.controls.target.set(...{json.dumps(target)}); window.socketQA.state.camera.position.set(...{json.dumps(position)}); window.socketQA.state.controls.update()")
            time.sleep(.8)
            browser.screenshot(name)
        geometry = browser.js("""(()=>{
          const samples=[]; const scene=window.socketQA.state.scene;
          scene.updateMatrixWorld(true);
          scene.traverse(o=>{
            if(o.name==='plugTipAnchor' && o.parent.visible) {
              const tip=o.getWorldPosition(o.position.clone());
              const exit=o.parent.getObjectByName('cableExitAnchor');
              const cableExit=exit.getWorldPosition(exit.position.clone());
              samples.push({tip:tip.toArray(),exit:cableExit.toArray()});
            }
          });
          const tubes=[];
          scene.traverse(o=>{if(o.geometry?.type==='TubeGeometry' && o.parent.parent===scene) {
            const p=o.geometry.attributes.position; let minY=Infinity;
            for(let i=0;i<p.count;i++)minY=Math.min(minY,p.getY(i));
            tubes.push(minY);
          }});
          return {anchors:samples,minCableY:tubes};
        })()""")
        assert len(geometry['anchors']) == 6, geometry
        assert all(y > 0 for y in geometry['minCableY']), geometry
        for i in range(5):
            browser.js(f"document.querySelectorAll('.setup-connection')[{i}].click()")
            browser.wait("document.querySelectorAll('.setup-connection.connected').length===4")
            browser.js(f"document.querySelectorAll('.setup-connection')[{i}].click()")
            browser.wait("document.querySelectorAll('.setup-connection.connected').length===5")
            browser.wait("![...document.querySelectorAll('.setup-connection')].some(e=>e.disabled)")
        browser.click('Comprobar y encender')
        browser.wait("document.querySelector('.pc-desktop.ready')!==null", timeout=20)
        browser.screenshot('windows-11')
        assert not browser.errors, browser.errors
        assert not browser.network_errors, browser.network_errors
        report={'connected':5,'reconnected':5,'windows11':True,'geometry':geometry,'errors':browser.errors,'network_errors':browser.network_errors}
        (OUTPUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
        print(json.dumps(report),flush=True)
    finally:
        if browser:
            try: browser.screenshot('last-state')
            except (OSError,RuntimeError): pass
            browser.socket.close()
        process.terminate()
        try: process.wait(timeout=5)
        except subprocess.TimeoutExpired: process.kill()

if __name__=='__main__': main()
