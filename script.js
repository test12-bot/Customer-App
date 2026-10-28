/* ---------- أيقونات الشاشة الافتتاحية (طعام) ---------- */
const FOOD_ICONS = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11c0-3.5 3.6-6 8-6s8 2.5 8 6H4Z"/><path d="M3 14.5h18"/><path d="M5 17.5h14v.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-.5Z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3C8 3 4.5 4.5 2.5 7L12 21 21.5 7C19.5 4.5 16 3 12 3Z"/><circle cx="10" cy="9" r="1.2"/><circle cx="14" cy="11" r="1.2"/><circle cx="12" cy="15" r="1"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V8Z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3v2M11 3v2M14 3v2"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v7a2 2 0 0 0 2 2v9"/><path d="M10 3v7a2 2 0 0 1-2 2"/><path d="M17 3c-2 1.5-3 4-3 7h3v11"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11a5 5 0 0 1 10 0"/><path d="M6.5 11h11L12 21 6.5 11Z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>'
];

function buildSplashIcons() {
    const wrap = document.getElementById('splashIcons');
    const SPL = window.HWFood ? HWFood.splashSet() : FOOD_ICONS;
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
   تطبيق العملاء — HIGHWAY Delivery (v2: خريطة + تسعير بالمسافة)
   ========================================================= */
const CFG = window.HW_CONFIG, STORES = CFG.stores;
const PROFILE_KEY = 'hwc-user', CART_KEY = 'hwc-cart';
const $ = (id) => document.getElementById(id);
const H = HWOrders.esc, money = HWOrders.money;
const ROOTS = ['screen-home', 'screen-search', 'screen-orders', 'screen-profile'];
const TAB_OF = { 'screen-search': 'search', 'screen-home': 'home', 'screen-store': 'home', 'screen-cart': 'home', 'screen-orders': 'orders', 'screen-track': 'orders', 'screen-profile': 'profile' };
const IC = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/></svg>',
    wait: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12M6 21h12"/><path d="M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/></svg>',
    cook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14v4a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-4Z"/><path d="M3 12h18"/><path d="M9 3c-1 1.5 1 2.5 0 4M13 3c-1 1.5 1 2.5 0 4M17 3c-1 1.5 1 2.5 0 4"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    nav: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-8-8 18-2-8-8-2Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.8"/><path d="M6 12h.01M18 12h.01"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6h15l-1.6 8.2a2 2 0 0 1-2 1.6H9a2 2 0 0 1-2-1.6L5 3H2"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l2 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7l2-4Z"/><path d="M4 7h16M9 11h6"/></svg>'
};
const CAT_ICON = { 'الكل': 3, 'حلويات': 4, 'مطاعم': 3, 'برغر': 0, 'مناسف': 3, 'شاورما': 1, 'قهوة': 2, 'معجنات': 5 };

let me = null, cart = { storeId: '', items: [], details: '', notes: '' };
let screenStack = ['screen-home'], currentScreen = 'screen-home';
let menus = {}, storeState = {}, allOrders = [], prevSig = null, trackId = null, curStore = '', catFilter = 'الكل', itemCtx = null;
let sortBy = 'near', openOnly = false;
const TITLES = { 'screen-cart': 'سلتك', 'screen-orders': 'طلباتي', 'screen-track': 'تتبع الطلب', 'screen-profile': 'حسابي', 'screen-search': 'البحث' };
let cartRoute = null, cartMini = null, trk = null, locMap = null, locCb = null, locTimer = null, locPick = null;
const dismissed = {};

/* ---------- أدوات ---------- */
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {} }
function sortKey(name) { return String(name).replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').trim(); }
function storeInfo(id) { return STORES.filter(s => s.id === id)[0]; }
function logoImg(id, cls) { return '<img class="' + (cls || 'lg') + '" src="avatars/' + H(id) + '.jpg" alt="" onerror="this.src=\'logo-icon.png\'">'; }
function readJSON(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function saveMe() { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(me)); } catch (e) {} }
function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} }
function foodIcon(i) { return FOOD_ICONS[Math.abs(i) % FOOD_ICONS.length]; }
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
function pattern(seed, dark) {
    const pos = [[6, 12, 34], [30, 62, 26], [56, 8, 30], [78, 58, 36], [92, 14, 24], [44, 70, 22], [66, 32, 20]];
    return pos.map((p, i) => '<span class="pt' + (dark ? ' dk' : '') + '" style="left:' + p[0] + '%;top:' + p[1] + '%;width:' + p[2] + 'px;height:' + p[2] + 'px;transform:rotate(' + ((i * 37 + seed) % 50 - 25) + 'deg)">' + foodIcon(i + seed) + '</span>').join('');
}

/* ---------- القائمة والموقع ---------- */
function menuOf(id) { return menus[id] || { cats: [] }; }
function itemCount(id) { return menuOf(id).cats.reduce((n, c) => n + c.items.filter(i => i.on !== false).length, 0); }
function isOpen(s) { return (storeState[s.id] || {}).open !== false && itemCount(s.id) > 0; }
function prepMin(s) { return (storeState[s.id] || {}).prepMin || 20; }
function storeLoc(s) { const st = storeState[s.id] || {}; return st.lat != null ? [st.lat, st.lng] : (CFG.center || [32.0392, 35.7272]); }
function myLoc() { return me && me.loc ? [me.loc.lat, me.loc.lng] : null; }
function estKm(s) { const l = myLoc(); return l ? HWMap.est(storeLoc(s), l) : null; }
function estFee(s) { const k = estKm(s); return k == null ? null : HWMap.fee(k); }
function estEta(s) { const k = estKm(s); return prepMin(s) + (k == null ? CFG.travelMin || 15 : Math.max(5, Math.round(k / 0.45))); }
function cartCount() { return cart.items.reduce((n, i) => n + i.qty, 0); }
function cartTotal() { return cart.items.reduce((n, i) => n + i.qty * i.price, 0); }
function codeH(o) { return '<span class="code">' + H(o.code) + '</span>'; }

/* ---------- التنقل ---------- */
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
    document.body.classList.toggle('on-store', id === 'screen-store');
    document.body.classList.toggle('sub-page', id !== 'screen-home' && id !== 'screen-store');
    $('pageTitle').textContent = TITLES[id] || '';
    if (id === 'screen-search') { renderSearch(); setTimeout(() => { try { $('storeSearch').focus({ preventScroll: true }); } catch (e) {} }, 120); }
    syncTabs(id); updateCartUI(); renderLive();
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (id === 'screen-track' && trk) setTimeout(() => { trk.map.invalidateSize(); fitTrack(); }, 60);
}
function goTo(id) { if (screenStack[screenStack.length - 1] !== id) screenStack.push(id); showScreen(id); }
function goBack() { if (screenStack.length > 1) { screenStack.pop(); showScreen(screenStack[screenStack.length - 1]); } }
function tabGo(id) { buzz(); screenStack = id === 'screen-home' ? ['screen-home'] : ['screen-home', id]; showScreen(id); if (id === 'screen-home') renderStores(); }

/* ---------- الدخول ---------- */
function normPhone(v) {
    let d = String(v || '').replace(/\D/g, '');
    if (d.startsWith('962')) d = d.slice(3);
    if (d.startsWith('0')) d = d.slice(1);
    return /^7\d{8}$/.test(d) ? '0' + d : '';
}
function applyUser(u) {
    me = u;
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
    saveMe(); finishLogin(); renderAll();
    if (!me.loc) setTimeout(() => openLoc(), 700);
}
function logout() { try { localStorage.removeItem(PROFILE_KEY); localStorage.removeItem(CART_KEY); } catch (e) {} location.reload(); }

/* ---------- منتقي الموقع (خريطة + دبوس) ---------- */
function openLoc(cb) {
    locCb = cb || null; locPick = null;
    $('locFull').classList.add('show'); document.body.style.overflow = 'hidden';
    if (!locMap) {
        locMap = HWMap.create($('locMap'), { center: myLoc() || HWMap.center(), zoom: 16 });
        locMap.on('movestart', () => $('locPin').classList.add('drag'));
        locMap.on('moveend', () => { $('locPin').classList.remove('drag'); locAddress(); });
    }
    setTimeout(() => {
        locMap.invalidateSize();
        locMap.setView(myLoc() || HWMap.center(), 16, { animate: false });
        locAddress();
        if (!myLoc()) locGps(true);
    }, 80);
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
    me.loc = { lat: +locPick.lat.toFixed(6), lng: +locPick.lng.toFixed(6), label: locPick.label || 'الموقع المحدد على الخريطة' };
    saveMe(); closeLoc(); buzz(15); cartRoute = null; renderAll();
    if (locCb) { const f = locCb; locCb = null; f(); }
}

/* ---------- المتاجر ---------- */
function coverClass(s) { return 'c' + (Math.abs(hashStr(s.id)) % 3); }
function vcCard(s) {
    const open = isOpen(s), f = estFee(s), k = estKm(s), e = estEta(s), hasMenu = itemCount(s.id) > 0;
    return '<button type="button" class="vc" data-s="' + H(s.id) + '"><div class="vc-img ' + coverClass(s) + '">' + pattern(Math.abs(hashStr(s.id)) % 7, false) +
        '<span class="vc-ill">' + HWFood.forCat(s.cat) + '</span>' + logoImg(s.id, 'vc-logo') +
        '<span class="vc-time">' + e + '–' + (e + 8) + '<small>دقيقة</small></span>' +
        (open ? '' : '<span class="vc-closed">' + (hasMenu ? 'مغلق حاليًا' : 'قريبًا') + '</span>') + '</div>' +
        '<div class="vc-body"><div class="vc-name"><b>' + H(s.name) + '</b></div><span class="vc-cat">' + H(s.cat) + '</span>' +
        '<div class="vc-meta">' + IC.route + '<span class="hl">' + (f == null ? 'حدّد موقعك' : 'التوصيل ' + money(f) + ' د.أ') + '</span>' + (k == null ? '' : '<i class="dot"></i><span>' + k.toFixed(1) + ' كم</span>') + '<i class="dot"></i><span>كاش</span></div></div></button>';
}
function countAr(n, one, two, few, many) {          // صيغة العدد الصحيحة بالعربية
    if (n === 0) return 'لا يوجد ' + one; if (n === 1) return one + ' واحد'; if (n === 2) return two;
    return n + ' ' + (n % 100 >= 3 && n % 100 <= 10 ? few : many);
}
function storeMatches(s) { return (catFilter === 'الكل' || s.cat === catFilter) && (!openOnly || isOpen(s)); }
function sortStores(list, by) {
    const key = { near: s => estKm(s) == null ? 99 : estKm(s), eta: s => estEta(s), fee: s => estFee(s) == null ? 99 : estFee(s) }[by] || (s => 0);
    return list.slice().sort((a, b) => ((isOpen(b) ? 1 : 0) - (isOpen(a) ? 1 : 0)) || key(a) - key(b));
}
function renderStores() {
    const cats = ['الكل'].concat(STORES.map(s => s.cat).filter((c, i, a) => a.indexOf(c) === i));
    $('catChips').innerHTML = cats.map(c => '<button type="button" class="cat2' + (c === catFilter ? ' on' : '') + '" data-c="' + H(c) + '"><i>' + HWFood.forCat(c) + '</i><span>' + H(c) + '</span></button>').join('');
    $('banners').innerHTML =
        '<div class="bn t" data-bn="stores"><b>اطلب من متاجرك المفضلة</b><small>يوصلك كابتن HIGHWAY بسرعة</small><span class="bn-ill">' + HWFood.svg('cloche') + '</span></div>' +
        '<div class="bn y" data-bn="stores"><b>ادفع كاش عند الاستلام</b><small>قيمة الطلب وأجرة التوصيل للكابتن</small><span class="bn-ill">' + IC.cash + '</span></div>' +
        '<div class="bn d" data-bn="orders"><b>تابع طلبك لحظة بلحظة</b><small>شاهد الكابتن على الخريطة حتى باب بيتك</small><span class="bn-ill">' + IC.nav + '</span></div>';
    $('logoRow').innerHTML = sortStores(STORES, 'near').map(s => '<button type="button" class="lg-it' + (isOpen(s) ? '' : ' off') + '" data-s="' + H(s.id) + '">' + logoImg(s.id, '') + '<span>' + H(s.name) + '</span></button>').join('');
    const list = STORES.filter(storeMatches);
    $('fastRow').innerHTML = sortStores(list.filter(isOpen), 'eta').slice(0, 6).map(vcCard).join('') || '<div class="empty-orders" style="flex:1">لا توجد متاجر مفتوحة الآن</div>';
    $('sortChips').innerHTML = [['near', 'الأقرب'], ['eta', 'الأسرع'], ['fee', 'الأقل توصيلًا']].map(x => '<button type="button" class="srt' + (sortBy === x[0] ? ' on' : '') + '" data-sort="' + x[0] + '">' + x[1] + '</button>').join('') +
        '<button type="button" class="srt' + (openOnly ? ' on' : '') + '" data-open="1">مفتوح الآن</button>';
    $('storesTitle').textContent = catFilter === 'الكل' ? 'كل المتاجر' : catFilter;
    $('storesCount').textContent = countAr(list.length, 'متجر', 'متجران', 'متاجر', 'متجرًا');
    $('storeList').innerHTML = list.length ? sortStores(list, sortBy).map(vcCard).join('') : '<div class="empty-orders rich"><div class="em-art">' + IC.search + '</div>لا توجد متاجر مطابقة</div>';
}
function renderSearch() {
    const q = ($('storeSearch').value || '').trim(), box = $('searchBody');
    if (!q) {
        box.innerHTML = '<h3 class="sr-h">تصفح حسب القسم</h3><div class="cats2" style="flex-wrap:wrap">' + ['الكل'].concat(STORES.map(s => s.cat).filter((c, i, a) => a.indexOf(c) === i)).map(c => '<button type="button" class="cat2" data-c="' + H(c) + '" data-go="1"><i>' + HWFood.forCat(c) + '</i><span>' + H(c) + '</span></button>').join('') + '</div>';
        return;
    }
    const k = sortKey(q), st = STORES.filter(s => sortKey(s.name).includes(k) || sortKey(s.cat).includes(k));
    const its = []; STORES.forEach(s => menuOf(s.id).cats.forEach(c => c.items.forEach(it => { if (it.on !== false && (sortKey(it.name).includes(k) || sortKey(it.desc || '').includes(k))) its.push({ s, c, it }); })));
    box.innerHTML = (st.length ? '<h3 class="sr-h">المتاجر</h3>' + st.map(s => '<button type="button" class="sr" data-s="' + H(s.id) + '">' + logoImg(s.id, '') + '<div class="t"><b>' + H(s.name) + '</b><small>' + H(s.cat) + ' · ' + (isOpen(s) ? 'مفتوح' : 'مغلق') + '</small></div></button>').join('') : '') +
        (its.length ? '<h3 class="sr-h">الأصناف</h3>' + its.slice(0, 40).map(x => '<button type="button" class="sr" data-si="' + H(x.s.id) + '" data-c="' + H(x.c.id) + '" data-i="' + H(x.it.id) + '"><span class="ic">' + HWFood.forItem(x.it.name, x.it.desc, x.c.name, x.s.cat) + '</span><div class="t"><b>' + H(x.it.name) + '</b><small>' + H(x.s.name) + '</small></div><span class="p">' + money(x.it.price) + ' د.أ</span></button>').join('') : '') ||
        '<div class="empty-orders rich"><div class="em-art">' + IC.search + '</div>لا توجد نتائج لـ "' + H(q) + '"</div>';
}
function openStore(id) { curStore = id; renderStore(); goTo('screen-store'); }
function itemRow(s, c, it, open) {
    const inCart = cart.storeId === s.id ? cart.items.filter(x => x.id === it.id).reduce((n, x) => n + x.qty, 0) : 0;
    return '<div class="mi" data-c="' + H(c.id) + '" data-i="' + H(it.id) + '"><div class="mi-txt"><div><b>' + H(it.name) + '</b>' + (it.desc ? '<p>' + H(it.desc) + '</p>' : '') + '</div><span class="mi-price">' + money(it.price) + ' د.أ</span></div>' +
        '<div class="mi-art">' + HWFood.forItem(it.name, it.desc, c.name, s.cat) + (open ? '<button type="button" class="mi-add' + (inCart ? ' has' : '') + '" data-add="1" aria-label="إضافة">' + (inCart ? '×' + inCart : '+') + '</button>' : '') + '</div></div>';
}
function renderStore() {
    const s = storeInfo(curStore); if (!s) return;
    const open = isOpen(s), f = estFee(s), k = estKm(s), e = estEta(s), m = menuOf(s.id), n = cartCount();
    const cats = m.cats.filter(c => c.items.some(i => i.on !== false));
    const feat = []; cats.forEach(c => c.items.filter(i => i.on !== false).forEach(it => { if (feat.length < 6) feat.push({ c, it }); }));
    $('storeHero').innerHTML =
        '<div class="v-hero ' + coverClass(s) + '">' + pattern(Math.abs(hashStr(s.id)) % 7, false) + '<span class="vc-ill">' + HWFood.forCat(s.cat) + '</span>' +
        '<button type="button" class="v-btn back" onclick="goBack()" aria-label="رجوع"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>' +
        (n ? '<button type="button" class="v-btn cart" onclick="openCart()" aria-label="السلة">' + IC.cart + '<em>' + n + '</em></button>' : '') + '</div>' +
        '<div class="v-head">' + logoImg(s.id, 'v-logo') + '<h1>' + H(s.name) + '</h1><div class="v-sub">' + H(s.cat) + ' · الدفع كاش عند الاستلام</div>' +
        '<div class="v-info"><div><small>التوصيل</small><b>' + (f == null ? '—' : money(f) + ' د.أ') + '</b></div><div><small>الوقت</small><b>' + e + '–' + (e + 8) + ' د</b></div><div><small>المسافة</small><b>' + (k == null ? '—' : k.toFixed(1) + ' كم') + '</b></div></div>' +
        (f == null ? '<button type="button" class="v-note demo" style="width:100%;border:0;font:inherit;text-align:start;cursor:pointer" onclick="openLoc()">حدّد موقعك لمعرفة أجرة التوصيل ←</button>' : '') +
        (open ? '' : '<div class="v-note closed">المتجر مغلق حاليًا، يمكنك تصفح المنيو فقط</div>') + (m.demo ? '<div class="v-note demo">منيو تجريبي بأسعار وهمية</div>' : '') + '</div>';
    $('catTabs').innerHTML = (feat.length > 2 ? '<button type="button" class="ctab on" data-i="f">مختارات</button>' : '') + cats.map((c, i) => '<button type="button" class="ctab' + (feat.length <= 2 && i === 0 ? ' on' : '') + '" data-i="' + i + '">' + H(c.name) + '</button>').join('');
    $('menuList').innerHTML = (feat.length > 2 ? '<section class="mn-sec" id="sec-f"><h3 class="mn-h">مختارات من ' + H(s.name) + '</h3><div class="w-feat">' + feat.map(x => '<button type="button" class="fi mi-f" data-c="' + H(x.c.id) + '" data-i="' + H(x.it.id) + '"><div class="mi-art">' + HWFood.forItem(x.it.name, x.it.desc, x.c.name, s.cat) + '</div><b>' + H(x.it.name) + '</b><span>' + money(x.it.price) + ' د.أ</span></button>').join('') + '</div></section>' : '') +
        (cats.map((c, ci) => '<section class="mn-sec" id="sec-' + ci + '"><h3 class="mn-h">' + H(c.name) + '</h3>' + c.items.filter(i => i.on !== false).map(it => itemRow(s, c, it, open)).join('') + '</section>').join('') || '<div class="empty-orders rich"><div class="em-art">' + IC.orders + '</div>المنيو غير متاح بعد</div>');
}
function findItem(sid, cid, iid) { const c = menuOf(sid).cats.filter(x => x.id === cid)[0]; return c ? c.items.filter(i => i.id === iid)[0] : null; }

/* ---------- السلة ---------- */
function addToCart(sid, it, qty, notes) {
    if (cart.storeId && cart.storeId !== sid && cart.items.length && !confirm('سلتك فيها منتجات من متجر آخر. تفريغها والبدء بسلة جديدة؟')) return false;
    if (cart.storeId !== sid) cart = { storeId: sid, items: [], details: cart.details || '', notes: '' };
    const line = cart.items.filter(x => x.id === it.id && (x.notes || '') === (notes || ''))[0];
    if (line) line.qty += qty; else cart.items.push({ id: it.id, name: it.name, price: Number(it.price), qty, notes: notes || '' });
    saveCart(); updateCartUI(); buzz(10); return true;
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
    if (s && myLoc()) ensureRoute(s).then(() => { if (currentScreen === 'screen-cart') renderCart(); if (currentScreen === 'screen-search') renderSearch(); });
}
function ensureRoute(s) {
    const a = storeLoc(s), b = myLoc(), key = a.join(',') + '|' + b.join(',');
    if (cartRoute && cartRoute.key === key) return Promise.resolve(cartRoute);
    return HWMap.route(a, b).then(r => { cartRoute = Object.assign({ key }, r); return cartRoute; });
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
    const l = myLoc(), ready = cartRoute && l && cartRoute.key === storeLoc(s).join(',') + '|' + l.join(','), fee = ready ? HWMap.fee(cartRoute.km) : null, items = cartTotal();
    const eta = ready ? prepMin(s) + cartRoute.min : estEta(s);
    $('cartBody').innerHTML =
        '<div class="cart-card">' + cart.items.map((x, i) => '<div class="cl"><div class="cl-txt"><b>' + H(x.name) + '</b>' + (x.notes ? '<small>' + H(x.notes) + '</small>' : '') + '<span>' + money(x.price * x.qty) + ' د.أ</span></div>' +
            '<div class="qty sm"><button type="button" data-q="-1" data-i="' + i + '" aria-label="إنقاص">−</button><b>' + x.qty + '</b><button type="button" data-q="1" data-i="' + i + '" aria-label="زيادة">+</button></div></div>').join('') +
        '<button type="button" class="more-link" onclick="openStore(\'' + s.id + '\')">+ إضافة المزيد من ' + H(s.name) + '</button></div>' +
        '<h3 class="sec-t">التوصيل إلى</h3><div class="cart-card">' +
        (l ? '<div class="dl-map"><div class="lmap" id="miniMap"></div></div>' : '') +
        '<div class="dl-info"><span class="ap-ico lp-ico" style="width:40px;height:40px;border-radius:14px;background:var(--teal-800);color:var(--yellow);display:grid;place-items:center">' + IC.pin + '</span><div class="t"><small>' + (l ? 'موقعك على الخريطة' : 'لم تحدد موقعك بعد') + '</small><b>' + (l ? H(me.loc.label) : 'حدّد موقعك لحساب التوصيل') + '</b></div><button type="button" class="more-link inl" onclick="openLoc()">' + (l ? 'تغيير' : 'تحديد') + '</button></div>' +
        '<div class="field" id="addrField" style="margin:14px 0 0"><label for="cDetails">تفاصيل العنوان</label><textarea id="cDetails" rows="2" placeholder="رقم المبنى، الطابق، أقرب معلم..." oninput="cart.details=this.value;saveCart()">' + H(cart.details) + '</textarea><div class="err-msg">الرجاء كتابة تفاصيل العنوان</div></div></div>' +
        '<h3 class="sec-t">ملاحظات</h3><div class="cart-card"><textarea id="cNotes" rows="2" class="plain" placeholder="ملاحظات للكابتن أو المتجر (اختياري)" oninput="cart.notes=this.value;saveCart()">' + H(cart.notes) + '</textarea></div>' +
        '<h3 class="sec-t">الدفع</h3><div class="cart-card pay"><span class="pay-ico">' + IC.cash + '</span><div><b>كاش عند الاستلام</b><small>تدفع قيمة المنتجات وأجرة التوصيل للكابتن</small></div></div>' +
        '<div class="cart-card sum"><div><span>المنتجات</span><b>' + money(items) + ' د.أ</b></div><div><span>أجرة التوصيل' + (ready ? ' · ' + cartRoute.km.toFixed(1) + ' كم' : '') + '</span><b>' + (fee == null ? (l ? 'جاري الحساب…' : '—') : money(fee) + ' د.أ') + '</b></div><div><span>وقت الوصول المتوقع</span><b>' + eta + '–' + (eta + 8) + ' دقيقة</b></div><div class="tot"><span>الإجمالي</span><b>' + (fee == null ? '—' : money(items + fee) + ' د.أ') + '</b></div></div>' +
        (isOpen(s) ? '' : '<div class="st-closed">المتجر مغلق حاليًا</div>') +
        '<button type="button" class="submit-btn" id="placeBtn" onclick="placeOrder()"' + (isOpen(s) ? '' : ' disabled') + '><span class="spinner"><i></i><i></i></span><span class="btn-label">' + (l ? (fee == null ? 'جاري حساب الأجرة…' : 'تأكيد الطلب · ' + money(items + fee) + ' د.أ') : 'حدّد موقعك للمتابعة') + '</span></button>';
    if (l) {
        cartMini = HWMap.create($('miniMap'), { center: l, zoom: 15, interactive: false });
        L.marker(l, { icon: HWMap.ICON.home(), interactive: false }).addTo(cartMini);
        L.marker(storeLoc(s), { icon: HWMap.ICON.store(s.id), interactive: false }).addTo(cartMini);
        if (ready) { HWMap.line(cartMini, cartRoute.pts); HWMap.fit(cartMini, cartRoute.pts.concat([l, storeLoc(s)]), [30, 30]); } else HWMap.fit(cartMini, [l, storeLoc(s)], [30, 30]);
    }
}
async function placeOrder() {
    const s = storeInfo(cart.storeId); if (!s || !cart.items.length) return;
    if (!myLoc()) { openLoc(() => openCart()); return; }
    cart.details = ($('cDetails').value || '').trim();
    if (cart.details.length < 3) { $('addrField').classList.add('invalid'); $('cDetails').focus(); return; }
    const btn = $('placeBtn'); btn.classList.add('loading');
    const r = await ensureRoute(s); btn.classList.remove('loading');
    const fee = HWMap.fee(r.km), items = cartTotal(), sl = storeLoc(s), l = myLoc();
    const o = HWOrders.create({
        source: 'market', kind: 'market', storeId: s.id, storeName: s.name, storeStart: s.start,
        customer: { name: me.name, phone: me.phone },
        address: { lat: l[0], lng: l[1], label: me.loc.label, area: me.loc.label, details: cart.details },
        storeLoc: { lat: sl[0], lng: sl[1] }, route: r.pts, distKm: Math.round(r.km * 10) / 10, routeMin: r.min,
        items: cart.items.map(x => ({ id: x.id, name: x.name, price: x.price, qty: x.qty, notes: x.notes })),
        itemsTotal: Math.round(items * 100) / 100, fee: fee, total: Math.round((items + fee) * 100) / 100, payment: 'cash',
        notes: ($('cNotes').value || '').trim(), storeState: 'pending',
        from: s.name, to: me.loc.label, price: money(fee), orderValue: money(items)
    });
    cart = { storeId: '', items: [], details: cart.details, notes: '' }; saveCart(); updateCartUI();
    screenStack = ['screen-home', 'screen-orders']; openTrack(o.id);
    HWOrders.toast('تم إرسال طلبك للمتجر'); buzz(20);
}

/* ---------- حالة الطلب والتتبع ---------- */
function mine() { return me ? allOrders.filter(o => o.kind === 'market' && o.customer && o.customer.phone === me.phone) : []; }
function etaMinLeft(o) {
    const st = o.history.filter(x => x.s === 'store_accepted')[0], start = st ? st.t : o.createdAt;
    const total = (o.prepMin || 20) + (o.routeMin || CFG.travelMin || 15);
    return Math.max(3, Math.round(total - (Date.now() - start) / 60000));
}
function etaText(o) {
    if (o.status === 'cancelled') return 'تم إلغاء الطلب';
    if (o.status === 'delivered') { const e = o.history.filter(x => x.s === 'delivered')[0]; return 'تم التسليم' + (e ? ' ' + HWOrders.fmtTime(e.t) : ''); }
    if (o.storeState === 'pending') return 'بانتظار تأكيد المتجر';
    const left = etaMinLeft(o); return 'الوصول خلال ' + left + '–' + (left + 8) + ' دقيقة';
}
function bigStatus(o) {
    if (o.status === 'cancelled') return o.cancelReason || 'تم إلغاء الطلب';
    if (o.status === 'delivered') return 'وصل طلبك، بالهناء والشفاء';
    if (o.status === 'picked') return 'الكابتن في الطريق إليك';
    if (o.status === 'accepted') return 'الكابتن في الطريق للمتجر';
    if (o.storeState === 'pending') return 'بانتظار قبول المتجر';
    return 'المتجر يحضّر طلبك' + (o.status === 'new' ? '، ونبحث لك عن كابتن' : '');
}
function stIcon(o) {
    if (o.status === 'cancelled') return ['bad', IC.x]; if (o.status === 'delivered') return ['done', IC.check];
    if (o.status === 'picked') return ['', IC.nav]; if (o.status === 'accepted') return ['', IC.bag];
    return ['', o.storeState === 'pending' ? IC.wait : IC.cook];
}
function destOf(o) { return [o.address.lat, o.address.lng]; }
function srcOf(o) { return o.storeLoc ? [o.storeLoc.lat, o.storeLoc.lng] : (CFG.center || [32.0392, 35.7272]); }
function capPos(o) {
    if (o.status === 'delivered' || o.status === 'cancelled' || !o.captain) return null;
    if (o.captain.lat) return [o.captain.lat, o.captain.lng];
    if (o.status === 'accepted') return srcOf(o);
    const pk = o.history.filter(x => x.s === 'picked')[0], t0 = pk ? pk.t : Date.now(), dur = Math.max(60000, (o.routeMin || 10) * 60000);
    return HWMap.along(o.route || [srcOf(o), destOf(o)], Math.min(.94, Math.max(.05, (Date.now() - t0) / dur)));
}
function openTrack(id) {
    trackId = id; goTo('screen-track'); buildTrack(); renderTrack();
    setTimeout(() => { if (trk) { trk.map.invalidateSize(); fitTrack(); } }, 80);
}
function buildTrack() {
    const o = HWOrders.get(trackId); if (!o) { $('trackBody').innerHTML = '<div class="empty-orders">الطلب غير موجود</div>'; trk = null; return; }
    if (trk && trk.id === o.id && document.getElementById('tkMap')) return;
    if (trk) { try { trk.map.remove(); } catch (e) {} trk = null; }
    $('trackBody').innerHTML = '<div class="tk"><div class="tk-map"><div class="lmap" id="tkMap"></div></div><div class="tk-sheet" id="tkSheet"></div></div>';
    const map = HWMap.create($('tkMap'), { center: srcOf(o), zoom: 14 }), a = srcOf(o), b = destOf(o);
    HWMap.line(map, o.route || [a, b]);
    L.marker(a, { icon: HWMap.ICON.store(o.storeId), interactive: false }).addTo(map);
    L.marker(b, { icon: HWMap.ICON.home(), interactive: false }).addTo(map);
    trk = { id: o.id, map, cap: null, pts: (o.route || [a, b]).concat([a, b]) };
    fitTrack();
}
function fitTrack() { if (trk) HWMap.fit(trk.map, trk.pts, [50, 50]); }
function renderTrack() {
    const o = HWOrders.get(trackId); if (!o || !trk || trk.id !== o.id) { buildTrack(); if (!trk) return; }
    const s = storeInfo(o.storeId), ic = stIcon(o), n = HWOrders.stage(o), active = HWOrders.isActive(o);
    const p = capPos(o);
    if (p) { if (!trk.cap) trk.cap = L.marker(p, { icon: HWMap.ICON.cap(), interactive: false, zIndexOffset: 500 }).addTo(trk.map); else trk.cap.setLatLng(p); }
    else if (trk.cap) { trk.map.removeLayer(trk.cap); trk.cap = null; }
    const labels = ['تأكيد', 'تحضير', 'كابتن', 'توصيل', 'تسليم'], canCancel = o.status === 'new' && o.storeState === 'pending';
    const cap = o.captain ? '<div class="cart-card"><div class="cap-row"><span class="av">' + H(o.captain.name.trim().charAt(0)) + '</span><div class="t"><b>' + H(o.captain.name) + '</b><small>' + (o.status === 'picked' ? 'استلم طلبك وفي الطريق إليك' : 'في الطريق للمتجر') + '</small></div>' + (o.captain.phone ? '<a href="tel:' + H(o.captain.phone) + '" aria-label="اتصال بالكابتن">' + IC.phone + '</a>' : '') + '</div></div>' : '';
    $('tkSheet').innerHTML =
        '<div class="tk-grab"></div><div class="tk-head"><span class="tk-ic ' + ic[0] + '">' + ic[1] + '</span><div class="tk-ht"><small>' + codeH(o) + ' · ' + H(o.storeName) + '</small>' + (HWOrders.isActive(o) && o.storeState !== 'pending' ? '<div class="tk-eta"><b>' + etaMinLeft(o) + '–' + (etaMinLeft(o) + 8) + '</b><span>دقيقة</span></div>' : '') + '<h1>' + bigStatus(o) + '</h1>' + (HWOrders.isActive(o) && o.storeState !== 'pending' ? '' : '<p>' + etaText(o) + '</p>') + '</div></div>' +
        (o.status === 'cancelled' ? '' : '<div class="tk-steps">' + labels.map((l, i) => '<i class="' + (i < n ? 'done' : i === n ? 'act' : '') + '"></i>').join('') + '</div><div class="tk-lbls">' + labels.map(l => '<span>' + l + '</span>').join('') + '</div>') +
        cap +
        '<h3 class="sec-t">طلبك</h3><div class="cart-card">' + o.items.map(l => '<div class="cl ro"><div class="cl-txt"><b>' + l.qty + '× ' + H(l.name) + '</b>' + (l.notes ? '<small>' + H(l.notes) + '</small>' : '') + '</div><span>' + money(l.price * l.qty) + '</span></div>').join('') + '</div>' +
        '<div class="cart-card sum"><div><span>المنتجات</span><b>' + money(o.itemsTotal) + ' د.أ</b></div><div><span>أجرة التوصيل' + (o.distKm ? ' · ' + o.distKm + ' كم' : '') + '</span><b>' + money(o.fee) + ' د.أ</b></div><div class="tot"><span>الإجمالي كاش عند الاستلام</span><b>' + money(o.total) + ' د.أ</b></div></div>' +
        '<h3 class="sec-t">التوصيل إلى</h3><div class="cart-card"><b>' + H(o.address.label || o.address.area) + '</b><p class="mut">' + H(o.address.details) + '</p></div>' +
        '<h3 class="sec-t">سجل الطلب</h3><div class="cart-card">' + HWOrders.timeline(o) + '</div>' +
        (canCancel ? '<button type="button" class="ghost-btn dng wide" onclick="cancelMine(\'' + o.id + '\')">إلغاء الطلب</button>' : '') +
        (s ? '<button type="button" class="ghost-btn wide" style="margin-top:10px" onclick="openStore(\'' + s.id + '\')">اطلب مرة أخرى من ' + H(o.storeName) + '</button>' : '');
}
function reorder(id) {
    const o = HWOrders.get(id); if (!o) return;
    const items = []; o.items.forEach(l => { const it = findAny(o.storeId, l.id); if (it && it.on !== false) items.push({ id: it.id, name: it.name, price: Number(it.price), qty: l.qty, notes: l.notes || '' }); });
    if (!items.length) { HWOrders.toast('أصناف هذا الطلب غير متوفرة حاليًا'); return; }
    if (cart.items.length && cart.storeId !== o.storeId && !confirm('سلتك فيها منتجات من متجر آخر. استبدالها؟')) return;
    cart = { storeId: o.storeId, items, details: cart.details || o.address.details || '', notes: '' }; saveCart(); buzz(15);
    if (items.length < o.items.length) HWOrders.toast('بعض الأصناف لم تعد متوفرة');
    openCart();
}
function findAny(sid, iid) { let r = null; menuOf(sid).cats.forEach(c => c.items.forEach(i => { if (i.id === iid) r = i; })); return r; }
function cancelMine(id) {
    const o = HWOrders.get(id);
    if (o && o.status === 'new' && o.storeState === 'pending' && confirm('إلغاء هذا الطلب؟')) { HWOrders.update(id, { status: 'cancelled', cancelReason: 'ألغيتَ الطلب' }); buzz(15); }
}

function renderOrders() {
    const l = mine(), act = l.filter(HWOrders.isActive), past = l.filter(o => !HWOrders.isActive(o));
    const row = (o) => '<div role="button" tabindex="0" class="co s-' + o.status + '" data-id="' + H(o.id) + '">' + logoImg(o.storeId, 'co-logo') + '<div class="co-m"><b>' + H(o.storeName) + '</b><small>' + codeH(o) + ' · ' + o.items.reduce((n, i) => n + i.qty, 0) + ' منتجات · ' + money(o.total) + ' د.أ</small>' +
        '<span class="oc-chip">' + HWOrders.label(o) + '</span></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px"><span class="co-time">' + HWOrders.ago(o.createdAt) + '</span>' + (HWOrders.isActive(o) ? '' : '<button type="button" class="co-re" data-re="' + H(o.id) + '">إعادة الطلب</button>') + '</div>' + (HWOrders.isActive(o) ? HWOrders.progress_(o) : '') + '</div>';
    $('myOrders').innerHTML = (act.length ? '<h3 class="sec-t">الحالية</h3>' + act.map(row).join('') : '') + (past.length ? '<h3 class="sec-t">السابقة</h3>' + past.map(row).join('') : '') ||
        '<div class="empty-orders rich"><div class="em-art">' + IC.orders + '</div>لم تطلب شيئًا بعد<br><button type="button" class="more-link" onclick="tabGo(\'screen-home\')">ابدأ بتصفح المتاجر</button></div>';
    const badge = $('tabBadge'); badge.textContent = act.length; badge.classList.toggle('on', act.length > 0);
}
const NOTE = {
    store_accepted: (o) => 'المتجر بدأ بتحضير طلبك ' + o.code,
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
        if (NOTE[key]) { HWOrders.toast(NOTE[key](o)); buzz(24); delete dismissed[o.id]; }
    });
    prevSig = {}; m.forEach(o => { prevSig[o.id] = sigOf(o); });
    renderOrders(); renderLive(); if (currentScreen === 'screen-track') renderTrack();
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

function fillProfile() {
    $('pfName').textContent = me.name; $('pfPhone').textContent = me.phone; $('pfInitial').textContent = me.name.trim().charAt(0) || '؟';
    $('pfArea').textContent = me.loc ? me.loc.label : 'غير محدد';
    $('homeHello').textContent = 'أهلًا ' + me.name.split(' ')[0];
    $('homeTitle').textContent = 'ماذا تشتهي اليوم؟';
    $('locLabel').textContent = me.loc ? 'التوصيل إلى ' + me.loc.label : 'حدّد موقع التوصيل';
    $('locPill').classList.toggle('need', !me.loc);
}
function renderAll() { if (!me) return; fillProfile(); renderStores(); renderOrders(); updateCartUI(); if (curStore && currentScreen === 'screen-store') renderStore(); if (currentScreen === 'screen-cart') renderCart(); }

/* ---------- الأحداث ---------- */
document.addEventListener('click', (e) => {
    const t = e.target;
    let el;
    if ((el = t.closest('.cat2'))) { catFilter = el.dataset.c; buzz(); if (el.dataset.go) { tabGo('screen-home'); } renderStores(); return; }
    if ((el = t.closest('.vc, .lg-it, .sr[data-s]'))) { buzz(); openStore(el.dataset.s); return; }
    if ((el = t.closest('.sr[data-si]'))) { buzz(); openStore(el.dataset.si); setTimeout(() => openItem(el.dataset.c, el.dataset.i), 200); return; }
    if ((el = t.closest('.srt'))) { if (el.dataset.open) openOnly = !openOnly; else sortBy = el.dataset.sort; buzz(); renderStores(); return; }
    if ((el = t.closest('.bn'))) { buzz(); if (el.dataset.bn === 'orders') tabGo('screen-orders'); else $('allStores').scrollIntoView({ behavior: 'smooth' }); return; }
    if ((el = t.closest('.co-re'))) { e.stopPropagation(); reorder(el.dataset.re); return; }
    if ((el = t.closest('.mi-f'))) { openItem(el.dataset.c, el.dataset.i); return; }
    if ((el = t.closest('#catTabs .ctab'))) { document.querySelectorAll('#catTabs .ctab').forEach(c => c.classList.toggle('on', c === el)); const sec = $('sec-' + el.dataset.i); if (sec) window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - 56, behavior: 'smooth' }); return; }
    if ((el = t.closest('.mi-add'))) { e.stopPropagation(); const mi = el.closest('.mi'), it = findItem(curStore, mi.dataset.c, mi.dataset.i); if (it && addToCart(curStore, it, 1, '')) renderStore(); return; }
    if ((el = t.closest('.mi'))) { openItem(el.dataset.c, el.dataset.i); return; }
    if ((el = t.closest('#cartBody .qty button'))) { const l = cart.items[+el.dataset.i]; if (l) { l.qty += +el.dataset.q; if (l.qty <= 0) cart.items.splice(+el.dataset.i, 1); saveCart(); updateCartUI(); renderCart(); buzz(); } return; }
    if ((el = t.closest('.co'))) { buzz(); openTrack(el.dataset.id); return; }
    if ((el = t.closest('#itemSheetBody .qty button'))) { itemCtx.qty = Math.max(1, itemCtx.qty + +el.dataset.q); $('isQty').textContent = itemCtx.qty; $('isAdd').querySelector('.btn-label').textContent = 'أضف للطلب · ' + money(itemCtx.qty * itemCtx.it.price) + ' د.أ'; buzz(); return; }
});
function openItem(cid, iid) {
    const it = findItem(curStore, cid, iid); if (!it) return;
    const s = storeInfo(curStore); itemCtx = { it, qty: 1, cid };
    $('itemSheetBody').innerHTML = '<button type="button" class="is-x" onclick="closeItemSheet()" aria-label="إغلاق">' + IC.x + '</button><div class="is-art">' + pattern(Math.abs(hashStr(it.id)) % 7, false) + HWFood.forItem(it.name, it.desc, (menuOf(curStore).cats.filter(x => x.id === cid)[0] || {}).name, s.cat) + '</div>' +
        '<div class="is-pad"><h3 class="is-name">' + H(it.name) + '</h3>' + (it.desc ? '<p class="mut">' + H(it.desc) + '</p>' : '') + '<div class="is-price">' + money(it.price) + ' د.أ</div>' +
        (isOpen(s) ? '<div class="field"><label for="isNotes">ملاحظات للمتجر <span class="opt">(اختياري)</span></label><textarea id="isNotes" rows="2" placeholder="مثال: بدون بصل"></textarea></div></div>' +
            '<div class="is-bar"><div class="qty"><button type="button" data-q="-1" aria-label="إنقاص">−</button><b id="isQty">1</b><button type="button" data-q="1" aria-label="زيادة">+</button></div>' +
            '<button type="button" class="submit-btn" id="isAdd" onclick="confirmItem()"><span class="btn-label">أضف للطلب · ' + money(it.price) + ' د.أ</span></button></div>'
            : '<div class="st-closed">المتجر مغلق حاليًا</div></div>');
    $('itemSheet').classList.add('show');
}
function closeItemSheet() { $('itemSheet').classList.remove('show'); }
function confirmItem() {
    if (addToCart(curStore, itemCtx.it, itemCtx.qty, ($('isNotes').value || '').trim())) { closeItemSheet(); renderStore(); }
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeItemSheet(); closeLoc(); } });
try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
window.addEventListener('pageshow', (e) => { window.scrollTo(0, 0); if (e.persisted) location.reload(); });

/* ---------- تشغيل ---------- */
document.addEventListener('DOMContentLoaded', () => {
    buildSplashIcons();
    $('demoBanner').style.display = HWDB.mode === 'local' ? '' : 'none';
    HWDemo.seed();
    cart = Object.assign(cart, readJSON(CART_KEY, {}));
    const saved = readJSON(PROFILE_KEY, null);
    applyUser(saved && saved.phone ? saved : null);
    const splash = $('splash');
    let skip = false; try { skip = sessionStorage.getItem('hw-skip-splash') === '1'; sessionStorage.removeItem('hw-skip-splash'); } catch (e) {}
    if (!saved) skip = false;
    if (skip) { splash.style.transition = 'none'; splash.classList.add('hide'); }
    introCtl = skip ? null : initIntroVideo();
    $('loginForm').addEventListener('submit', submitLogin);
    $('enterBtn').addEventListener('click', () => { if (me) finishLogin(); else openLogin(); });
    HWDB.col('menus').subscribe(l => { menus = {}; l.forEach(m => { menus[m.id] = m; }); if (me) renderAll(); });
    HWDB.col('storestate').subscribe(l => { storeState = {}; l.forEach(m => { storeState[m.id] = m; }); if (me) renderAll(); });
    HWOrders.subscribe(onOrders);
    renderAll(); showScreen('screen-home');
    setInterval(() => { if (!document.hidden && me) { renderOrders(); renderLive(); if (currentScreen === 'screen-track') renderTrack(); } }, 15000);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && splash.classList.contains('login-mode') && !splash.classList.contains('hide')) closeLogin(); });
});
