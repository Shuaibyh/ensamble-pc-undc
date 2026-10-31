"""Prompt 1: local regression and real canvas previews, disposable browser only."""
import base64
import json
import time
from pathlib import Path
import verify_ux_polish as harness

OUTPUT = Path(__file__).resolve().parents[2] / 'docs' / 'qa-prompt1'
PREVIEWS = Path(__file__).resolve().parents[1] / 'public' / 'landing' / 'previews'
OUTPUT.mkdir(parents=True, exist_ok=True)
harness.qa.OUTPUT = OUTPUT


def click_label(b, label):
    selector = f"document.querySelector('button[aria-label={json.dumps(label)}]')"
    b.wait(f'Boolean({selector}) && !{selector}.disabled')
    b.js(f'{selector}.click()')
    time.sleep(.25)


def preview(b, name):
    b.viewport(1440, 1050)
    b.js("""(() => { const el = document.querySelector('.canvas-container');
      el.style.flex = 'none'; el.style.height = el.clientWidth * 9 / 16 + 'px';
      el.closest('.viewer').style.height = 'auto'; el.scrollIntoView({block:'center'}); })()""")
    time.sleep(1.5)
    box = b.js("(() => { const r = document.querySelector('.canvas-container canvas').getBoundingClientRect(); return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}; })()")
    result = b.command('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': True, 'clip': box})
    (PREVIEWS / (name + '.png')).write_bytes(base64.b64decode(result['data']))
    b.js("document.querySelector('.canvas-container').removeAttribute('style'); document.querySelector('.viewer').removeAttribute('style')")


def responsive(b, name):
    for w, h in [(1920,1080),(1440,900),(1366,768),(900,1024),(390,844)]:
        b.viewport(w,h)
        b.js('scrollTo(0,0)')
        assert b.js('document.documentElement.scrollWidth <= innerWidth'), (name,w,'horizontal overflow')
        assert b.js("[...document.querySelectorAll('.viewer-toolbar')].every(e => e.getBoundingClientRect().bottom <= e.parentElement.getBoundingClientRect().bottom + 2)"), (name,w,'toolbar clipped')
        b.screenshot(f'{name}-{w}')
    b.viewport(1440,900)


def panels(b):
    width = b.js("document.querySelector('.viewer').getBoundingClientRect().width")
    click_label(b, 'Plegar componentes')
    click_label(b, 'Plegar información')
    assert b.js("document.querySelector('.viewer').getBoundingClientRect().width") > width + 300
    click_label(b, 'Mostrar componentes')
    click_label(b, 'Mostrar información')
    for label in ['Girar a la izquierda','Girar a la derecha','Acercar','Alejar','Restablecer vista','Enfocar pieza']:
        click_label(b,label)
    click_label(b,'Restablecer vista')


def verify(b, checks):
    b.viewport(1440,900)
    b.navigate('/')
    assert b.js("document.querySelectorAll('.module-card').length") == 3
    assert not b.js("document.body.innerText.includes('Entrar al laboratorio')")
    b.click('Simuladores')
    assert b.js("document.querySelectorAll('.simulator-dropdown a').length") == 3
    b.click('Ensamblar PC')
    b.wait("!!document.querySelector('[data-part]')")
    harness.ready(b)
    panels(b)
    responsive(b,'pc')
    for mode in ['Aprender','Practicar']:
        b.click(mode)
        b.click('Reiniciar ensamblaje')
        ids = b.js("[...document.querySelectorAll('[data-part]')].map(e=>e.dataset.part)")
        for part in ids:
            b.wait("![...document.querySelectorAll('[data-part]')].some(e=>e.disabled)")
            b.js(f"document.querySelector('[data-part={part}]').click()")
            b.wait(f"document.querySelector('[data-part={part}]').getAttribute('aria-pressed') === 'true'")
            b.wait("!document.querySelector('.details-content .detail-actions button').disabled")
            b.js("document.querySelector('.details-content .detail-actions button').click()")
            b.wait(f"document.querySelector('[data-part={part}] .badge').textContent.includes('Instalada')")
        b.wait("![...document.querySelectorAll('[data-part]')].some(e=>e.disabled)")
        for index in range(b.js("document.querySelectorAll('.connection-row').length")):
            b.js(f"document.querySelectorAll('.connection-row')[{index}].querySelector('button').click()")
            time.sleep(.2)
        if mode == 'Aprender':
            click_label(b,'Plegar componentes'); click_label(b,'Plegar información')
            preview(b,'ensamblar-pc')
            click_label(b,'Mostrar componentes'); click_label(b,'Mostrar información')
        b.click('Cerrar y atornillar gabinete')
        b.click('Continuar a conexión de estación')
        b.wait("!!document.querySelector('.setup-workspace')")
        harness.ready(b)
        assert mode in b.js("document.querySelector('.setup-workspace .eyebrow').textContent")
        b.click('Comprobar y encender')
        b.wait("document.querySelector('.setup-panel [role=status]').textContent.includes('Falta conectar')")
        for index in range(5):
            b.wait("![...document.querySelectorAll('.setup-connection')].some(e=>e.disabled)")
            b.js(f"document.querySelectorAll('.setup-connection')[{index}].click()")
            b.wait(f"document.querySelectorAll('.setup-connection')[{index}].getAttribute('aria-pressed') === 'true'")
        b.click('Comprobar y encender')
        b.wait("!!document.querySelector('.pc-desktop.ready')")
        harness.ready(b)
        b.screenshot('completed-' + mode)
        if mode == 'Aprender':
            preview(b,'conectar-estacion')
            responsive(b,'station')
        b.click('Apagar PC')
        b.js("document.querySelector('.setup-connection').click()")
        b.wait("document.querySelectorAll('.setup-connection.connected').length === 4")
        b.js("document.querySelector('.setup-connection').click()")
        b.wait("document.querySelectorAll('.setup-connection.connected').length === 5")
        b.click('Volver al ensamblaje')
        b.click('Continuar a conexión de estación')
        b.wait("document.querySelectorAll('.setup-connection.connected').length === 5")
        b.js('window.__qaReloadPending = true'); b.command('Page.reload')
        b.wait("!window.__qaReloadPending && document.readyState === 'complete' && document.querySelectorAll('.setup-connection.connected').length === 5")
        b.click('Comprobar y encender'); b.wait("!!document.querySelector('.pc-desktop.ready')")
        b.click('Reiniciar experiencia')
        b.wait("document.querySelectorAll('.catalog-list .badge.success').length === 0")
        checks.append(mode + ': complete PC, closure, new station, five cables, power, disconnect/reconnect, navigation, reload, reset')
        print(checks[-1],flush=True)

    b.click('Inicio'); b.click('Armar laptop')
    b.wait("!!document.querySelector('.laptop-workspace')"); harness.ready(b)
    panels(b); responsive(b,'laptop')
    for mode in ['Aprender','Practicar']:
        b.click(mode); b.click('Reiniciar laptop')
        assert b.js("[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Comprobar y encender').disabled")
        if mode == 'Practicar':
            b.js("document.querySelector('[data-part=ram]').click()")
            b.click('Instalar')
            b.wait("document.querySelector('.evaluation-stats dd').textContent === '1'")
            b.click('Ver ubicación'); b.wait("document.querySelectorAll('.evaluation-stats dd')[1].textContent === '1'")
        ids = b.js("[...document.querySelectorAll('[data-part]')].map(e=>e.dataset.part)")
        for index, part in enumerate(ids):
            b.js(f"document.querySelector('[data-part={part}]').click()")
            b.wait("!document.querySelector('[data-action=install-laptop]').disabled")
            b.js("document.querySelector('[data-action=install-laptop]').click()")
            b.wait(f"document.querySelector('.laptop-catalog .panel-heading').textContent.includes('{index+1}/17')")
        b.click('Comprobar y encender'); b.wait("document.querySelector('.laptop-completion h2').textContent === 'Tu laptop está lista'")
        harness.ready(b)
        if mode == 'Aprender':
            click_label(b,'Plegar componentes'); click_label(b,'Plegar información')
            preview(b,'ensamblar-laptop')
            click_label(b,'Mostrar componentes'); click_label(b,'Mostrar información')
        b.click('Apagar')
        b.command('Emulation.setEmulatedMedia', {'features':[{'name':'prefers-reduced-motion','value':'reduce'}]})
        checks.append(mode + ': laptop installation, validation, boot, shutdown, camera/panels, practice counters')
        print(checks[-1],flush=True)
    b.click('Inicio'); b.click('Explorar modelos →')
    b.wait("!!document.querySelector('.model-filters')"); harness.ready(b)
    harness.input_value(b,'.model-filters input','motherboard'); b.click('MotherBoard + Components')
    harness.ready(b)
    preview(b,'explorar-modelos')
    harness.input_value(b,'.model-filters input','no-such-model'); b.wait("!!document.querySelector('.model-empty')")
    b.click('Limpiar filtros'); harness.input_value(b,'.model-filters select','Laptop')
    assert b.js("document.querySelectorAll('.model-chip').length") == 4
    responsive(b,'explorer')
    b.click('Inicio'); responsive(b,'landing')
    b.js("document.querySelector('#experiencias').scrollIntoView()")
    b.screenshot('landing-new-previews')
    checks.append('Five viewports; shared headers, steppers, mode, panel toggles, camera controls; filters; three cards; generated four real canvas previews')
    assert not b.errors,b.errors
    assert not b.network_errors,b.network_errors
    checks.append('No runtime exceptions, console errors or HTTP errors')


harness.verify = verify
if __name__ == '__main__':
    (OUTPUT / 'report.json').write_text('{"checks": []}', encoding='utf-8')
    harness.main()
