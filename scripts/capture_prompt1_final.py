"""Final clean PC/laptop framing. Fixtures use the application's assembly rules."""
import json
import os
import time
from pathlib import Path
import verify_prompt1 as qa


def capture(b, checks):
    b.navigate('/')
    result = b.command('Runtime.evaluate', {'awaitPromise': True, 'returnByValue': True, 'expression': """(async () => {
      const {parts,cables} = await import('/src/data/catalog.ts');
      const {transition} = await import('/src/domain/assembly.ts');
      const {newSession} = await import('/src/domain/session.ts');
      const {STORAGE_KEY,serializeSession} = await import('/src/state/storage.ts');
      const session = newSession('practice');
      for (const part of parts) session.assembly = transition(session.assembly,{type:'install',id:part.id});
      for (const cable of cables) session.assembly = transition(session.assembly,{type:'connect',id:cable.id});
      localStorage.setItem(STORAGE_KEY,serializeSession(session));
      const {laptopParts} = await import('/src/data/laptop.ts');
      const {emptyLaptopAssembly,installLaptopPart} = await import('/src/domain/laptop.ts');
      const laptop = laptopParts.reduce((s,p)=>p.id==='base'?s:installLaptopPart(s,p.id),emptyLaptopAssembly());
      localStorage.setItem('undc-laptop-assembly-v3',JSON.stringify(laptop));
      return {pc:session.assembly.installed.length,laptop:laptop.installed.length};
    })()"""})
    assert not result.get('exceptionDetails'),result
    assert result['result']['value'] == {'pc':11,'laptop':18}
    b.navigate('/ensamblar-pc')
    b.wait("!!document.querySelector('.canvas-container canvas')")
    time.sleep(3)
    qa.harness.ready(b)
    qa.click_label(b,'Plegar componentes'); qa.click_label(b,'Plegar información')
    assert b.js("document.activeElement.getAttribute('aria-label')") == 'Mostrar información'
    qa.preview(b,'ensamblar-pc')
    if os.environ.get('SNAPSHOT_PC_ONLY'):
        assert not b.errors,b.errors
        assert not b.network_errors,b.network_errors
        checks.append('PC preview recaptured after all component resources finished loading')
        return
    b.navigate('/ensamblar-laptop'); qa.harness.ready(b)
    b.click('Comprobar y encender'); b.wait("document.querySelector('.laptop-completion h2').textContent === 'Tu laptop está lista'")
    qa.click_label(b,'Plegar componentes'); qa.click_label(b,'Plegar información')
    qa.click_label(b,'Alejar')
    qa.preview(b,'ensamblar-laptop')
    b.navigate('/')
    qa.responsive(b,'landing-final')
    b.js("document.querySelector('#experiencias').scrollIntoView()")
    b.screenshot('cards-final')
    assert not b.errors,b.errors
    assert not b.network_errors,b.network_errors
    checks.append('Final PC preview without hints; laptop fully framed; panel focus preserved; updated landing previews; no console/HTTP errors')


if __name__ == '__main__':
    # Keep the full UI report; this pass only verifies framing and focus.
    qa.harness.qa.OUTPUT = Path(__file__).resolve().parents[2] / 'docs' / 'qa-prompt1-final'
    qa.harness.qa.OUTPUT.mkdir(parents=True,exist_ok=True)
    (qa.harness.qa.OUTPUT / 'report.json').write_text(json.dumps({'checks':[]}),encoding='utf-8')
    qa.harness.verify = capture
    qa.harness.main()
