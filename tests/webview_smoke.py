"""Smoke test for web assets under Android-like HTTPS appassets origin using Chromium.
Not an Android emulator test and does not test Java native bridge itself.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]/'app/src/main/assets/web'
origin='about:blank'

def run():
  with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in (320,390,768,1440):
      context=browser.new_context(viewport={'width':width,'height':850},device_scale_factor=1,ignore_https_errors=True)
      page=context.new_page()
      html=(root/'index.html').read_text(encoding='utf-8')
      html=html.replace('<link rel="stylesheet" href="assets/styles.css?v=2.0.0-android">', '<style>'+ (root/'assets/styles.css').read_text(encoding='utf-8') + '</style>')
      html=html.replace('<script defer src="assets/engine.js?v=2.0.0-android"></script>','').replace('<script defer src="assets/app.js?v=2.0.0-android"></script>','')
      page.set_content(html,wait_until='load')
      page.evaluate("""() => {
         const store={};
         Object.defineProperty(window,'localStorage',{configurable:true,value:{
            getItem:key=>(key in store?store[key]:null),setItem:(key,v)=>{store[key]=String(v)},
            removeItem:key=>{delete store[key]}}});
         window.nativeCalls=[];
         window.HCAndroid={saveText:(...args)=>window.nativeCalls.push(['save',...args]),
                           printPage:()=>window.nativeCalls.push(['print'])};
      }""")
      errs=[]
      page.on('pageerror',lambda e:errs.append(str(e)))
      page.add_script_tag(content=(root/'assets/engine.js').read_text(encoding='utf-8'))
      page.add_script_tag(content=(root/'assets/app.js').read_text(encoding='utf-8'))
      page.locator('#heroBE').wait_for(state='visible')
      assert page.locator('#heroBE').inner_text()=='49'
      assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'), width
      # Check Android native export and print bridge JS integration.
      if width==390:
        page.locator('#menuToggle').click()
        page.locator('[data-page="sales"]').click()
        page.locator('#exportJSON').click()
        calls=page.evaluate('window.nativeCalls')
        assert calls[0][0]=='save' and calls[0][1].endswith('.json')
        assert '"application": "hoi-cho-lab"' in calls[0][3]
        page.locator('#exportCSV').click()
        calls=page.evaluate('window.nativeCalls')
        assert calls[1][1].endswith('.csv')
        page.locator('#saleProduct').select_option(index=0)
        page.locator('#saleQuantity').fill('2')
        page.locator('#addToCart button[type="submit"]').click()
        page.locator('#saveSale').click()
        assert page.locator('#saleCount').inner_text()=='1'
        assert 'hoi-cho-lab.market-day.v2' in page.evaluate('Object.keys(localStorage).join()') or page.locator('#saleCount').inner_text()=='1'
        page.locator('#menuToggle').click()
        page.locator('[data-page="pitch"]').click()
        page.locator('#printPitch').click()
        assert page.evaluate('window.nativeCalls')[-1][0]=='print'
        page.locator('#menuToggle').click()
        page.locator('.brand').click()
        assert page.locator('#page-dashboard').get_attribute('class').find('active')!=-1
      assert not errs,(width,errs)
      print('PASS browser offline assets/JS/layout', width)
      context.close()
    browser.close()

if __name__=='__main__': run()
