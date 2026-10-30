/* =========================================================
   HIGHWAY Customer App — script.js
   ملف مُجمَّع من جزأين: (1) الشاشة الافتتاحية وتسجيل الدخول المشتركة
   (2) منطق تطبيق العملاء: المتاجر، القائمة وخيارات الأصناف، السلة وكود الخصم والجدولة،
       العناوين المحفوظة، المفضلة، الطلب والتتبع ورمز التسليم، التقييم، الدعم.
   يعتمد على: hw-config.js, hw-orders.js, hw-map.js, hw-food.js, hw-notify.js, hw-biz.js, hw-demo.js
   ========================================================= */
/* ---------- الشاشة الافتتاحية: رسومات الطعام العائمة ---------- */


function buildSplashIcons() {
    const wrap = document.getElementById('splashIcons');
    const SPL = HWFood.splashSet();   // رسومات الطعام المشتركة (hw-food.js)
    for (let i = 0; i < 18; i++) {
        const el = document.createElement('div');
        el.className = 'float-icon';
        const size = 26 + Math.random() * 34;
        el.style.width = el.style.height = size + 'px';
        el.style.left = (Math.random() * 94) + '%';
        el.style.animationDuration = (9 + Math.random() * 9) + 's';
        el.style.animationDelay = (-Math.random() * 14) + 's';
        el.innerHTML = SPL[(i * 7) % SPL.length];
        wrap.appendChild(el);
    }
}

/* ---------- فيديو الشاشة الافتتاحية بخلفية شفافة ----------
   الفيديو بلا قناة شفافية، فيُعرض عبر WebGL مع حذف لونه التركوازي لحظياً ليظهر الإطار الزجاجي من خلفه.
   لضمان عدم اختفاء اللوجو نهائياً: ننتهي دائماً بصورة اللوجو الثابتة (بنفس مقاس آخر إطار) بدل الاعتماد
   على لوحة WebGL، وننتقل إليها فوراً إذا فشل أي شيء (منع التشغيل التلقائي، فقد سياق WebGL، تأخر الفيديو). */
function initIntroVideo() {
    const video = document.getElementById('splashVideo');
    const canvas = document.getElementById('splashCanvas');
    const card = document.getElementById('splashCard');
    if (!video || !canvas || !card) return null;

    let stopped = false;
    const showStatic = () => {                 // يعرض الصورة الثابتة ويوقف الرسم والفيديو
        stopped = true;
        card.classList.add('static-logo');
        video.pause();
    };

    let gl = null;
    try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true }); } catch (e) {}
    if (!gl) { showStatic(); return { stop() {} }; }
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); showStatic(); });

    const compile = (type, src) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src); gl.compileShader(sh);
        return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = compile(gl.VERTEX_SHADER,
        'attribute vec2 p; varying vec2 uv;' +
        'void main(){ uv = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); gl_Position = vec4(p,0.0,1.0); }');
    const fs = compile(gl.FRAGMENT_SHADER,
        'precision mediump float; uniform sampler2D tex; varying vec2 uv;' +
        'const vec3 BG = vec3(33.0,204.0,208.0)/255.0;' +            // لون خلفية الفيديو
        'void main(){' +
        '  vec3 c = texture2D(tex, uv).rgb;' +
        '  float a = clamp((distance(c, BG) - 0.035) / 0.80, 0.0, 1.0);' +
        '  vec3 f = a > 0.001 ? clamp((c - (1.0 - a) * BG) / a, 0.0, 1.0) : vec3(0.0);' +
        '  gl_FragColor = vec4(f * a, a);' +                          // ألوان مضروبة مسبقاً بالشفافية
        '}');
    const prog = gl.createProgram();
    if (!vs || !fs) { showStatic(); return { stop() {} }; }
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { showStatic(); return { stop() {} }; }
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const draw = () => {
        if (video.readyState < 2) return;
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video); }
        catch (e) { showStatic(); return; }
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    let finished = false;
    const canvasBlank = () => {                                   // هل الصف الأوسط من اللوحة فارغ؟
        if (gl.isContextLost()) return true;
        const row = new Uint8Array(canvas.width * 4);
        gl.readPixels(0, canvas.height >> 1, canvas.width, 1, gl.RGBA, gl.UNSIGNED_BYTE, row);
        for (let i = 3; i < row.length; i += 4) if (row[i] > 200) return false;
        return true;
    };
    const next = (fn) => (video.requestVideoFrameCallback ? video.requestVideoFrameCallback(fn) : requestAnimationFrame(fn));
    const loop = () => { if (!stopped) { draw(); next(loop); } };

    let began = false;
    const begin = () => { if (!began && !stopped) { began = true; next(loop); } };
    video.addEventListener('playing', begin);
    video.addEventListener('ended', () => { draw(); finished = true; card.classList.add('logo-done'); });   // النهاية: يبقى آخر إطار من الفيديو معروضاً
    // عند العودة للتطبيق: إن فُرغت لوحة الرسم بصمت نعرض الصورة الثابتة (مأخوذة من آخر إطار فلا يتغير شيء)
    document.addEventListener('visibilitychange', () => { if (!document.hidden && finished && !stopped && canvasBlank()) showStatic(); });
    video.addEventListener('error', showStatic);
    if (!video.paused && video.readyState >= 3) begin();       // بدأ التشغيل التلقائي قبل تسجيل المستمعين

    video.muted = true;                                          // مطلوب ليعمل التشغيل التلقائي
    const p = video.play();
    if (p && p.catch) p.catch(showStatic);                       // التشغيل التلقائي ممنوع (مثلاً توفير الطاقة)
    setTimeout(() => { if (!began) showStatic(); }, 2000);       // لم يبدأ الفيديو خلال ثانيتين
    setTimeout(() => { if (!stopped) showStatic(); }, 9000);     // شبكة أمان إن تجمّد الفيديو قبل نهايته

    return { stop() { stopped = true; video.pause(); } };
}


/* الإطار الزجاجي يكبر ليظهر نموذج الدخول، وزر الرجوع يعيد الشاشة الافتتاحية كما كانت */
let introCtl = null;
function setLoginFocusable(on) {
    document.querySelectorAll('#loginPanel input, #loginPanel button, #loginBack').forEach(el => el.tabIndex = on ? 0 : -1);
    document.getElementById('loginPanel').setAttribute('aria-hidden', on ? 'false' : 'true');
}
function openLogin() {
    document.getElementById('splash').classList.add('login-mode');
    setLoginFocusable(true);
    if (window.matchMedia('(hover:hover)').matches) setTimeout(() => document.getElementById('loginUser').focus(), 650);
}
function closeLogin() {
    document.getElementById('splash').classList.remove('login-mode');
    setLoginFocusable(false);
    document.getElementById('loginError').textContent = '';
    ['loginUserField', 'loginPassField'].forEach(id => document.getElementById(id).classList.remove('invalid'));
    document.getElementById('loginPass').value = '';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}
function finishLogin() {
    document.getElementById('splash').classList.add('hide');
    if (introCtl) setTimeout(introCtl.stop, 800);
}


/* =========================================================
   1) الإعدادات والحالة العامة
   ========================================================= */
const CFG = window.HW_CONFIG;
let STORES = HWBiz.storeList();           // المتاجر تديرها الإدارة (قاعدة البيانات)، وقبلها القائمة في hw-config.js
const PROFILE_KEY = 'hwc-user', CART_KEY = 'hwc-cart', ANN_KEY = 'hwc-ann-seen';
const SUPPORT_WA = '962791819432';
const $ = (id) => document.getElementById(id);
const H = HWOrders.esc, money = HWOrders.money;
const ROOTS = ['screen-home', 'screen-search', 'screen-orders', 'screen-profile'];
const TAB_OF = { 'screen-home': 'home', 'screen-store': 'home', 'screen-offers': 'home', 'screen-cart': 'home', 'screen-search': 'search', 'screen-orders': 'orders', 'screen-track': 'orders', 'screen-profile': 'profile', 'screen-favs': 'profile' };
const SVG = (d, w) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
const IC = {
    pin: SVG('<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    home: SVG('<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/>'),
    work: SVG('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
    clock: SVG('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 2.2),
    route: SVG('<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>', 2.2),
    wait: SVG('<path d="M6 3h12M6 21h12"/><path d="M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>'),
    cook: SVG('<path d="M5 12h14v4a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-4Z"/><path d="M3 12h18"/><path d="M9 3c-1 1.5 1 2.5 0 4M13 3c-1 1.5 1 2.5 0 4M17 3c-1 1.5 1 2.5 0 4"/>'),
    bag: SVG('<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
    nav: SVG('<path d="m3 11 18-8-8 18-2-8-8-2Z"/>'),
    check: SVG('<path d="M20 6 9 17l-5-5"/>', 2.6),
    x: SVG('<path d="M6 6l12 12M18 6 6 18"/>', 2.6),
    phone: SVG('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>', 2.2),
    cash: SVG('<rect x="2" y="6" width="20" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.8"/><path d="M6 12h.01M18 12h.01"/>'),
    cart: SVG('<path d="M6 6h15l-1.6 8.2a2 2 0 0 1-2 1.6H9a2 2 0 0 1-2-1.6L5 3H2"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>', 1.8),
    search: SVG('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 1.8),
    orders: SVG('<path d="M6 3h12l2 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7l2-4Z"/><path d="M4 7h16M9 11h6"/>', 1.8),
    heart: SVG('<path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5c-2.2 4.6-9.2 9-9.2 9Z"/>', 2.1),
    share: SVG('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>'),
    help: SVG('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>'),
    tag: SVG('<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/>'),
    edit: SVG('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
    trash: SVG('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
    star: SVG('<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z"/>')
};
const TAGS = { home: ['البيت', IC.home], work: ['العمل', IC.work], other: ['آخر', IC.pin] };

let me = null, cart = blankCart();
let screenStack = ['screen-home'], currentScreen = 'screen-home';
let menus = {}, storeState = {}, allOrders = [], prevSig = null, trackId = null, curStore = '', catFilter = 'الكل', itemCtx = null;
let sortBy = 'near', openOnly = false, rateCtx = null, editAddrId = null, locTag = 'home';
let cartRoute = null, cartMini = null, trk = null, locMap = null, locCb = null, locTimer = null, locPick = null;
const dismissed = {};

/* =========================================================
   2) أدوات عامة
   ========================================================= */
function blankCart(keep) { return { storeId: '', items: [], notes: '', promo: '', when: 0, details: keep || '' }; }
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {} }
function sortKey(name) { return String(name).replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').trim(); }
function storeInfo(id) { return STORES.filter(s => s.id === id)[0]; }
function logoImg(id, cls) { return '<img class="' + (cls || 'lg') + '" src="' + H(HWBiz.logo(id)) + '" alt="" onerror="this.src=\'logo-icon.png\'">'; }
function readJSON(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function saveMe() { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(me)); } catch (e) {} }
function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} }
const PATTERN_ICONS = ['burger', 'pizza', 'coffee', 'cutlery', 'icecream', 'bag'].map(HWFood.svg);   // نقشة الخلفية (رسومات شاشة الدخول)
function foodIcon(i) { return PATTERN_ICONS[Math.abs(i) % PATTERN_ICONS.length]; }
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
function pattern(seed, dark) {
    const pos = [[6, 12, 34], [30, 62, 26], [56, 8, 30], [78, 58, 36], [92, 14, 24], [44, 70, 22], [66, 32, 20]];
    return pos.map((p, i) => '<span class="pt' + (dark ? ' dk' : '') + '" style="left:' + p[0] + '%;top:' + p[1] + '%;width:' + p[2] + 'px;height:' + p[2] + 'px;transform:rotate(' + ((i * 37 + seed) % 50 - 25) + 'deg)">' + foodIcon(i + seed) + '</span>').join('');
}
function countAr(n, one, two, few, many) {             // صيغة العدد الصحيحة بالعربية
    if (n === 0) return 'لا يوجد ' + one; if (n === 1) return one + ' واحد'; if (n === 2) return two;
    return n + ' ' + (n % 100 >= 3 && n % 100 <= 10 ? few : many);
}
function codeH(o) { return '<span class="code">' + H(o.code) + '</span>'; }
function fmtWhen(ts) {
    const d = new Date(ts), t = HWOrders.fmtTime(ts), today = new Date();
    const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
    return (d.toDateString() === today.toDateString() ? 'اليوم ' : d.toDateString() === tomorrow.toDateString() ? 'غدًا ' : d.toLocaleDateString('ar-JO') + ' ') + t;
}
function optsText(opts) { return (opts || []).map(o => o.c).join(' · '); }
function openSheet(html, cls) { const b = $('sheetBody'); b.className = 'modal-card glass' + (cls ? ' ' + cls : ''); b.innerHTML = html; $('sheet').classList.add('show'); }
function closeSheet() { $('sheet').classList.remove('show'); }

/* =========================================================
   3) المتاجر: الحالة، القائمة، الأسعار والوقت
   ========================================================= */
function menuOf(id) { return menus[id] || { cats: [] }; }
function itemCount(id) { return menuOf(id).cats.reduce((n, c) => n + c.items.filter(HWBiz.itemListed).length, 0); }
function stStatus(s) { return HWBiz.storeStatus(storeState[s.id]); }
function isOpen(s) { return stStatus(s).open && itemCount(s.id) > 0; }
function canSchedule(s) { const st = storeState[s.id] || {}; return itemCount(s.id) > 0 && st.open !== false; }   // مغلق بسبب الدوام: يمكن الجدولة
function prepMin(s) { return (storeState[s.id] || {}).prepMin || 20; }
function storeLoc(s) { const st = storeState[s.id] || {}; return st.lat != null ? [st.lat, st.lng] : (CFG.center || [32.0392, 35.7272]); }
function myLoc() { return me && me.loc ? [me.loc.lat, me.loc.lng] : null; }
function estKm(s) { const l = myLoc(); return l ? HWMap.est(storeLoc(s), l) : null; }
function estFee(s) { const k = estKm(s); return k == null ? null : HWMap.fee(k); }
function estEta(s) { const k = estKm(s); return prepMin(s) + (k == null ? CFG.travelMin || 15 : Math.max(5, Math.round(k / 0.45))); }
function rating(s) { return HWBiz.storeRating(s.id, allOrders); }
function ratingH(s, cls) { const r = rating(s); return r.n ? '<span class="' + (cls || 'rt-chip') + '">★ ' + r.avg.toFixed(1) + ' <small>(' + r.n + ')</small></span>' : ''; }
function coverArt(s) {                                  // صورة الغلاف إن وُجدت، وإلا رسمة القسم
    const c = HWBiz.cover(s.id, storeState[s.id]);
    return c ? '<img class="vc-photo" src="' + c + '" alt="">' : pattern(Math.abs(hashStr(s.id)) % 7, false) + '<span class="vc-ill">' + HWFood.forCat(s.cat) + '</span>';
}
function offerTag(s) { const o = HWBiz.forStore(s.id)[0]; return o ? '<span class="vc-offer">' + H(o.percent ? 'خصم ' + o.percent + '٪' : 'عرض') + '</span>' : ''; }
function isFav(kind, id) { return !!(me && me.favs && (me.favs[kind] || []).indexOf(id) >= 0); }
function toggleFav(kind, id) {
    me.favs = me.favs || { s: [], i: [] }; const l = me.favs[kind] = me.favs[kind] || [];
    const k = l.indexOf(id); if (k >= 0) l.splice(k, 1); else l.unshift(id);
    saveMe(); fillProfile(); buzz(12); HWOrders.toast(k >= 0 ? 'أُزيل من المفضلة' : 'أُضيف إلى المفضلة');
}

function vcCard(s) {
    const st = stStatus(s), open = isOpen(s), f = estFee(s), k = estKm(s), e = estEta(s), hasMenu = itemCount(s.id) > 0;
    return '<button type="button" class="vc" data-s="' + H(s.id) + '"><div class="vc-img">' + coverArt(s) + offerTag(s) + logoImg(s.id, 'vc-logo') +
        '<span class="vc-time">' + e + '–' + (e + 8) + '<small>دقيقة</small></span>' +
        (isFav('s', s.id) ? '<span class="vc-fav">' + IC.heart + '</span>' : '') +
        (open ? '' : '<span class="vc-closed">' + (hasMenu ? H(st.label || 'مغلق حاليًا') : 'قريبًا') + '</span>') + '</div>' +
        '<div class="vc-body"><div class="vc-name"><b>' + H(s.name) + '</b>' + ratingH(s) + '</div><span class="vc-cat">' + H(s.cat) + '</span>' +
        '<div class="vc-meta">' + IC.route + '<span class="hl">' + (f == null ? 'حدّد موقعك' : 'التوصيل ' + money(f) + ' د.أ') + '</span>' + (k == null ? '' : '<i class="dot"></i><span>' + k.toFixed(1) + ' كم</span>') + '<i class="dot"></i><span>نقدًا</span></div></div></button>';
}

/* ---------- العروض: البطاقة الأولى في الرئيسية + صفحة العروض ---------- */
function liveOffers() { const now = Date.now(); return HWBiz.offers.list().filter(o => HWBiz.live(o, now) && STORES.some(s => s.id === o.storeId)); }
function renderBanners() {
    const lo = liveOffers(), n = lo.length, max = lo.reduce((m, o) => Math.max(m, o.percent || 0), 0), ids = lo.map(o => o.storeId).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
    return '<div class="bn ofr" data-bn="offers">' + pattern(2, true) +
        '<div class="ofr-txt"><span class="ofr-tag">عروض اليوم</span>' +
        (max ? '<b>خصومات تصل إلى <em>' + max + '٪</em></b><small>' + countAr(n, 'عرض', 'عرضان', 'عروض', 'عرضًا') + ' من متاجرنا · لفترة محدودة</small>' : '<b>عروض حصرية <em>قريبًا</em></b><small>تابع أحدث عروض متاجرنا</small>') +
        '<span class="ofr-cta">تصفح العروض ' + SVG('<path d="M9 18l6-6-6-6"/>', 2.6) + '</span></div>' +
        '<div class="ofr-side"><svg class="ofr-burst" viewBox="0 0 100 100"><polygon points="50.0,0.0 58.0,9.8 69.1,3.8 72.8,15.9 85.4,14.6 84.1,27.2 96.2,30.9 90.2,42.0 100.0,50.0 90.2,58.0 96.2,69.1 84.1,72.8 85.4,85.4 72.8,84.1 69.1,96.2 58.0,90.2 50.0,100.0 42.0,90.2 30.9,96.2 27.2,84.1 14.6,85.4 15.9,72.8 3.8,69.1 9.8,58.0 0.0,50.0 9.8,42.0 3.8,30.9 15.9,27.2 14.6,14.6 27.2,15.9 30.9,3.8 42.0,9.8"/></svg><span class="ofr-pct">%</span>' +
        (ids.length ? '<span class="ofr-logos">' + ids.map(id => logoImg(id, '')).join('') + '</span>' : '') + '</div><i class="ofr-shine"></i></div>' +
        '<div class="bn t" data-bn="stores"><b>اطلب من متاجرك المفضلة</b><small>يوصلك كابتن HIGHWAY بسرعة</small><span class="bn-ill">' + HWFood.svg('cloche') + '</span></div>' +
        '<div class="bn y" data-bn="stores"><b>الدفع نقدًا عند الاستلام</b><small>قيمة الطلب ورسوم التوصيل للكابتن</small><span class="bn-ill">' + IC.cash + '</span></div>' +
        '<div class="bn d" data-bn="orders"><b>تابع طلبك لحظة بلحظة</b><small>حالة طلبك ووقت وصوله المتوقع</small><span class="bn-ill">' + IC.nav + '</span></div>';
}
function openOffers() { renderOffersPage(); goTo('screen-offers'); }
function renderOffersPage() {
    const list = liveOffers().sort((a, b) => (b.percent || 0) - (a.percent || 0));
    $('offersList').innerHTML = list.length ? list.map(o => {
        const st = storeInfo(o.storeId);
        return '<button type="button" class="ofc" data-s="' + H(o.storeId) + '"><div class="ofc-art">' + (o.percent ? '<b>' + o.percent + '٪</b><small>خصم</small>' : '<b>%</b>') + '</div>' +
            '<div class="ofc-t"><span class="ofc-st">' + logoImg(o.storeId, '') + H(st ? st.name : '') + '</span><b>' + H(o.title) + '</b><small>' + (o.minOrder ? 'للطلبات فوق ' + money(o.minOrder) + ' د.أ' : H(o.sub || 'يُطبَّق تلقائيًا في السلة')) + (o.endsAt ? ' · حتى ' + new Date(o.endsAt).toLocaleDateString('ar-JO') : '') + (o.demo ? ' · عرض تجريبي' : '') + '</small></div>' +
            '<span class="ofc-go">اطلب</span></button>';
    }).join('') : '<div class="empty-orders rich"><div class="em-art">' + IC.cart + '</div>لا توجد عروض حاليًا، تابعنا قريبًا</div>';
}

/* ---------- الإعلانات (تنشرها الإدارة للعملاء) ---------- */
function renderAnnouncements() {
    const seen = readJSON(ANN_KEY, []), list = HWBiz.announcements('customers').filter(a => seen.indexOf(a.id) < 0);
    $('annBox').innerHTML = list.slice(0, 1).map(a => '<div class="ann"><span class="ann-ic">' + SVG('<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z"/><path d="M15 9a4 4 0 0 1 0 6"/>') + '</span><div><b>' + H(a.title) + '</b>' + (a.body ? '<small>' + H(a.body) + '</small>' : '') + '</div><button type="button" class="ann-x" data-ann="' + H(a.id) + '" aria-label="إخفاء">' + IC.x + '</button></div>').join('');
}

/* ---------- الرئيسية ---------- */
function storeMatches(s) { return (catFilter === 'الكل' || s.cat === catFilter) && (!openOnly || isOpen(s)); }
function sortStores(list, by) {
    const key = { near: s => estKm(s) == null ? 99 : estKm(s), eta: s => estEta(s), fee: s => estFee(s) == null ? 99 : estFee(s), rate: s => -rating(s).avg }[by] || (s => 0);
    return list.slice().sort((a, b) => ((isOpen(b) ? 1 : 0) - (isOpen(a) ? 1 : 0)) || key(a) - key(b));
}
function renderStores() {
    const cats = ['الكل'].concat(STORES.map(s => s.cat).filter((c, i, a) => a.indexOf(c) === i));
    $('catChips').innerHTML = cats.map(c => '<button type="button" class="cat2' + (c === catFilter ? ' on' : '') + '" data-c="' + H(c) + '"><i>' + HWFood.forCat(c) + '</i><span>' + H(c) + '</span></button>').join('');
    $('banners').innerHTML = renderBanners();
    const favs = ((me && me.favs && me.favs.s) || []).map(storeInfo).filter(Boolean);
    $('favRowWrap').style.display = favs.length ? '' : 'none';
    $('favRow').innerHTML = favs.map(s => '<button type="button" class="lg-it" data-s="' + H(s.id) + '">' + logoImg(s.id, '') + '<span>' + H(s.name) + '</span></button>').join('');
    $('logoRow').innerHTML = sortStores(STORES, 'near').map(s => '<button type="button" class="lg-it' + (isOpen(s) ? '' : ' off') + '" data-s="' + H(s.id) + '">' + logoImg(s.id, '') + '<span>' + H(s.name) + '</span></button>').join('');
    const list = STORES.filter(storeMatches);
    $('fastRow').innerHTML = sortStores(list.filter(isOpen), 'eta').slice(0, 6).map(vcCard).join('') || '<div class="empty-orders" style="flex:1">لا توجد متاجر مفتوحة الآن</div>';
    $('sortChips').innerHTML = [['near', 'الأقرب'], ['eta', 'الأسرع'], ['rate', 'الأعلى تقييمًا'], ['fee', 'الأقل توصيلًا']].map(x => '<button type="button" class="srt' + (sortBy === x[0] ? ' on' : '') + '" data-sort="' + x[0] + '">' + x[1] + '</button>').join('') +
        '<button type="button" class="srt' + (openOnly ? ' on' : '') + '" data-open="1">مفتوح الآن</button>';
    $('storesTitle').textContent = catFilter === 'الكل' ? 'كل المتاجر' : catFilter;
    $('storesCount').textContent = countAr(list.length, 'متجر', 'متجران', 'متاجر', 'متجرًا');
    $('storeList').innerHTML = list.length ? sortStores(list, sortBy).map(vcCard).join('') : '<div class="empty-orders rich"><div class="em-art">' + IC.search + '</div>لا توجد متاجر مطابقة</div>';
    renderAnnouncements();
}

/* ---------- البحث ---------- */
function renderSearch() {
    const q = ($('storeSearch').value || '').trim(), box = $('searchBody');
    if (!q) {
        box.innerHTML = '<h3 class="sr-h">تصفح حسب القسم</h3><div class="cats2" style="flex-wrap:wrap">' + ['الكل'].concat(STORES.map(s => s.cat).filter((c, i, a) => a.indexOf(c) === i)).map(c => '<button type="button" class="cat2" data-c="' + H(c) + '" data-go="1"><i>' + HWFood.forCat(c) + '</i><span>' + H(c) + '</span></button>').join('') + '</div>';
        return;
    }
    const k = sortKey(q), st = STORES.filter(s => sortKey(s.name).includes(k) || sortKey(s.cat).includes(k));
    const its = []; STORES.forEach(s => menuOf(s.id).cats.forEach(c => c.items.forEach(it => { if (HWBiz.itemListed(it) && (sortKey(it.name).includes(k) || sortKey(it.desc || '').includes(k))) its.push({ s, c, it }); })));
    box.innerHTML = (st.length ? '<h3 class="sr-h">المتاجر</h3>' + st.map(s => '<button type="button" class="sr" data-s="' + H(s.id) + '">' + logoImg(s.id, '') + '<div class="t"><b>' + H(s.name) + '</b><small>' + H(s.cat) + ' · ' + (isOpen(s) ? 'مفتوح' : H(stStatus(s).label || 'مغلق')) + '</small></div></button>').join('') : '') +
        (its.length ? '<h3 class="sr-h">الأصناف</h3>' + its.slice(0, 40).map(x => '<button type="button" class="sr" data-si="' + H(x.s.id) + '" data-c="' + H(x.c.id) + '" data-i="' + H(x.it.id) + '"><span class="ic">' + HWFood.forItem(x.it.name, x.it.desc, x.c.name, x.s.cat) + '</span><div class="t"><b>' + H(x.it.name) + '</b><small>' + H(x.s.name) + '</small></div><span class="p">' + money(x.it.price) + ' د.أ</span></button>').join('') : '') ||
        '<div class="empty-orders rich"><div class="em-art">' + IC.search + '</div>لا توجد نتائج لـ "' + H(q) + '"</div>';
}

/* ---------- صفحة المتجر ---------- */
function openStore(id) { curStore = id; renderStore(); goTo('screen-store'); }
function findItem(sid, cid, iid) { const c = menuOf(sid).cats.filter(x => x.id === cid)[0]; return c ? c.items.filter(i => i.id === iid)[0] : null; }
function findAny(sid, iid) { let r = null; menuOf(sid).cats.forEach(c => c.items.forEach(i => { if (i.id === iid) r = { it: i, c }; })); return r; }
function inCartQty(sid, iid) { return cart.storeId === sid ? cart.items.filter(x => x.id === iid).reduce((n, x) => n + x.qty, 0) : 0; }
function itemRow(s, c, it, open) {
    const avail = HWBiz.itemOn(it), n = inCartQty(s.id, it.id), hasOpts = (it.options || []).length > 0;
    return '<div class="mi' + (avail ? '' : ' out') + '" data-c="' + H(c.id) + '" data-i="' + H(it.id) + '"><div class="mi-txt"><div><b>' + H(it.name) + '</b>' + (it.desc ? '<p>' + H(it.desc) + '</p>' : '') + (hasOpts ? '<span class="mi-opt">قابل للتخصيص</span>' : '') + '</div>' +
        '<span class="mi-price">' + (avail ? money(it.price) + ' د.أ' : 'نفدت الكمية اليوم') + '</span></div>' +
        '<div class="mi-art">' + HWFood.forItem(it.name, it.desc, c.name, s.cat) + (open && avail ? '<button type="button" class="mi-add' + (n ? ' has' : '') + '" data-add="1" aria-label="إضافة">' + (n ? '×' + n : '+') + '</button>' : '') + '</div></div>';
}
function renderStore() {
    const s = storeInfo(curStore); if (!s) return;
    const st = stStatus(s), open = isOpen(s), f = estFee(s), k = estKm(s), e = estEta(s), m = menuOf(s.id), r = rating(s);
    const cats = m.cats.filter(c => c.items.some(HWBiz.itemListed));
    const feat = []; cats.forEach(c => c.items.filter(HWBiz.itemOn).forEach(it => { if (feat.length < 6) feat.push({ c, it }); }));
    $('storeHero').innerHTML =
        '<div class="v-hero">' + coverArt(s) + '</div>' +
        '<div class="v-head">' + logoImg(s.id, 'v-logo') +
        '<div class="v-acts"><button type="button" class="v-act' + (isFav('s', s.id) ? ' on' : '') + '" data-fav-s="' + H(s.id) + '" aria-label="المفضلة">' + IC.heart + '</button><button type="button" class="v-act" onclick="shareStore(\'' + s.id + '\')" aria-label="مشاركة">' + IC.share + '</button></div>' +
        '<h1>' + H(s.name) + '</h1><div class="v-sub">' + H(s.cat) + (r.n ? ' · <b class="v-rate">★ ' + r.avg.toFixed(1) + '</b> (' + countAr(r.n, 'تقييم', 'تقييمان', 'تقييمات', 'تقييمًا') + ')' : '') + ' · الدفع نقدًا</div>' +
        '<div class="v-info"><div><small>التوصيل</small><b>' + (f == null ? '—' : money(f) + ' د.أ') + '</b></div><div><small>الوقت</small><b>' + e + '–' + (e + 8) + ' د</b></div><div><small>المسافة</small><b>' + (k == null ? '—' : k.toFixed(1) + ' كم') + '</b></div></div>' +
        HWBiz.forStore(s.id).map(o => '<div class="v-offer"><span>%</span><div><b>' + H(o.title) + '</b><small>' + (o.percent ? 'يُطبَّق تلقائيًا في السلة' + (o.minOrder ? ' للطلبات فوق ' + money(o.minOrder) + ' د.أ' : '') : H(o.sub || '')) + '</small></div></div>').join('') +
        (f == null ? '<button type="button" class="v-note demo btn-note" onclick="openAddrs()">حدّد موقعك لمعرفة رسوم التوصيل ←</button>' : '') +
        (open ? '' : '<div class="v-note closed">' + H(st.label || 'المتجر مغلق حاليًا') + (canSchedule(s) && itemCount(s.id) ? '، ويمكنك جدولة طلبك' : '، يمكنك تصفح القائمة فقط') + '</div>') +
        (m.demo ? '<div class="v-note demo">قائمة تجريبية بأسعار وهمية</div>' : '') + '</div>';
    $('catTabs').innerHTML = (feat.length > 2 ? '<button type="button" class="ctab on" data-i="f">مختارات</button>' : '') + cats.map((c, i) => '<button type="button" class="ctab' + (feat.length <= 2 && i === 0 ? ' on' : '') + '" data-i="' + i + '">' + H(c.name) + '</button>').join('');
    const canAdd = open || canSchedule(s);
    $('menuList').innerHTML = (feat.length > 2 ? '<section class="mn-sec" id="sec-f"><h3 class="mn-h">مختارات من ' + H(s.name) + '</h3><div class="w-feat">' + feat.map(x => '<button type="button" class="fi mi-f" data-c="' + H(x.c.id) + '" data-i="' + H(x.it.id) + '"><div class="mi-art">' + HWFood.forItem(x.it.name, x.it.desc, x.c.name, s.cat) + '</div><b>' + H(x.it.name) + '</b><span>' + money(x.it.price) + ' د.أ</span></button>').join('') + '</div></section>' : '') +
        (cats.map((c, ci) => '<section class="mn-sec" id="sec-' + ci + '"><h3 class="mn-h">' + H(c.name) + '</h3>' + c.items.filter(HWBiz.itemListed).map(it => itemRow(s, c, it, canAdd)).join('') + '</section>').join('') || '<div class="empty-orders rich"><div class="em-art">' + IC.orders + '</div>القائمة غير متاحة بعد</div>');
}
function shareStore(id) {
    const s = storeInfo(id), url = location.origin + location.pathname + '?store=' + encodeURIComponent(id), text = 'اطلب من ' + s.name + ' عبر HIGHWAY Delivery';
    if (navigator.share) navigator.share({ title: s.name, text, url }).catch(() => {});
    else window.open('https://wa.me/?text=' + encodeURIComponent(text + '\n' + url), '_blank');
}

/* ---------- ورقة الصنف: الخيارات والإضافات ---------- */
function openItem(cid, iid) {
    const s = storeInfo(curStore), it = findItem(curStore, cid, iid); if (!it || !s) return;
    const sel = {}; (it.options || []).forEach(g => { sel[g.id] = g.min >= 1 && g.max === 1 && g.choices.length ? [g.choices[0].id] : []; });
    itemCtx = { it, cid, qty: 1, sel };
    const c = menuOf(curStore).cats.filter(x => x.id === cid)[0] || {}, avail = HWBiz.itemOn(it), canAdd = (isOpen(s) || canSchedule(s)) && avail;
    $('itemSheetBody').innerHTML = '<button type="button" class="is-x" onclick="closeItemSheet()" aria-label="إغلاق">' + IC.x + '</button>' +
        '<button type="button" class="is-fav' + (isFav('i', s.id + ':' + it.id) ? ' on' : '') + '" data-fav-i="' + H(s.id + ':' + it.id) + '" aria-label="المفضلة">' + IC.heart + '</button>' +
        '<div class="is-art">' + pattern(Math.abs(hashStr(it.id)) % 7, false) + HWFood.forItem(it.name, it.desc, c.name, s.cat) + '</div>' +
        '<div class="is-pad"><h3 class="is-name">' + H(it.name) + '</h3>' + (it.desc ? '<p class="mut">' + H(it.desc) + '</p>' : '') + '<div class="is-price">' + money(it.price) + ' د.أ</div>' +
        (it.options || []).map(g => '<div class="og" data-g="' + H(g.id) + '"><div class="og-h"><b>' + H(g.name) + '</b><small>' + (g.min >= 1 ? 'مطلوب' : 'اختياري') + (g.max > 1 ? ' · حتى ' + g.max : '') + '</small></div>' +
            g.choices.map(ch => '<button type="button" class="oc-ch' + ((sel[g.id] || []).indexOf(ch.id) >= 0 ? ' on' : '') + (g.max === 1 ? ' rd' : '') + '" data-ch="' + H(ch.id) + '"><i></i><span>' + H(ch.name) + '</span><small>' + (ch.price ? '+' + money(ch.price) + ' د.أ' : '') + '</small></button>').join('') + '</div>').join('') +
        (canAdd ? '<div class="field"><label for="isNotes">ملاحظات للمتجر <span class="opt">(اختياري)</span></label><textarea id="isNotes" rows="2" placeholder="مثال: بدون بصل"></textarea></div></div>' +
            '<div class="is-bar"><div class="qty"><button type="button" data-q="-1" aria-label="إنقاص">−</button><b id="isQty">1</b><button type="button" data-q="1" aria-label="زيادة">+</button></div>' +
            '<button type="button" class="submit-btn" id="isAdd" onclick="confirmItem()"><span class="btn-label"></span></button></div>'
            : '<div class="st-closed">' + (avail ? 'المتجر مغلق حاليًا' : 'نفدت الكمية اليوم') + '</div></div>');
    updateItemBtn(); $('itemSheet').classList.add('show');
}
function toggleChoice(gid, cid) {
    const g = (itemCtx.it.options || []).filter(x => x.id === gid)[0]; if (!g) return;
    let l = itemCtx.sel[gid] || [];
    if (g.max === 1) l = g.min >= 1 ? [cid] : (l[0] === cid ? [] : [cid]);
    else if (l.indexOf(cid) >= 0) l = l.filter(x => x !== cid);
    else if (l.length < g.max) l = l.concat([cid]); else { HWOrders.toast('الحد الأقصى ' + g.max); return; }
    itemCtx.sel[gid] = l;
    document.querySelectorAll('.og[data-g="' + gid + '"] .oc-ch').forEach(b => b.classList.toggle('on', l.indexOf(b.dataset.ch) >= 0));
    updateItemBtn(); buzz();
}
function updateItemBtn() {
    const b = $('isAdd'); if (!b) return;
    const p = HWBiz.optsPrice(itemCtx.it, itemCtx.sel);
    b.querySelector('.btn-label').textContent = 'أضف للطلب · ' + money(p.unit * itemCtx.qty) + ' د.أ';
}
function closeItemSheet() { $('itemSheet').classList.remove('show'); }
function confirmItem() {
    const err = HWBiz.optsError(itemCtx.it, itemCtx.sel); if (err) { HWOrders.toast(err); return; }
    if (addToCart(curStore, itemCtx.it, itemCtx.qty, ($('isNotes').value || '').trim(), itemCtx.sel)) { closeItemSheet(); renderStore(); }
}

/* =========================================================
   4) السلة: الأسطر، الكود، الجدولة
   ========================================================= */
function cartCount() { return cart.items.reduce((n, i) => n + i.qty, 0); }
function cartTotal() { return HWBiz.r2(cart.items.reduce((n, i) => n + i.qty * i.price, 0)); }
function addToCart(sid, it, qty, notes, sel) {
    if (!HWBiz.itemOn(it)) { HWOrders.toast('هذا الصنف غير متوفر حاليًا'); return false; }
    if (cart.storeId && cart.storeId !== sid && cart.items.length && !confirm('سلتك فيها منتجات من متجر آخر. تفريغها والبدء بسلة جديدة؟')) return false;
    if (cart.storeId !== sid) cart = blankCart(cart.details);
    cart.storeId = sid;
    const p = HWBiz.optsPrice(it, sel || {}), opts = p.picked.map(x => ({ g: x.g, c: x.c, price: x.price }));
    const key = it.id + '|' + opts.map(o => o.c).join(',') + '|' + (notes || '');   // نفس الصنف بنفس الخيارات = سطر واحد
    const line = cart.items.filter(x => x.key === key)[0];
    if (line) line.qty += qty;
    else cart.items.push({ key, id: it.id, name: it.name, price: p.unit, opts, qty, notes: notes || '', prep: it.prepMin || 0 });
    saveCart(); updateCartUI(); buzz(10); HWOrders.toast('أُضيف ' + it.name + ' إلى السلة'); return true;
}
function updateCartUI() {
    const n = cartCount(), onCart = currentScreen === 'screen-cart' || currentScreen === 'screen-track';
    const showBar = n > 0 && !onCart && (currentScreen === 'screen-home' || currentScreen === 'screen-store');
    $('cartBar').classList.toggle('show', showBar);
    document.body.classList.toggle('has-cart', showBar);
    $('cbN').textContent = n; $('cbT').textContent = money(cartTotal()) + ' د.أ';
    $('hdrCart').style.display = n > 0 && !onCart ? '' : 'none'; $('hdrCartN').textContent = n;
}
function openCart() {
    renderCart(); goTo('screen-cart');
    const s = storeInfo(cart.storeId);
    if (s && myLoc()) ensureRoute(s).then(() => { if (currentScreen === 'screen-cart') renderCart(); });
}
function ensureRoute(s) {
    const a = storeLoc(s), b = myLoc(), key = a.join(',') + '|' + b.join(',');
    if (cartRoute && cartRoute.key === key) return Promise.resolve(cartRoute);
    return HWMap.route(a, b).then(r => { cartRoute = Object.assign({ key }, r); return cartRoute; });
}
/* حساب السلة الكامل: المجموع، عرض المتجر، كود الخصم، التوصيل */
function cartCalc(s) {
    const l = myLoc(), ready = !!(cartRoute && l && cartRoute.key === storeLoc(s).join(',') + '|' + l.join(','));
    const gross = cartTotal(), dsc = HWBiz.discount(s.id, gross), items = HWBiz.r2(gross - dsc.amount);
    const pr = cart.promo ? HWBiz.checkPromo(cart.promo, { phone: me.phone, subtotal: items, orders: allOrders }) : null;
    const promo = pr && pr.ok ? pr.amount : 0, fee = ready ? HWMap.fee(cartRoute.km) : null;
    const prep = Math.max(prepMin(s), cart.items.reduce((m, x) => Math.max(m, x.prep || 0), 0));
    return { l, ready, gross, dsc, items, pr, promo, fee, prep, eta: prep + (ready ? cartRoute.min : estEta(s) - prepMin(s)), total: fee == null ? null : HWBiz.r2(items + fee - promo) };
}
function renderCart() {
    if (cartMini) { cartMini.remove(); cartMini = null; }
    const s = storeInfo(cart.storeId);
    if (!s || !cart.items.length) {
        $('cartStoreName').textContent = '';
        $('cartBody').innerHTML = '<div class="empty-orders rich"><div class="em-art">' + IC.cart + '</div>سلتك فارغة</div><button type="button" class="submit-btn" style="margin-top:14px" onclick="tabGo(\'screen-home\')"><span class="btn-label">تصفح المتاجر</span></button>';
        return;
    }
    $('cartStoreName').textContent = s.name;
    const k = cartCalc(s), open = isOpen(s), nextOf = HWBiz.forStore(s.id).filter(o => o.percent && k.gross < (o.minOrder || 0))[0];
    if (!open && !cart.when) cart.when = firstSlot(s) || 0;
    const canPlace = open || !!cart.when, adr = me.loc, tg = adr && TAGS[adr.tag];
    $('cartBody').innerHTML =
        '<div class="cart-card">' + cart.items.map((x, i) => '<div class="cl"><div class="cl-txt"><b>' + H(x.name) + '</b>' + (x.opts && x.opts.length ? '<small class="cl-opts">' + H(optsText(x.opts)) + '</small>' : '') + (x.notes ? '<small>' + H(x.notes) + '</small>' : '') + '<span>' + money(x.price * x.qty) + ' د.أ</span></div>' +
            '<div class="qty sm"><button type="button" data-q="-1" data-i="' + i + '" aria-label="إنقاص">' + (x.qty === 1 ? IC.trash : '−') + '</button><b>' + x.qty + '</b><button type="button" data-q="1" data-i="' + i + '" aria-label="زيادة">+</button></div></div>').join('') +
        '<button type="button" class="more-link" onclick="openStore(\'' + s.id + '\')">+ إضافة المزيد من ' + H(s.name) + '</button></div>' +
        '<h3 class="sec-t">التوصيل إلى</h3><div class="cart-card">' +
        (k.l ? '<div class="dl-map"><div class="lmap" id="miniMap"></div></div>' : '') +
        '<button type="button" class="dl-info" onclick="openAddrs()"><span class="dl-ico">' + (tg ? tg[1] : IC.pin) + '</span><div class="t"><small>' + (adr ? (tg ? tg[0] : 'موقعك') : 'لم تحدد موقعك بعد') + '</small><b>' + (adr ? H(adr.label) : 'حدّد موقعك لحساب التوصيل') + '</b></div><span class="more-link inl">' + (adr ? 'تغيير' : 'تحديد') + '</span></button>' +
        '<div class="field" id="addrField" style="margin:14px 0 0"><label for="cDetails">تفاصيل العنوان</label><textarea id="cDetails" rows="2" placeholder="رقم المبنى، الطابق، أقرب معلم..." oninput="cart.details=this.value;saveCart()">' + H(cart.details || (adr && adr.details) || '') + '</textarea><div class="err-msg">الرجاء كتابة تفاصيل العنوان</div></div></div>' +
        '<h3 class="sec-t">وقت التوصيل</h3><div class="cart-card when">' +
        '<button type="button" class="wh' + (cart.when ? '' : ' on') + '" data-when="now"' + (open ? '' : ' disabled') + '>' + IC.clock + '<span><b>الآن</b><small>' + (open ? k.eta + '–' + (k.eta + 8) + ' دقيقة' : 'المتجر مغلق') + '</small></span></button>' +
        '<button type="button" class="wh' + (cart.when ? ' on' : '') + '" data-when="later">' + SVG('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>') + '<span><b>جدولة</b><small>' + (cart.when ? fmtWhen(cart.when) : 'اختر الوقت') + '</small></span></button></div>' +
        '<h3 class="sec-t">ملاحظات</h3><div class="cart-card"><textarea id="cNotes" rows="2" class="plain" placeholder="ملاحظات للكابتن أو المتجر (اختياري)" oninput="cart.notes=this.value;saveCart()">' + H(cart.notes) + '</textarea></div>' +
        '<h3 class="sec-t">كود الخصم</h3><div class="cart-card promo">' +
        (k.pr && k.pr.ok ? '<div class="pm-ok">' + IC.tag + '<div><b>' + H(k.pr.code) + '</b><small>' + H(k.pr.msg) + ' · وفّرت ' + money(k.promo) + ' د.أ</small></div><button type="button" class="more-link inl" onclick="setPromo(\'\')">إزالة</button></div>'
            : '<div class="pm-row"><input id="promoIn" placeholder="أدخل الكود" value="' + H(cart.promo) + '" autocapitalize="characters" dir="ltr"><button type="button" class="pm-btn" onclick="setPromo($(\'promoIn\').value)">تطبيق</button></div>' + (k.pr && !k.pr.ok ? '<div class="pm-err">' + H(k.pr.msg) + '</div>' : '')) + '</div>' +
        '<h3 class="sec-t">الدفع</h3><div class="cart-card pay"><span class="pay-ico">' + IC.cash + '</span><div><b>الدفع نقدًا عند الاستلام</b><small>تدفع قيمة الطلب ورسوم التوصيل للكابتن</small></div></div>' +
        (nextOf && !k.dsc.offer ? '<div class="v-note demo">أضف ' + money(nextOf.minOrder - k.gross) + ' د.أ لتحصل على ' + H(nextOf.title) + '</div>' : '') +
        '<div class="cart-card sum"><div><span>المجموع الفرعي</span><b>' + money(k.gross) + ' د.أ</b></div>' +
        (k.dsc.offer ? '<div class="dsc"><span>' + H(k.dsc.offer.title) + '</span><b>−' + money(k.dsc.amount) + ' د.أ</b></div>' : '') +
        (k.promo ? '<div class="dsc"><span>كود ' + H(k.pr.code) + '</span><b>−' + money(k.promo) + ' د.أ</b></div>' : '') +
        '<div><span>رسوم التوصيل' + (k.ready ? ' · ' + cartRoute.km.toFixed(1) + ' كم' : '') + '</span><b>' + (k.fee == null ? (k.l ? 'جاري الحساب…' : '—') : money(k.fee) + ' د.أ') + '</b></div>' +
        '<div><span>' + (cart.when ? 'موعد التوصيل' : 'وقت الوصول المتوقع') + '</span><b>' + (cart.when ? fmtWhen(cart.when) : k.eta + '–' + (k.eta + 8) + ' دقيقة') + '</b></div>' +
        '<div class="tot"><span>الإجمالي</span><b>' + (k.total == null ? '—' : money(k.total) + ' د.أ') + '</b></div></div>' +
        (canPlace ? '' : '<div class="st-closed">المتجر مغلق ولا توجد مواعيد متاحة للجدولة</div>') +
        '<button type="button" class="submit-btn" id="placeBtn" onclick="placeOrder()"' + (canPlace ? '' : ' disabled') + '><span class="spinner"><i></i><i></i></span><span class="btn-label">' + (k.l ? (k.fee == null ? 'جاري حساب الأجرة…' : (cart.when ? 'جدولة الطلب · ' : 'تأكيد الطلب · ') + money(k.total) + ' د.أ') : 'حدّد موقعك للمتابعة') + '</span></button>';
    if (k.l) {
        cartMini = HWMap.create($('miniMap'), { center: k.l, zoom: 15, interactive: false });
        L.marker(k.l, { icon: HWMap.ICON.home(), interactive: false }).addTo(cartMini);
        L.marker(storeLoc(s), { icon: HWMap.ICON.store(s.id), interactive: false }).addTo(cartMini);
        if (k.ready) { HWMap.line(cartMini, cartRoute.pts); HWMap.fit(cartMini, cartRoute.pts.concat([k.l, storeLoc(s)]), [30, 30]); } else HWMap.fit(cartMini, [k.l, storeLoc(s)], [30, 30]);
    }
}
function setPromo(code) {
    cart.promo = String(code || '').trim().toUpperCase(); saveCart(); buzz();
    const s = storeInfo(cart.storeId); if (!s) return;
    const r = cart.promo && cartCalc(s).pr; if (r) HWOrders.toast(r.ok ? 'تم تطبيق الكود' : r.msg);
    renderCart();
}

/* ---------- الجدولة: مواعيد كل نصف ساعة ضمن دوام المتجر (اليوم وغدًا) ---------- */
const SCHED_HOURS = { on: true, days: [0, 1, 2, 3, 4, 5, 6].reduce((d, i) => { d[i] = { o: '10:00', c: '23:30' }; return d; }, {}) };
let whenDay = 0;
function slots(s) {
    const st = storeState[s.id] || {}, out = [], step = 30 * 60000;
    const hours = st.hours && st.hours.on ? st.hours : SCHED_HOURS;   // بلا دوام محدد: نعرض مواعيد النهار فقط
    const end = new Date(); end.setDate(end.getDate() + 2); end.setHours(0, 0, 0, 0);
    for (let t = Math.ceil((Date.now() + 45 * 60000) / step) * step; t < end.getTime(); t += step) if (HWBiz.inHours(hours, t).open && !(st.pausedUntil && st.pausedUntil > t)) out.push(t);
    return out;
}
function firstSlot(s) { return canSchedule(s) ? slots(s)[0] || 0 : 0; }
function openWhen() {
    const s = storeInfo(cart.storeId); if (!s) return;
    const list = slots(s), today = new Date().toDateString(), days = [[], []];
    list.forEach(t => days[new Date(t).toDateString() === today ? 0 : 1].push(t));
    if (!days[whenDay].length) whenDay = days[0].length ? 0 : 1;
    openSheet('<div class="sh-h"><b>جدولة الطلب</b><button type="button" class="is-x" onclick="closeSheet()" aria-label="إغلاق">' + IC.x + '</button></div>' +
        '<p class="mut">يصلك الطلب في الموعد المختار تقريبًا، ويبدأ المتجر بالتحضير قبله بوقت كافٍ.</p>' +
        '<div class="loc-tags">' + ['اليوم', 'غدًا'].map((d, i) => '<button type="button" class="lt' + (i === whenDay ? ' on' : '') + '" data-wday="' + i + '"' + (days[i].length ? '' : ' disabled') + '>' + d + '</button>').join('') + '</div>' +
        (days[whenDay].length ? '<div class="slots">' + days[whenDay].map(t => '<button type="button" class="slot' + (t === cart.when ? ' on' : '') + '" data-slot="' + t + '">' + HWOrders.fmtTime(t) + '</button>').join('') + '</div>' : '<div class="empty-orders">لا توجد مواعيد متاحة</div>'));
}

async function placeOrder() {
    const s = storeInfo(cart.storeId); if (!s || !cart.items.length) return;
    if (!myLoc()) { openAddrs(() => openCart()); return; }
    if (!isOpen(s) && !cart.when) { HWOrders.toast('المتجر مغلق، اختر موعدًا للجدولة'); return; }
    if (cart.when && cart.when < Date.now() + 30 * 60000) { cart.when = firstSlot(s); renderCart(); HWOrders.toast('تم تحديث موعد الجدولة'); return; }
    const off = cart.items.filter(x => { const f = findAny(s.id, x.id); return !f || !HWBiz.itemOn(f.it); });
    if (off.length) { HWOrders.toast(off[0].name + ' لم يعد متوفرًا، احذفه من السلة'); return; }
    cart.details = ($('cDetails').value || '').trim();
    if (cart.details.length < 3) { $('addrField').classList.add('invalid'); $('cDetails').focus(); return; }
    rememberDetails(cart.details);
    const btn = $('placeBtn'); btn.classList.add('loading');
    const r = await ensureRoute(s); btn.classList.remove('loading');
    const k = cartCalc(s), sl = storeLoc(s), l = myLoc(), fee = HWMap.fee(r.km), total = HWBiz.r2(k.items + fee - k.promo);
    const o = HWOrders.create({
        source: 'market', kind: 'market', storeId: s.id, storeName: s.name, storeStart: s.start,
        customer: { name: me.name, phone: me.phone },
        address: { lat: l[0], lng: l[1], label: me.loc.label, area: me.loc.label, details: cart.details, tag: me.loc.tag || '' },
        storeLoc: { lat: sl[0], lng: sl[1] }, route: r.pts, distKm: Math.round(r.km * 10) / 10, routeMin: r.min,
        items: cart.items.map(x => ({ id: x.id, name: x.name, price: x.price, qty: x.qty, notes: x.notes, opts: x.opts || [] })),
        itemsGross: k.gross, discount: k.dsc.amount, offerTitle: k.dsc.offer ? k.dsc.offer.title : '', itemsTotal: k.items,
        promoCode: k.promo ? k.pr.code : '', promoAmount: k.promo,
        fee, total, payment: 'cash', prepMin: k.prep, scheduledFor: cart.when || null,
        notes: ($('cNotes').value || '').trim(), storeState: 'pending',
        from: s.name, to: me.loc.label, price: money(fee), orderValue: money(k.items)
    });
    cart = blankCart(); saveCart(); updateCartUI();
    screenStack = ['screen-home', 'screen-orders']; openTrack(o.id);
    HWOrders.toast(o.scheduledFor ? 'تمت جدولة طلبك ' + fmtWhen(o.scheduledFor) : 'تم إرسال طلبك للمتجر'); buzz(20);
    if (HWPush.state() === 'off') HWPush.enable();         // أول طلب: نطلب الإذن ليعرف العميل حالة طلبه والتطبيق مغلق
}

/* =========================================================
   5) العناوين المحفوظة (البيت / العمل / آخر)
   ========================================================= */
function addrs() { return (me && me.addrs) || []; }
function useAddr(id) {
    const a = addrs().filter(x => x.id === id)[0]; if (!a) return;
    me.loc = a; saveMe(); cartRoute = null; cart.details = a.details || ''; saveCart(); renderAll(); buzz(12);
}
function rememberDetails(d) {                           // تفاصيل العنوان تُحفظ مع العنوان المختار للمرة القادمة
    if (!me.loc) return; me.loc.details = d;
    addrs().forEach(a => { if (a.id === me.loc.id) a.details = d; }); saveMe();
}
function openAddrs(cb) {
    if (cb) locCb = cb;
    if (!addrs().length) { openLoc(cb); return; }
    openSheet('<div class="sh-h"><b>عناوين التوصيل</b><button type="button" class="is-x" onclick="closeSheet()" aria-label="إغلاق">' + IC.x + '</button></div>' +
        addrs().map(a => { const t = TAGS[a.tag] || TAGS.other, on = me.loc && me.loc.id === a.id;
            return '<div class="ad' + (on ? ' on' : '') + '"><button type="button" class="ad-m" data-addr="' + H(a.id) + '"><span class="ad-ic">' + t[1] + '</span><div><b>' + H(a.name || t[0]) + '</b><small>' + H(a.label) + (a.details ? ' · ' + H(a.details) : '') + '</small></div>' + (on ? '<span class="ad-ck">' + IC.check + '</span>' : '') + '</button>' +
                '<button type="button" class="ad-a" data-addr-edit="' + H(a.id) + '" aria-label="تعديل">' + IC.edit + '</button><button type="button" class="ad-a" data-addr-del="' + H(a.id) + '" aria-label="حذف">' + IC.trash + '</button></div>'; }).join('') +
        '<button type="button" class="ghost-btn wide" style="margin-top:12px" onclick="closeSheet();openLoc()">+ إضافة عنوان جديد</button>');
}
function delAddr(id) {
    if (!confirm('حذف هذا العنوان؟')) return;
    me.addrs = addrs().filter(a => a.id !== id);
    if (me.loc && me.loc.id === id) me.loc = me.addrs[0] || null;
    saveMe(); cartRoute = null; renderAll(); openAddrs();
}

/* ---------- منتقي الموقع (خريطة + دبوس + نوع العنوان) ---------- */
function openLoc(cb, editId) {
    if (cb) locCb = cb; locPick = null; editAddrId = editId || null; closeSheet();
    const a = editId ? addrs().filter(x => x.id === editId)[0] : null, at = a ? [a.lat, a.lng] : null;
    locTag = a ? a.tag : (addrs().some(x => x.tag === 'home') ? (addrs().some(x => x.tag === 'work') ? 'other' : 'work') : 'home');
    $('locDetails').value = a ? a.details || '' : '';
    $('locName').value = a ? a.name || '' : '';
    renderLocTags();
    $('locFull').classList.add('show'); document.body.style.overflow = 'hidden';
    if (!locMap) {
        locMap = HWMap.create($('locMap'), { center: at || myLoc() || HWMap.center(), zoom: 16 });
        locMap.on('movestart', () => $('locPin').classList.add('drag'));
        locMap.on('moveend', () => { $('locPin').classList.remove('drag'); locAddress(); });
    }
    setTimeout(() => {
        locMap.invalidateSize();
        locMap.setView(at || myLoc() || HWMap.center(), 16, { animate: false });
        locAddress();
        if (!at && !myLoc()) locGps(true);
    }, 80);
}
function renderLocTags() {
    $('locTags').innerHTML = Object.keys(TAGS).map(k => '<button type="button" class="lt' + (k === locTag ? ' on' : '') + '" data-tag="' + k + '">' + TAGS[k][1] + TAGS[k][0] + '</button>').join('');
    $('locNameF').style.display = locTag === 'other' ? '' : 'none';
}
function closeLoc() { $('locFull').classList.remove('show'); document.body.style.overflow = ''; }
function locAddress() {
    const c = locMap.getCenter(); locPick = { lat: c.lat, lng: c.lng, label: '' };
    $('locAddr').textContent = 'جاري تحديد العنوان…';
    clearTimeout(locTimer);
    locTimer = setTimeout(async () => {
        const mine = locPick, t = await HWMap.reverse([c.lat, c.lng]);
        if (mine !== locPick) return;
        locPick.label = t || 'الموقع المحدد على الخريطة'; $('locAddr').textContent = locPick.label;
    }, 500);
}
function locGps(silent) {
    if (!navigator.geolocation) { if (!silent) HWOrders.toast('جهازك لا يدعم تحديد الموقع'); return; }
    navigator.geolocation.getCurrentPosition(p => { locMap.setView([p.coords.latitude, p.coords.longitude], 17, { animate: true }); buzz(10); },
        () => { if (!silent) HWOrders.toast('تعذر تحديد موقعك، حرّك الخريطة يدويًا'); }, { enableHighAccuracy: true, timeout: 9000 });
}
function confirmLoc() {
    if (!locPick) return;
    me.addrs = addrs();
    const old = editAddrId ? me.addrs.filter(x => x.id === editAddrId)[0] : (locTag !== 'other' ? me.addrs.filter(x => x.tag === locTag)[0] : null);
    const a = Object.assign(old || { id: 'a' + Date.now().toString(36) }, {
        tag: locTag, name: locTag === 'other' ? ($('locName').value || '').trim() : '',
        lat: +locPick.lat.toFixed(6), lng: +locPick.lng.toFixed(6), label: locPick.label || 'الموقع المحدد على الخريطة', details: ($('locDetails').value || '').trim()
    });
    if (!old) me.addrs.unshift(a);
    me.loc = a; cart.details = a.details; saveCart();
    saveMe(); closeLoc(); buzz(15); cartRoute = null; renderAll();
    if (locCb) { const f = locCb; locCb = null; f(); }
}

/* =========================================================
   6) الطلبات: الحالة، التتبع، التقييم، الدعم
   ========================================================= */
function mine() { return me ? allOrders.filter(o => o.kind === 'market' && o.customer && o.customer.phone === me.phone) : []; }
function isWaitingSchedule(o) { return o.scheduledFor && o.storeState !== 'pending' && o.status === 'new' && Date.now() < HWOrders.dispatchAt(o); }
function etaMinLeft(o) {
    if (o.scheduledFor) return Math.max(3, Math.round((o.scheduledFor - Date.now()) / 60000));
    const st = o.history.filter(x => x.s === 'store_accepted')[0], start = st ? st.t : o.createdAt;
    const total = (o.prepMin || 20) + (o.routeMin || CFG.travelMin || 15);
    return Math.max(3, Math.round(total - (Date.now() - start) / 60000));
}
function etaText(o) {
    if (o.status === 'cancelled') return 'تم إلغاء الطلب';
    if (o.status === 'delivered') { const e = o.history.filter(x => x.s === 'delivered')[0]; return 'تم التسليم' + (e ? ' ' + HWOrders.fmtTime(e.t) : ''); }
    if (o.storeState === 'pending') return o.scheduledFor ? 'مجدول ' + fmtWhen(o.scheduledFor) + ' · بانتظار تأكيد المتجر' : 'بانتظار تأكيد المتجر';
    if (isWaitingSchedule(o)) return 'موعد التوصيل ' + fmtWhen(o.scheduledFor);
    const left = etaMinLeft(o); return 'الوصول خلال ' + left + '–' + (left + 8) + ' دقيقة';
}
function bigStatus(o) {
    if (o.status === 'cancelled') return o.cancelReason || 'تم إلغاء الطلب';
    if (o.status === 'delivered') return 'وصل طلبك، بالهناء والشفاء';
    if (o.status === 'picked') return 'الكابتن في الطريق إليك';
    if (o.status === 'accepted') return 'الكابتن في الطريق للمتجر';
    if (o.storeState === 'pending') return 'بانتظار قبول المتجر';
    if (isWaitingSchedule(o)) return 'طلبك مجدول ومؤكد';
    return 'المتجر يحضّر طلبك' + (o.status === 'new' ? '، ونبحث لك عن كابتن' : '');
}
function stIcon(o) {
    if (o.status === 'cancelled') return ['bad', IC.x]; if (o.status === 'delivered') return ['done', IC.check];
    if (o.status === 'picked') return ['', IC.nav]; if (o.status === 'accepted') return ['', IC.bag];
    if (isWaitingSchedule(o)) return ['', IC.clock];
    return ['', o.storeState === 'pending' ? IC.wait : IC.cook];
}
function destOf(o) { return [o.address.lat, o.address.lng]; }
function srcOf(o) { return o.storeLoc ? [o.storeLoc.lat, o.storeLoc.lng] : (CFG.center || [32.0392, 35.7272]); }
function openTrack(id) {
    trackId = id; goTo('screen-track'); buildTrack(); renderTrack();
    setTimeout(() => { if (trk) { trk.map.invalidateSize(); fitTrack(); } }, 80);
}
function buildTrack() {
    const o = HWOrders.get(trackId); if (!o) { $('trackBody').innerHTML = '<div class="empty-orders">الطلب غير موجود</div>'; trk = null; return; }
    if (trk && trk.id === o.id && $('tkMap')) return;
    if (trk) { try { trk.map.remove(); } catch (e) {} trk = null; }
    $('trackBody').innerHTML = '<div class="tk"><div class="tk-map"><div class="lmap" id="tkMap"></div></div><div class="tk-sheet" id="tkSheet"></div></div>';
    const a = srcOf(o), b = destOf(o), map = HWMap.create($('tkMap'), { center: a, zoom: 14 });
    HWMap.line(map, o.route || [a, b]);
    L.marker(a, { icon: HWMap.ICON.store(o.storeId), interactive: false }).addTo(map);
    L.marker(b, { icon: HWMap.ICON.home(), interactive: false }).addTo(map);
    trk = { id: o.id, map, pts: (o.route || [a, b]).concat([a, b]) };
    fitTrack();
}
function fitTrack() { if (trk) HWMap.fit(trk.map, trk.pts, [50, 50]); }
function rateCard(o) {
    if (o.status !== 'delivered') return '';
    if (o.rating) return '<div class="cart-card rated"><b>تقييمك</b><span class="stars">' + HWBiz.stars(o.rating.store) + '</span>' + (o.rating.comment ? '<p class="mut">' + H(o.rating.comment) + '</p>' : '') + '</div>';
    return '<button type="button" class="rate-cta" onclick="openRate(\'' + o.id + '\')"><span class="stars">☆☆☆☆☆</span><div><b>كيف كانت تجربتك؟</b><small>قيّم المتجر والكابتن خلال ثوانٍ</small></div></button>';
}
function renderTrack() {
    const o = HWOrders.get(trackId); if (!o || !trk || trk.id !== o.id) { buildTrack(); if (!trk) return; }
    const s = storeInfo(o.storeId), ic = stIcon(o), n = HWOrders.stage(o), act = HWOrders.isActive(o), live = act && o.storeState !== 'pending' && !isWaitingSchedule(o);
    const labels = ['تأكيد', 'تحضير', 'كابتن', 'توصيل', 'تسليم'], canCancel = o.status === 'new' && o.storeState === 'pending';
    const cap = o.captain ? '<div class="cart-card"><div class="cap-row"><span class="av">' + H(o.captain.name.trim().charAt(0)) + '</span><div class="t"><b>' + H(o.captain.name) + '</b><small>' + (o.status === 'picked' ? 'استلم طلبك وفي الطريق إليك' : o.status === 'delivered' ? 'سلّمك الطلب' : 'في الطريق للمتجر') + '</small></div>' + (act && o.captain.phone ? '<a href="tel:' + H(o.captain.phone) + '" aria-label="اتصال بالكابتن">' + IC.phone + '</a>' : '') + '</div></div>' : '';
    const pin = act && o.pin && o.storeState !== 'pending' ? '<div class="pin-card"><div><b>رمز التسليم</b><small>أعطِ الرمز للكابتن عند استلام طلبك</small></div><span class="pin" dir="ltr">' + H(o.pin) + '</span></div>' : '';
    $('tkSheet').innerHTML =
        '<div class="tk-grab"></div><div class="tk-head"><span class="tk-ic ' + ic[0] + '">' + ic[1] + '</span><div class="tk-ht"><small>' + codeH(o) + ' · ' + H(o.storeName) + '</small>' + (live ? '<div class="tk-eta"><b>' + etaMinLeft(o) + '–' + (etaMinLeft(o) + 8) + '</b><span>دقيقة</span></div>' : '') + '<h1>' + bigStatus(o) + '</h1>' + (live ? '' : '<p>' + etaText(o) + '</p>') + '</div></div>' +
        (o.status === 'cancelled' ? '' : '<div class="tk-steps">' + labels.map((l, i) => '<i class="' + (i < n ? 'done' : i === n ? 'act' : '') + '"></i>').join('') + '</div><div class="tk-lbls">' + labels.map(l => '<span>' + l + '</span>').join('') + '</div>') +
        pin + rateCard(o) + cap +
        '<h3 class="sec-t">طلبك</h3><div class="cart-card">' + o.items.map(l => '<div class="cl ro"><div class="cl-txt"><b>' + l.qty + '× ' + H(l.name) + '</b>' + (l.opts && l.opts.length ? '<small class="cl-opts">' + H(optsText(l.opts)) + '</small>' : '') + (l.notes ? '<small>' + H(l.notes) + '</small>' : '') + '</div><span>' + money(l.price * l.qty) + '</span></div>').join('') + '</div>' +
        '<div class="cart-card sum"><div><span>المجموع الفرعي</span><b>' + money(o.itemsGross || o.itemsTotal) + ' د.أ</b></div>' + (o.discount ? '<div class="dsc"><span>' + H(o.offerTitle || 'خصم') + '</span><b>−' + money(o.discount) + ' د.أ</b></div>' : '') + (o.promoAmount ? '<div class="dsc"><span>كود ' + H(o.promoCode) + '</span><b>−' + money(o.promoAmount) + ' د.أ</b></div>' : '') + '<div><span>رسوم التوصيل' + (o.distKm ? ' · ' + o.distKm + ' كم' : '') + '</span><b>' + money(o.fee) + ' د.أ</b></div><div class="tot"><span>الإجمالي (نقدًا عند الاستلام)</span><b>' + money(o.total) + ' د.أ</b></div></div>' +
        '<h3 class="sec-t">التوصيل إلى</h3><div class="cart-card"><b>' + H(o.address.label || o.address.area) + '</b><p class="mut">' + H(o.address.details) + '</p>' + (o.scheduledFor ? '<p class="mut">الموعد: ' + fmtWhen(o.scheduledFor) + '</p>' : '') + '</div>' +
        '<h3 class="sec-t">سجل الطلب</h3><div class="cart-card">' + HWOrders.timeline(o) + '</div>' +
        '<div class="tk-acts">' +
        (canCancel ? '<button type="button" class="ghost-btn dng" onclick="cancelMine(\'' + o.id + '\')">إلغاء الطلب</button>' : '') +
        '<button type="button" class="ghost-btn" onclick="openSupport(\'' + o.id + '\')">' + IC.help + 'مساعدة بخصوص الطلب</button>' +
        (s && !act ? '<button type="button" class="ghost-btn" onclick="reorder(\'' + o.id + '\')">إعادة نفس الطلب</button>' : '') + '</div>';
}
function reorder(id) {
    const o = HWOrders.get(id); if (!o) return;
    const items = [];
    o.items.forEach(l => { const f = findAny(o.storeId, l.id); if (f && HWBiz.itemOn(f.it)) items.push({ key: l.id + '|' + optsText(l.opts).replace(/ · /g, ',') + '|' + (l.notes || ''), id: l.id, name: l.name, price: l.price, opts: l.opts || [], qty: l.qty, notes: l.notes || '', prep: f.it.prepMin || 0 }); });
    if (!items.length) { HWOrders.toast('أصناف هذا الطلب غير متوفرة حاليًا'); return; }
    if (cart.items.length && cart.storeId !== o.storeId && !confirm('سلتك فيها منتجات من متجر آخر. استبدالها؟')) return;
    cart = blankCart(cart.details || o.address.details || ''); cart.storeId = o.storeId; cart.items = items; saveCart(); buzz(15);
    if (items.length < o.items.length) HWOrders.toast('بعض الأصناف لم تعد متوفرة');
    openCart();
}
function cancelMine(id) {
    const o = HWOrders.get(id);
    if (o && o.status === 'new' && o.storeState === 'pending' && confirm('إلغاء هذا الطلب؟')) { HWOrders.update(id, { status: 'cancelled', cancelReason: 'ألغيتَ الطلب' }); buzz(15); }
}
function openSupport(id) {
    const o = id ? HWOrders.get(id) : null;
    const msg = 'مرحبًا HIGHWAY، أنا ' + me.name + ' (' + me.phone + ')' + (o ? '\nبخصوص الطلب ' + o.code + ' من ' + o.storeName + ' — الحالة: ' + HWOrders.label(o) : '') + '\n';
    window.open('https://wa.me/' + SUPPORT_WA + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
}

/* ---------- التقييم بعد التسليم ---------- */
function openRate(id) {
    const o = HWOrders.get(id); if (!o || o.rating) return;
    rateCtx = { id, store: 0, captain: 0 };
    const row = (k, t, sub) => '<div class="rt-row"><div><b>' + t + '</b><small>' + H(sub) + '</small></div><div class="rt-stars" data-k="' + k + '">' + [1, 2, 3, 4, 5].map(v => '<button type="button" data-v="' + v + '" aria-label="' + v + '">' + IC.star + '</button>').join('') + '</div></div>';
    openSheet('<div class="sh-h"><b>قيّم طلبك ' + H(o.code) + '</b><button type="button" class="is-x" onclick="closeSheet()" aria-label="إغلاق">' + IC.x + '</button></div>' +
        row('store', 'المتجر', o.storeName) + (o.captain ? row('captain', 'الكابتن', o.captain.name) : '') +
        '<div class="field"><label for="rtC">ملاحظاتك <span class="opt">(اختياري)</span></label><textarea id="rtC" rows="2" placeholder="ما الذي أعجبك؟ ما الذي يمكن تحسينه؟"></textarea></div>' +
        '<button type="button" class="submit-btn" onclick="sendRate()"><span class="btn-label">إرسال التقييم</span></button>');
}
function sendRate() {
    if (!rateCtx.store) { HWOrders.toast('اختر تقييم المتجر'); return; }
    HWOrders.update(rateCtx.id, { rating: { store: rateCtx.store, captain: rateCtx.captain || 0, comment: ($('rtC').value || '').trim(), at: Date.now() } }, 'rated');
    closeSheet(); HWOrders.toast('شكرًا لتقييمك'); buzz(20);
}

/* ---------- قائمة الطلبات ---------- */
function renderOrders() {
    const l = mine(), act = l.filter(HWOrders.isActive), past = l.filter(o => !HWOrders.isActive(o));
    const row = (o) => '<div role="button" tabindex="0" class="co s-' + o.status + '" data-id="' + H(o.id) + '">' + logoImg(o.storeId, 'co-logo') + '<div class="co-m"><b>' + H(o.storeName) + '</b><small>' + codeH(o) + ' · ' + countAr(o.items.reduce((n, i) => n + i.qty, 0), 'منتج', 'منتجان', 'منتجات', 'منتجًا') + ' · ' + money(o.total) + ' د.أ</small>' +
        '<span class="oc-chip">' + HWOrders.label(o) + '</span></div><div class="co-side"><span class="co-time">' + HWOrders.ago(o.createdAt) + '</span>' +
        (HWOrders.isActive(o) ? '' : o.status === 'delivered' && !o.rating ? '<button type="button" class="co-re rt" data-rate="' + H(o.id) + '">★ قيّم</button>' : '<button type="button" class="co-re" data-re="' + H(o.id) + '">إعادة الطلب</button>') + '</div>' + (HWOrders.isActive(o) ? HWOrders.progress_(o) : '') + '</div>';
    $('myOrders').innerHTML = (act.length ? '<h3 class="sec-t">الحالية</h3>' + act.map(row).join('') : '') + (past.length ? '<h3 class="sec-t">السابقة</h3>' + past.map(row).join('') : '') ||
        '<div class="empty-orders rich"><div class="em-art">' + IC.orders + '</div>لم تطلب شيئًا بعد<br><button type="button" class="more-link" onclick="tabGo(\'screen-home\')">ابدأ بتصفح المتاجر</button></div>';
    const badge = $('tabBadge'); badge.textContent = act.length; badge.classList.toggle('on', act.length > 0);
}
const NOTE = {
    store_accepted: (o) => o.scheduledFor ? 'المتجر أكّد طلبك المجدول ' + o.code : 'المتجر بدأ بتحضير طلبك ' + o.code,
    accepted: (o) => 'الكابتن ' + ((o.captain && o.captain.name) || '') + ' استلم طلبك وهو في الطريق للمتجر',
    picked: (o) => 'الكابتن استلم طلبك وهو في الطريق إليك',
    delivered: (o) => 'تم تسليم طلبك ' + o.code + '، بالهناء والشفاء',
    cancelled: (o) => (o.cancelReason || 'تم إلغاء طلبك') + ' ' + o.code
};
function sigOf(o) { return o.status + '|' + o.storeState; }
function onOrders(list) {
    allOrders = list;
    const m = mine();
    if (prevSig) m.forEach(o => {
        const was = prevSig[o.id]; if (!was || was === sigOf(o)) return;
        const key = o.status !== was.split('|')[0] ? o.status : (o.storeState === 'preparing' ? 'store_accepted' : '');
        if (NOTE[key]) { HWOrders.toast(NOTE[key](o)); HWNotify.play(key === 'cancelled' ? 'alert' : 'status'); HWNotify.notify('HIGHWAY', NOTE[key](o)); buzz(24); delete dismissed[o.id]; }
        if (key === 'delivered' && !o.rating) setTimeout(() => openRate(o.id), 1500);
    });
    prevSig = {}; m.forEach(o => { prevSig[o.id] = sigOf(o); });
    if (me) fillProfile(); renderOrders(); renderLive(); if (currentScreen === 'screen-track') renderTrack();
    if (currentScreen === 'screen-home') renderStores();          // التقييمات على بطاقات المتاجر
}

/* شريط الحالة العائم */
function renderLive() {
    const bar = $('liveBar'); if (!bar) return;
    const o = mine().filter(x => HWOrders.isActive(x) && dismissed[x.id] !== sigOf(x))[0];
    const show = !!o && currentScreen !== 'screen-track';
    bar.classList.toggle('show', show); document.body.classList.toggle('has-live', show);
    if (!o) return;
    bar.dataset.id = o.id;
    $('lvTitle').textContent = bigStatus(o);
    $('lvSub').textContent = o.storeName + ' · ' + etaText(o);
    const n = HWOrders.stage(o), st = HWOrders.steps(o);
    $('lvTrack').innerHTML = st.map((s, i) => '<span class="' + (i < n ? 'done' : i === n ? 'act' : '') + '"><i></i>' + s[1].replace('تم ', '').replace('الكابتن ', '') + '</span>').join('');
}
function hideLive(e) { if (e) e.stopPropagation(); const id = $('liveBar').dataset.id, o = HWOrders.get(id); if (o) dismissed[id] = sigOf(o); renderLive(); }
function liveOpen(e) { if (e.target.closest('.lv-x')) return; openTrack($('liveBar').dataset.id); }

/* =========================================================
   7) المفضلة والحساب
   ========================================================= */
function renderFavs() {
    const fs = ((me.favs && me.favs.s) || []).map(storeInfo).filter(Boolean);
    const fi = ((me.favs && me.favs.i) || []).map(k => { const p = k.split(':'), s = storeInfo(p[0]), f = s && findAny(p[0], p[1]); return f ? { s, f } : null; }).filter(Boolean);
    $('favsBody').innerHTML = (fs.length ? '<h3 class="sec-t">متاجر</h3>' + fs.map(vcCard).join('') : '') +
        (fi.length ? '<h3 class="sec-t">أصناف</h3>' + fi.map(x => '<button type="button" class="sr" data-si="' + H(x.s.id) + '" data-c="' + H(x.f.c.id) + '" data-i="' + H(x.f.it.id) + '"><span class="ic">' + HWFood.forItem(x.f.it.name, x.f.it.desc, x.f.c.name, x.s.cat) + '</span><div class="t"><b>' + H(x.f.it.name) + '</b><small>' + H(x.s.name) + (HWBiz.itemOn(x.f.it) ? '' : ' · غير متوفر الآن') + '</small></div><span class="p">' + money(x.f.it.price) + ' د.أ</span></button>').join('') : '') ||
        '<div class="empty-orders rich"><div class="em-art">' + IC.heart + '</div>لا توجد مفضلات بعد<br><small>اضغط على القلب في صفحة المتجر أو الصنف</small></div>';
}
function fillProfile() {
    $('pfName').textContent = me.name; $('pfPhone').textContent = me.phone; $('pfInitial').textContent = me.name.trim().charAt(0) || '؟';
    $('pfArea').textContent = addrs().length ? countAr(addrs().length, 'عنوان', 'عنوانان', 'عناوين', 'عنوانًا') : 'غير محدد';
    const nf = ((me.favs && me.favs.s) || []).length + ((me.favs && me.favs.i) || []).length;
    $('pfFavs').textContent = nf ? nf : '';
    const done = mine().filter(o => o.status === 'delivered').length;
    $('pfChip').textContent = done ? countAr(done, 'طلب', 'طلبان', 'طلبات', 'طلبًا') + ' مكتمل' : 'عميل HIGHWAY';
    $('homeHello').textContent = 'أهلًا ' + me.name.split(' ')[0];
    const tg = me.loc && TAGS[me.loc.tag];
    $('locLabel').textContent = me.loc ? 'التوصيل إلى ' + (tg && me.loc.tag !== 'other' ? tg[0] : me.loc.name || me.loc.label) : 'حدّد موقع التوصيل';
    $('locPill').classList.toggle('need', !me.loc);
}
function renderAll() {
    if (!me) return;
    fillProfile(); renderStores(); renderOrders(); updateCartUI();
    if (curStore && currentScreen === 'screen-store') renderStore();
    if (currentScreen === 'screen-cart') renderCart();
    if (currentScreen === 'screen-favs') renderFavs();
    if (currentScreen === 'screen-offers') renderOffersPage();
}

/* =========================================================
   8) التنقل والدخول
   ========================================================= */
function syncTabs(id) {
    document.querySelectorAll('.tab').forEach(t => {
        const on = t.dataset.tab === TAB_OF[id];
        t.classList.toggle('on', on);
        if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
}
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active'); currentScreen = id;
    $('headerBack').classList.toggle('show', ROOTS.indexOf(id) < 0);
    if (id === 'screen-search') { renderSearch(); setTimeout(() => { try { $('storeSearch').focus({ preventScroll: true }); } catch (e) {} }, 120); }
    if (id === 'screen-favs') renderFavs();
    syncTabs(id); updateCartUI(); renderLive();
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (id === 'screen-track' && trk) setTimeout(() => { trk.map.invalidateSize(); fitTrack(); }, 60);
}
function goTo(id) { if (screenStack[screenStack.length - 1] !== id) screenStack.push(id); showScreen(id); }
function goBack() { if (screenStack.length > 1) { screenStack.pop(); showScreen(screenStack[screenStack.length - 1]); } }
function tabGo(id) { buzz(); screenStack = id === 'screen-home' ? ['screen-home'] : ['screen-home', id]; showScreen(id); if (id === 'screen-home') renderStores(); }

function normPhone(v) {
    let d = String(v || '').replace(/\D/g, '');
    if (d.startsWith('962')) d = d.slice(3);
    if (d.startsWith('0')) d = d.slice(1);
    return /^7\d{8}$/.test(d) ? '0' + d : '';
}
function migrateUser(u) {                               // حسابات النسخ السابقة: موقع واحد ← قائمة عناوين
    u.favs = u.favs || { s: [], i: [] };
    if (!u.addrs) { u.addrs = []; if (u.loc) { u.loc = Object.assign({ id: 'a1', tag: 'home' }, u.loc); u.addrs.push(u.loc); } }
    return u;
}
function applyUser(u) {
    me = u ? migrateUser(u) : null;
    document.body.classList.toggle('authed', !!u);
    $('appShell').inert = !u;
    if (u) fillProfile();
}
async function submitLogin(ev) {
    ev.preventDefault();
    const err = $('loginError'), name = $('loginUser').value.trim(), phone = normPhone($('loginPass').value);
    err.textContent = ''; ['loginUserField', 'loginPassField'].forEach(id => $(id).classList.remove('invalid'));
    if (!name) { $('loginUserField').classList.add('invalid'); err.textContent = 'الرجاء إدخال اسمك'; return; }
    if (!phone) { $('loginPassField').classList.add('invalid'); err.textContent = 'أدخل رقم هاتف أردني صحيح (07XXXXXXXX)'; return; }
    const btn = $('loginBtn'); btn.classList.add('loading'); await new Promise(r => setTimeout(r, 350)); btn.classList.remove('loading');
    const old = readJSON(PROFILE_KEY, null);
    applyUser(old && old.phone === phone ? Object.assign(old, { name }) : { name, phone, loc: null });
    saveMe(); finishLogin(); renderAll(); deepLink();
    if (!me.loc) setTimeout(() => openLoc(), 700);
}
function logout() { try { localStorage.removeItem(PROFILE_KEY); localStorage.removeItem(CART_KEY); } catch (e) {} location.reload(); }
function deepLink() {                                   // رابط مشاركة متجر: ?store=id
    let id = ''; try { id = new URLSearchParams(location.search).get('store') || ''; } catch (e) {}
    if (id && storeInfo(id) && me) { openStore(id); try { history.replaceState(null, '', location.pathname); } catch (e) {} }
}

/* =========================================================
   9) الأحداث
   ========================================================= */
document.addEventListener('click', (e) => {
    const t = e.target;
    let el;
    if ((el = t.closest('[data-fav-s]'))) { toggleFav('s', el.dataset.favS); el.classList.toggle('on'); renderStores(); return; }
    if ((el = t.closest('[data-fav-i]'))) { toggleFav('i', el.dataset.favI); el.classList.toggle('on'); return; }
    if ((el = t.closest('[data-ann]'))) { const s = readJSON(ANN_KEY, []); s.push(el.dataset.ann); try { localStorage.setItem(ANN_KEY, JSON.stringify(s.slice(-50))); } catch (x) {} renderAnnouncements(); return; }
    if ((el = t.closest('.cat2'))) { catFilter = el.dataset.c; buzz(); if (el.dataset.go) tabGo('screen-home'); renderStores(); return; }
    if ((el = t.closest('.vc, .lg-it, .sr[data-s], .ofc'))) { buzz(); openStore(el.dataset.s); return; }
    if ((el = t.closest('.sr[data-si]'))) { buzz(); openStore(el.dataset.si); setTimeout(() => openItem(el.dataset.c, el.dataset.i), 200); return; }
    if ((el = t.closest('.srt'))) { if (el.dataset.open) openOnly = !openOnly; else sortBy = el.dataset.sort; buzz(); renderStores(); return; }
    if ((el = t.closest('.bn'))) { buzz(); if (el.dataset.bn === 'offers') openOffers(); else if (el.dataset.bn === 'orders') tabGo('screen-orders'); else $('allStores').scrollIntoView({ behavior: 'smooth' }); return; }
    if ((el = t.closest('[data-rate]'))) { e.stopPropagation(); openRate(el.dataset.rate); return; }
    if ((el = t.closest('.co-re'))) { e.stopPropagation(); reorder(el.dataset.re); return; }
    if ((el = t.closest('.mi-f'))) { openItem(el.dataset.c, el.dataset.i); return; }
    if ((el = t.closest('#catTabs .ctab'))) { document.querySelectorAll('#catTabs .ctab').forEach(c => c.classList.toggle('on', c === el)); const sec = $('sec-' + el.dataset.i); if (sec) window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - 56, behavior: 'smooth' }); return; }
    if ((el = t.closest('.mi-add'))) {                  // الإضافة السريعة؛ الصنف ذو الخيارات يفتح ورقته
        e.stopPropagation(); const mi = el.closest('.mi'), it = findItem(curStore, mi.dataset.c, mi.dataset.i);
        if (it && (it.options || []).length) openItem(mi.dataset.c, mi.dataset.i); else if (it && addToCart(curStore, it, 1, '', {})) renderStore();
        return;
    }
    if ((el = t.closest('.mi'))) { openItem(el.dataset.c, el.dataset.i); return; }
    if ((el = t.closest('#cartBody .qty button'))) { const l = cart.items[+el.dataset.i]; if (l) { l.qty += +el.dataset.q; if (l.qty <= 0) cart.items.splice(+el.dataset.i, 1); saveCart(); updateCartUI(); renderCart(); buzz(); } return; }
    if ((el = t.closest('.wh'))) { if (el.dataset.when === 'now') { cart.when = 0; saveCart(); renderCart(); } else openWhen(); buzz(); return; }
    if ((el = t.closest('[data-wday]'))) { whenDay = +el.dataset.wday; openWhen(); buzz(); return; }
    if ((el = t.closest('.slot'))) { cart.when = +el.dataset.slot; saveCart(); closeSheet(); renderCart(); buzz(12); return; }
    if ((el = t.closest('.co'))) { buzz(); openTrack(el.dataset.id); return; }
    if ((el = t.closest('.oc-ch'))) { toggleChoice(el.closest('.og').dataset.g, el.dataset.ch); return; }
    if ((el = t.closest('#itemSheetBody .qty button'))) { itemCtx.qty = Math.max(1, itemCtx.qty + +el.dataset.q); $('isQty').textContent = itemCtx.qty; updateItemBtn(); buzz(); return; }
    if ((el = t.closest('.rt-stars button'))) {
        const k = el.parentNode.dataset.k, v = +el.dataset.v; rateCtx[k] = v; buzz();
        el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v <= v)); return;
    }
    if ((el = t.closest('[data-addr]'))) { useAddr(el.dataset.addr); closeSheet(); if (locCb) { const f = locCb; locCb = null; f(); } return; }
    if ((el = t.closest('[data-addr-edit]'))) { openLoc(null, el.dataset.addrEdit); return; }
    if ((el = t.closest('[data-addr-del]'))) { delAddr(el.dataset.addrDel); return; }
    if ((el = t.closest('.lt'))) { locTag = el.dataset.tag; renderLocTags(); buzz(); return; }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeItemSheet(); closeSheet(); closeLoc(); } });
try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
window.addEventListener('pageshow', (e) => { window.scrollTo(0, 0); if (e.persisted) location.reload(); });

/* =========================================================
   10) التشغيل
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    buildSplashIcons();
    $('demoBanner').style.display = HWDB.mode === 'local' ? '' : 'none';
    HWDemo.seed();
    cart = Object.assign(cart, readJSON(CART_KEY, {}));
    cart.items = (cart.items || []).map(x => Object.assign({ key: x.id + '||' + (x.notes || ''), opts: [] }, x));   // سلة من نسخة سابقة
    if (cart.when && cart.when < Date.now()) cart.when = 0;
    const saved = readJSON(PROFILE_KEY, null);
    applyUser(saved && saved.phone ? saved : null);
    const splash = $('splash');
    let skip = false; try { skip = sessionStorage.getItem('hw-skip-splash') === '1'; sessionStorage.removeItem('hw-skip-splash'); } catch (e) {}
    if (!saved) skip = false;
    if (skip) { splash.style.transition = 'none'; splash.classList.add('hide'); }
    introCtl = skip ? null : initIntroVideo();
    $('loginForm').addEventListener('submit', submitLogin);
    $('enterBtn').addEventListener('click', () => { if (me) finishLogin(); else openLogin(); });
    const rerender = () => { if (me) renderAll(); };
    HWBiz.offers.subscribe(rerender); HWBiz.promos.subscribe(() => { if (currentScreen === 'screen-cart') renderCart(); });
    HWBiz.announcementsCol.subscribe(() => { if (me) renderAnnouncements(); });
    HWDB.col('menus').subscribe(l => { menus = {}; l.forEach(m => { menus[m.id] = m; }); rerender(); });
    HWDB.col('storestate').subscribe(l => { storeState = {}; l.forEach(m => { storeState[m.id] = m; }); rerender(); });
    HWOrders.subscribe(onOrders);
    HWBiz.storesCol.subscribe(() => { STORES = HWBiz.storeList(); rerender(); });
    HWBiz.onMedia(rerender);                                 // شعار أو غلاف جديد من الإدارة
    renderAll(); showScreen('screen-home'); if (me) deepLink();
    HWPush.init('customer', () => me && me.phone, { open: (id) => { if (me && HWOrders.get(id)) { screenStack = ['screen-home', 'screen-orders']; openTrack(id); } } });
    setInterval(() => { if (!document.hidden && me) { renderOrders(); renderLive(); if (currentScreen === 'screen-track') renderTrack(); } }, 15000);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && splash.classList.contains('login-mode') && !splash.classList.contains('hide')) closeLogin(); });
});
