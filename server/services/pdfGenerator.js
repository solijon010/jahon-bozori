/**
 * PDF Generator – Jahon Bozori Shartnoma
 * Portrait A4 | Sidebar LEFT (logo+QR) | Main RIGHT (title + 2 images + 4 cards)
 * Exact layout matching bron-reference.pdf
 */
const puppeteer = require('puppeteer')
const path = require('path')
const fs   = require('fs')

const FLOORS_DIR = path.join(__dirname, '..', 'assets', 'floors')

async function generateContractPdf(data) {
  const html = buildHtml(data)
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 })
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 })
  const pdf = await page.pdf({
    width: '210mm', height: '297mm',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })
  await browser.close()
  return pdf
}

/* ── helpers ─────────────────────────────────────────────── */
function polyCenter(pts) {
  if (!pts) return null
  const nums = pts.trim().split(/[\s,]+/).map(Number)
  const xs = [], ys = []
  for (let i = 0; i < nums.length - 1; i += 2) { xs.push(nums[i]); ys.push(nums[i + 1]) }
  if (!xs.length) return null
  return {
    cx: xs.reduce((a, b) => a + b, 0) / xs.length,
    cy: ys.reduce((a, b) => a + b, 0) / ys.length,
    minY: Math.min(...ys), maxY: Math.max(...ys),
    minX: Math.min(...xs), maxX: Math.max(...xs),
  }
}
function parseVB(s) {
  if (!s) return null
  const p = s.trim().split(/\s+/).map(Number)
  return { x: p[0], y: p[1], w: p[2], h: p[3] }
}
function getEngImg(blockId, bolimNum) {
  var tries = [blockId+'-'+bolimNum+'-preview.png', blockId+'-1-preview.png', 'A-1-preview.png']
  for (var i=0;i<tries.length;i++) {
    try {
      var fp = path.join(FLOORS_DIR, tries[i])
      if (fs.existsSync(fp)) return 'data:image/png;base64,'+fs.readFileSync(fp).toString('base64')
    } catch(_) {}
  }
  return null
}

/* ── overlay (UNCHANGED) ─────────────────────────────────── */
function makeOverlay(selectedPolygonPoints, overlayViewBox, center, apartment) {
  if (!selectedPolygonPoints || !overlayViewBox || !center) return ''
  var vb = parseVB(overlayViewBox)
  if (!vb) return ''
  var ax=center.cx, ay=center.cy
  var labelY=Math.max(center.minY-vb.h*0.09, vb.y+vb.h*0.05)
  var tipY=center.minY+(center.cy-center.minY)*0.16
  var lW=185, lH=40
  var lx=Math.min(Math.max(ax, vb.x+lW/2+4), vb.x+vb.w-lW/2-4)
  return '<svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none"'
    +' viewBox="'+overlayViewBox+'" preserveAspectRatio="xMidYMid meet">'
    +'<defs>'
    +'<filter id="g1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>'
    +'<filter id="g2" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/></filter>'
    +'<marker id="arr" markerWidth="9" markerHeight="7" refX="4.5" refY="7" orient="auto">'
    +'<path d="M0 0L4.5 7L9 0Z" fill="#dc2626"/></marker>'
    +'</defs>'
    +'<polygon points="'+selectedPolygonPoints+'" fill="rgba(220,38,38,.12)" stroke="#dc2626" stroke-width="14" stroke-linejoin="round" filter="url(#g1)" opacity=".5"/>'
    +'<polygon points="'+selectedPolygonPoints+'" fill="rgba(220,38,38,.28)" stroke="#ef4444" stroke-width="3" stroke-linejoin="round"/>'
    +'<polygon points="'+selectedPolygonPoints+'" fill="rgba(220,38,38,.08)" stroke="#dc2626" stroke-width="1.8" stroke-linejoin="round"/>'
    +'<polygon points="'+selectedPolygonPoints+'" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1" stroke-linejoin="round"/>'
    +'<line x1="'+lx+'" y1="'+(labelY+lH/2)+'" x2="'+ax+'" y2="'+tipY+'" stroke="rgba(220,38,38,.25)" stroke-width="12" stroke-linecap="round" filter="url(#g1)"/>'
    +'<line x1="'+lx+'" y1="'+(labelY+lH/2)+'" x2="'+ax+'" y2="'+tipY+'" stroke="#dc2626" stroke-width="4.5" stroke-linecap="round" marker-end="url(#arr)"/>'
    +'<rect x="'+(lx-lW/2+3)+'" y="'+(labelY-lH/2+3)+'" width="'+lW+'" height="'+lH+'" rx="9" fill="rgba(0,0,0,.22)" filter="url(#g1)"/>'
    +'<rect x="'+(lx-lW/2)+'" y="'+(labelY-lH/2)+'" width="'+lW+'" height="'+lH+'" rx="9" fill="#dc2626"/>'
    +'<rect x="'+(lx-lW/2+1.5)+'" y="'+(labelY-lH/2+1.5)+'" width="'+(lW-3)+'" height="'+(lH-3)+'" rx="8" fill="none" stroke="rgba(255,255,255,.32)" stroke-width="1.5"/>'
    +'<text x="'+lx+'" y="'+labelY+'" text-anchor="middle" dominant-baseline="middle" font-family="Inter,-apple-system,sans-serif" font-size="16" font-weight="900" fill="#fff" letter-spacing=".3">'+apartment.address+'</text>'
    +'<circle cx="'+ax+'" cy="'+ay+'" r="9" fill="#dc2626" filter="url(#g2)"/>'
    +'<circle cx="'+ax+'" cy="'+ay+'" r="4" fill="#fff"/>'
    +'</svg>'
}

/* ═══════════════════════════════════════════════════════════ */
function buildHtml(data) {
  const {
    form, apartment, blockId, bolimNum, floor,
    floorImageBase64, overlayViewBox, selectedPolygonPoints,
    action, contractNum, today,
  } = data

  const isB      = action === 'bron'
  const fullName = (form.familiya + ' ' + form.ism).trim()
  const months   = parseInt(form.oylar) || 12
  const initial  = form.boshlangich || '0'
  const vb       = parseVB(overlayViewBox)
  const center   = polyCenter(selectedPolygonPoints)
  const engImg   = getEngImg(blockId, bolimNum)

  const QR = 'https://api.qrserver.com/v1/create-qr-code/?size=140x140&data='
    + encodeURIComponent('https://t.me/solijon_ikromov1')
    + '&color=0a1628&bgcolor=f5f0e4&margin=4'

  /* Globe SVG icon */
  const GLOBE = '<svg width="24" height="24" viewBox="0 0 30 30" fill="none">'
    +'<circle cx="15" cy="18" r="10" stroke="#fff" stroke-width="1.8"/>'
    +'<ellipse cx="15" cy="18" rx="4.5" ry="10" stroke="#fff" stroke-width="1.1"/>'
    +'<line x1="5" y1="18" x2="25" y2="18" stroke="#fff" stroke-width="1"/>'
    +'<path d="M7 12.5Q15 9 23 12.5" stroke="#fff" stroke-width=".9" fill="none"/>'
    +'<path d="M7 23.5Q15 27 23 23.5" stroke="#fff" stroke-width=".9" fill="none"/>'
    +'<path d="M8.5 7.5Q12 4 15 3Q18 4 21.5 7.5" stroke="#d4a843" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
    +'<path d="M10 7.5L10 11Q15 13 20 11L20 7.5" fill="#d4a843"/>'
    +'<circle cx="15" cy="3" r="2" fill="#d4a843"/>'
    +'</svg>'

  return '<!DOCTYPE html><html lang="uz"><head>'
    +'<meta charset="UTF-8">'
    +'<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap" rel="stylesheet">'
    +'<style>'
    +'*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}'
    +'@page{size:210mm 297mm portrait;margin:0}'
    +'body{width:794px;height:1123px;overflow:hidden;font-family:"Inter",-apple-system,sans-serif;display:flex}'
    +'</style></head><body>'

    /* ═══ LEFT SIDEBAR ═══════════════════════════════════════ */
    +'<div style="width:210px;min-width:210px;height:1123px;'
    +'background:linear-gradient(168deg,#07101c 0%,#0b1b2e 50%,#091524 100%);'
    +'display:flex;flex-direction:column;padding:24px 16px 20px;overflow:hidden;position:relative">'

    /* gold top line */
    +'<div style="position:absolute;top:0;left:0;right:0;height:3px;'
    +'background:linear-gradient(90deg,transparent,#d4a843 40%,#f0c84a 60%,transparent)"></div>'
    /* decor circle */
    +'<div style="position:absolute;bottom:120px;right:-40px;width:110px;height:110px;'
    +'border:14px solid rgba(212,168,67,.04);border-radius:50%"></div>'

    /* Logo */
    +'<div style="display:flex;align-items:center;gap:9px;margin-bottom:22px;'
    +'padding-bottom:18px;border-bottom:1px solid rgba(212,168,67,.12)">'
    +'<div style="width:44px;height:44px;border-radius:12px;flex-shrink:0;'
    +'background:linear-gradient(135deg,#b8891e,#d4a843 50%,#f0c84a);'
    +'display:flex;align-items:center;justify-content:center;'
    +'box-shadow:0 5px 18px rgba(212,168,67,.38)">'+GLOBE+'</div>'
    +'<div>'
    +'<div style="font-family:\'Playfair Display\',Georgia,serif;font-size:16px;font-weight:800;color:#fff;line-height:1.1">'
    +'JAHON<br><span style="color:#d4a843">BOZORI</span></div>'
    +'<div style="font-size:5.5px;letter-spacing:2px;color:rgba(255,255,255,.22);text-transform:uppercase;margin-top:3px">'
    +"Ko'chmas mulk markazi</div>"
    +'</div></div>'

    /* Shartnoma turi */
    +'<div style="background:rgba(212,168,67,.1);border:1px solid rgba(212,168,67,.2);'
    +'border-radius:11px;padding:12px;margin-bottom:18px">'
    +'<div style="font-size:6.5px;font-weight:800;letter-spacing:2px;'
    +'color:'+(isB?'#d4a843':'#4ade80')+';text-transform:uppercase;margin-bottom:6px">'
    +(isB?'&#x1F516; BRON SHARTNOMASI':'&#x2705; SOTUV SHARTNOMASI')+'</div>'
    +'<div style="font-size:11px;font-weight:900;color:#fff;font-variant-numeric:tabular-nums;margin-bottom:4px">'
    +'\u2116 '+contractNum+'</div>'
    +'<div style="font-size:8px;color:rgba(255,255,255,.3)">&#x1F4C5; '+today+'</div>'
    +'</div>'

    /* Xaridor */
    +'<div style="margin-bottom:20px">'
    +'<div style="font-size:6px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.2);text-transform:uppercase;margin-bottom:7px">Xaridor</div>'
    +'<div style="font-size:13px;font-weight:800;color:#fff;line-height:1.35;margin-bottom:5px">'+fullName+'</div>'
    +(form.passport?'<div style="font-size:8.5px;color:rgba(255,255,255,.3);margin-bottom:2px">&#x1FA96; '+form.passport+'</div>':'')
    +(form.manzil?'<div style="font-size:8.5px;color:rgba(255,255,255,.3)">&#x1F4CD; '+form.manzil+'</div>':'')
    +'</div>'

    +'<div style="height:1px;background:rgba(212,168,67,.12);margin-bottom:18px"></div>'

    /* Manzil */
    +'<div style="margin-bottom:16px">'
    +'<div style="font-size:6px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.2);text-transform:uppercase;margin-bottom:7px">Manzil</div>'
    +'<div style="font-size:8.5px;color:rgba(255,255,255,.38);line-height:1.8">'
    +'&#x1F4CD; Toshkent sh.,<br>Chilonzor tumani</div>'
    +'</div>'

    /* Aloqa */
    +'<div style="margin-bottom:18px">'
    +'<div style="font-size:6px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.2);text-transform:uppercase;margin-bottom:7px">Aloqa</div>'
    +'<div style="font-size:9px;color:rgba(255,255,255,.42);line-height:2.1">'
    +'&#x1F4DE; 77 777 29 85<br>'
    +'&#x1F4DE; 77 777 29 45<br>'
    +'<span style="color:rgba(212,168,67,.55)">&#x2708; @solijon_ikromov1</span>'
    +'</div></div>'

    +'<div style="height:1px;background:rgba(212,168,67,.1);margin-bottom:16px"></div>'

    /* Eslatma */
    +'<div style="background:rgba(255,255,255,.04);border-left:2px solid rgba(212,168,67,.35);'
    +'border-radius:0 8px 8px 0;padding:10px 10px;margin-bottom:18px">'
    +'<div style="font-size:8px;color:rgba(255,255,255,.38);line-height:1.7;font-style:italic">'
    +"Alloh bo'lajak xaridingizni fayzli va barokatli qilsin."
    +'</div>'
    +'<div style="font-size:7px;color:rgba(212,168,67,.5);font-weight:700;margin-top:5px">\u2014 Jahon Bozori jamoasi</div>'
    +'</div>'

    /* QR */
    +'<div style="margin-top:auto">'
    +'<div style="font-size:7px;font-weight:700;color:rgba(212,168,67,.6);letter-spacing:.5px;margin-bottom:10px">'
    +'Shartnomani tekshirish uchun:</div>'
    +'<div style="background:rgba(245,240,228,.06);border:1px solid rgba(212,168,67,.15);'
    +'border-radius:12px;padding:8px;display:inline-block">'
    +'<img src="'+QR+'" width="110" height="110" style="display:block;border-radius:6px" crossorigin="anonymous"/>'
    +'</div></div>'

    +'</div>'
    /* end sidebar */

    /* ═══ MAIN AREA ══════════════════════════════════════════ */
    +'<div style="flex:1;height:1123px;'
    +'background:linear-gradient(150deg,#faf7ee 0%,#f4eccc 50%,#e8d88a 100%);'
    +'display:flex;flex-direction:column;padding:22px 20px 20px;overflow:hidden;position:relative">'

    /* ambient blob */
    +'<div style="position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;'
    +'background:radial-gradient(circle,rgba(212,168,67,.18),transparent 65%);pointer-events:none"></div>'

    /* ── Title ── */
    +'<div style="margin-bottom:16px">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:5px">'
    +'<span style="font-family:\'Playfair Display\',Georgia,serif;font-size:32px;font-weight:900;'
    +'color:#0a1628;letter-spacing:-.5px;line-height:1">'+apartment.address+'</span>'
    +'<span style="padding:5px 14px;border-radius:30px;font-size:9px;font-weight:900;'
    +'letter-spacing:1.5px;text-transform:uppercase;'
    +'background:'+(isB?'#0a1628':'#14532d')+';'
    +'color:'+(isB?'#d4a843':'#86efac')+';'
    +'box-shadow:0 3px 12px rgba(10,22,40,.2)">'
    +(isB?'&#x1F516; BRON':'&#x2705; SOTILDI')+'</span>'
    +'</div>'
    +'<div style="display:flex;align-items:center;gap:5px;font-size:9px;font-weight:600;color:rgba(10,22,40,.45)">'
    +'<span>'+blockId+'-BLOK</span>'
    +'<span style="color:#b8962a">&#x203A;</span>'
    +'<span>'+bolimNum+"-BO'LIM</span>"
    +'<span style="color:#b8962a">&#x203A;</span>'
    +'<span>'+floor+'-QAVAT</span>'
    +'<span style="color:#b8962a">&#x203A;</span>'
    +'<span style="color:#0a1628;font-weight:800">&#x2116;&nbsp;'+apartment.address+'</span>'
    +'</div>'
    +'</div>'

    /* ── 2 Images ── */
    /* Image area: big left + small right */
    +'<div style="display:flex;gap:10px;margin-bottom:14px;height:480px">'

    /* BIG image: floor plan WITH overlay (object-fit:contain for correct overlay) */
    +'<div style="flex:1.5;border-radius:16px;overflow:hidden;position:relative;'
    +'background:#0d1b2e;box-shadow:0 8px 32px rgba(10,22,40,.22)">'
    +(floorImageBase64
      ?'<img src="'+floorImageBase64+'" style="width:100%;height:100%;object-fit:contain;object-position:center;display:block"/>'
       +makeOverlay(selectedPolygonPoints, overlayViewBox, center, apartment)
       +'<div style="position:absolute;bottom:0;left:0;right:0;height:40px;'
       +'background:linear-gradient(transparent,rgba(0,0,0,.65));'
       +'display:flex;align-items:flex-end;padding:0 12px 10px">'
       +'<span style="font-size:8.5px;font-weight:700;letter-spacing:1.5px;'
       +'text-transform:uppercase;color:rgba(255,255,255,.55)">&#x1F4CD; Joylashuv</span>'
       +'</div>'
      :'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center">'
       +'<span style="font-size:32px;opacity:.2">&#x1F5FA;</span></div>'
    )
    +'</div>'

    /* SMALL image: engineering 2D plan */
    +'<div style="flex:1;border-radius:16px;overflow:hidden;position:relative;'
    +'background:#0d1b2e;box-shadow:0 8px 32px rgba(10,22,40,.22)">'
    +(engImg
      ?'<img src="'+engImg+'" style="width:100%;height:100%;object-fit:cover;object-position:center;display:block"/>'
       +'<div style="position:absolute;bottom:0;left:0;right:0;height:40px;'
       +'background:linear-gradient(transparent,rgba(0,0,0,.65));'
       +'display:flex;align-items:flex-end;padding:0 12px 10px">'
       +'<span style="font-size:8.5px;font-weight:700;letter-spacing:1.5px;'
       +'text-transform:uppercase;color:rgba(255,255,255,.55)">&#x1F5D2; 2D Texnik Reja</span>'
       +'</div>'
      :'<div style="width:100%;height:100%;display:flex;align-items:center;'
       +'justify-content:center;flex-direction:column;gap:8px">'
       +'<div style="font-size:28px;opacity:.2">&#x1F5D2;</div>'
       +'<div style="font-size:9px;color:rgba(255,255,255,.2);letter-spacing:1px">2D REJA YO\'Q</div>'
       +'</div>'
    )
    +'</div>'

    +'</div>'
    /* end images */

    /* ── 4 Info Cards ── */
    +'<div style="display:flex;gap:10px;margin-bottom:14px">'
    +[
      {l:'1 kv narxi',  v: (parseInt(initial)||0) > 0 ? Math.round((parseInt(initial)||0)/(parseInt(apartment.size)||1)).toLocaleString()+' $' : '—',  g:true  },
      {l:'Oyiga',        v: months > 0 && parseInt(initial) > 0 ? Math.round((parseInt(initial)*0.72)/months).toLocaleString()+' $' : '—',            g:false },
      {l:'Muddat',       v: months + ' oy',                                                                                                             g:false },
      {l:"O'lcham",     v: apartment.size + ' m\u00B2',                                                                                                g:true  },
    ].map(function(c) {
      var bg = c.g ? 'linear-gradient(145deg,#fffef5,#fff8d5)' : 'rgba(255,255,255,.75)'
      var bd = c.g ? 'rgba(212,168,67,.35)' : 'rgba(0,0,0,.08)'
      return '<div style="flex:1;border-radius:13px;padding:13px 14px;'
        +'background:'+bg+';border:1.5px solid '+bd+';'
        +'box-shadow:0 3px 14px rgba(10,22,40,.07),inset 0 1px 0 rgba(255,255,255,.9)">'
        +'<div style="font-size:7px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;'
        +'color:rgba(10,22,40,.38);margin-bottom:7px">'+c.l+'</div>'
        +'<div style="font-size:20px;font-weight:900;color:#0a1628;line-height:1">'+c.v+'</div>'
        +'</div>'
    }).join('')
    +'</div>'

    /* ── 3 more cards: holati, boshlangich, umumiy ── */
    +'<div style="display:flex;gap:10px;margin-bottom:14px">'
    +[
      {l:'Holati',       v:'Karobka',    sub:'Tayyor holat',       g:false},
      {l:"Boshlang'ich", v:initial+' $', sub:"Birinchi to'lov",    g:true },
      {l:'Umumiy narx',  v:(parseInt(initial)||0)>0?Math.round((parseInt(initial)||0)/0.28).toLocaleString()+' $':'—',  sub:"To'liq qiymat", g:false},
    ].map(function(c) {
      var bg = c.g ? 'linear-gradient(145deg,#fffef5,#fff8d5)' : 'rgba(255,255,255,.75)'
      var bd = c.g ? 'rgba(212,168,67,.35)' : 'rgba(0,0,0,.08)'
      return '<div style="flex:1;border-radius:13px;padding:13px 14px;'
        +'background:'+bg+';border:1.5px solid '+bd+';'
        +'box-shadow:0 3px 14px rgba(10,22,40,.07),inset 0 1px 0 rgba(255,255,255,.9)">'
        +'<div style="font-size:7px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;'
        +'color:rgba(10,22,40,.38);margin-bottom:7px">'+c.l+'</div>'
        +'<div style="font-size:18px;font-weight:900;color:#0a1628;line-height:1;margin-bottom:4px">'+c.v+'</div>'
        +'<div style="font-size:8px;color:rgba(10,22,40,.35)">'+c.sub+'</div>'
        +'</div>'
    }).join('')
    +'</div>'

    /* ── Eslatma ── */
    +'<div style="background:rgba(255,255,255,.55);border:1px solid rgba(212,168,67,.25);'
    +'border-radius:11px;padding:11px 14px;display:flex;align-items:center;gap:10px">'
    +'<span style="font-size:16px;flex-shrink:0">&#x26A0;&#xFE0F;</span>'
    +'<div style="font-size:8px;color:rgba(10,22,40,.52);line-height:1.6">'
    +'<b style="color:#0a1628">Eslatma:</b> Ushbu shartnoma '
    +(isB?'<b>3 kun</b> muddatida amal qiladi.':'to\'lov muddati davomida amal qiladi.')
    +' Savol va murojaat uchun: <b>77 777 29 85</b>'
    +'</div>'
    +'</div>'

    +'</div>'
    /* end main */

    +'</body></html>'
}

module.exports = { generateContractPdf }
