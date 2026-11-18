// Мини-приложение Smile Sales: хаб продаж для стоматологии и косметологии.
// Экраны: #/ (главная), #/n/stom|cosm (ниша), #/lessons, #/calc, #/quiz, #/audit.
// В Telegram: BackButton, MainButton «Купить», haptic, цвет шапки; вне Telegram работает как обычная страница.
(function () {
  const H = window.HUB;
  const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined ? window.Telegram.WebApp : null;
  const inTg = !!(tg && tg.platform && tg.platform !== "unknown");
  const app = document.getElementById("app");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rub = (n) => n.toLocaleString("ru-RU").replace(/ /g, " ") + " ₽";
  const haptic = (t = "light") => { try { tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred(t); } catch (e) {} };
  const store = { get: (k) => { try { return localStorage.getItem("ssh-" + k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem("ssh-" + k, v); } catch (e) {} } };

  if (tg) { try { tg.ready(); tg.expand(); tg.setBackgroundColor && tg.setBackgroundColor("#F6F4F5"); } catch (e) {} }

  // ссылки: внутри Telegram открываем через API, чтобы не выходить из приложения
  function openLink(url) {
    haptic("medium");
    if (tg && inTg) {
      if (/^https:\/\/t\.me\//.test(url)) return tg.openTelegramLink(url);
      return tg.openLink(url, { try_instant_view: false });
    }
    window.open(url, "_blank", "noopener");
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-go],[data-link]");
    if (!a) return;
    e.preventDefault();
    if (a.dataset.go) { haptic(); location.hash = a.dataset.go; }
    else openLink(a.dataset.link);
  });

  function setAccent(n) {
    const acc = n ? n.accent : "#141116", soft = n ? n.soft : "#F1EEF0";
    document.documentElement.style.setProperty("--acc", acc);
    document.documentElement.style.setProperty("--accSoft", soft);
    if (tg) { try { tg.setHeaderColor && tg.setHeaderColor(n ? n.soft : "#F6F4F5"); } catch (e) {} }
  }

  // главная кнопка Telegram или своя нижняя панель
  let mainHandler = null;
  function setCTA(cfg) {
    const old = document.querySelector(".cta"); if (old) old.remove();
    if (tg && inTg && tg.MainButton) {
      if (mainHandler) tg.MainButton.offClick(mainHandler);
      if (!cfg) { tg.MainButton.hide(); return; }
      mainHandler = () => cfg.go ? (location.hash = cfg.go) : openLink(cfg.url);
      tg.MainButton.setParams({ text: cfg.text, color: cfg.color || "#141116", text_color: "#ffffff", is_visible: true });
      tg.MainButton.onClick(mainHandler);
      return;
    }
    if (!cfg) return;
    const d = document.createElement("div");
    d.className = "cta";
    d.innerHTML = `<div class="in"><a class="btn" ${cfg.go ? `data-go="${cfg.go}"` : `data-link="${esc(cfg.url)}"`} href="#">${esc(cfg.text)}${cfg.old ? ` <s>${esc(cfg.old)}</s>` : ""}</a>${cfg.ask ? `<a class="btn ghost" data-link="https://t.me/${H.contact}" href="#" aria-label="Задать вопрос">💬</a>` : ""}</div>`;
    document.body.appendChild(d);
  }
  function setBack(on) {
    if (!tg || !inTg || !tg.BackButton) return;
    if (on) tg.BackButton.show(); else tg.BackButton.hide();
  }

  // ───────── просмотр страниц документа ─────────
  const viewer = document.getElementById("viewer"), vstrip = document.getElementById("vstrip"), vcount = document.getElementById("vcount");
  let galleries = [];
  function openGallery(list) {
    haptic();
    vstrip.innerHTML = list.map((src) => `<div><img loading="lazy" src="${esc(src)}" alt=""></div>`).join("");
    vcount.textContent = `1 / ${list.length}`;
    viewer.hidden = false; vstrip.scrollLeft = 0;
    if (tg && inTg && tg.BackButton) tg.BackButton.show();
  }
  vstrip.addEventListener("scroll", () => { const i = Math.round(vstrip.scrollLeft / vstrip.clientWidth); vcount.textContent = `${i + 1} / ${vstrip.children.length}`; });
  const closeViewer = () => { viewer.hidden = true; vstrip.innerHTML = ""; route(); };
  document.getElementById("vclose").onclick = closeViewer;
  document.addEventListener("click", (e) => { const g = e.target.closest("[data-gal]"); if (g) { e.preventDefault(); openGallery(galleries[+g.dataset.gal]); } });
  const gal = (list) => { if (!list || !list.length) return ""; galleries.push(list); return ` data-gal="${galleries.length - 1}"`; };

  // ───────── части экранов ─────────
  const top = (back) => `<div class="topbar">${back ? `<a class="back" data-go="${back}" href="#">‹ Назад</a>` : `<div class="logo"><b></b>SMILE SALES <span>HUB</span></div>`}<div class="hello">${esc(helloName())}</div></div>`;
  function helloName() { const u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user; return u && u.first_name ? `Привет, ${u.first_name} 👋` : ""; }
  const sec = (t, sub, link) => `<div class="sec"><div><h2>${t}</h2>${sub ? `<small>${sub}</small>` : ""}</div>${link ? `<a data-go="${link[1]}" href="#">${link[0]} ›</a>` : ""}</div>`;
  function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }

  // скачивание таблиц: в Telegram через downloadFile (Bot API 8.0+), иначе обычная ссылка
  function download(rel, name) {
    haptic("medium");
    const url = new URL(rel, location.href).href;
    if (tg && inTg && tg.downloadFile && tg.isVersionAtLeast && tg.isVersionAtLeast("8.0")) {
      try { tg.downloadFile({ url, file_name: name }, (ok) => { if (ok) toast("Файл сохраняется в загрузки"); }); return; } catch (e) {}
    }
    if (tg && inTg) return tg.openLink(url);
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    toast("Скачивание началось");
  }
  document.addEventListener("click", (e) => { const d = e.target.closest("[data-dl]"); if (d) { e.preventDefault(); download(d.dataset.dl, d.dataset.name); } });

  const docCard = (d, small) => {
    const g = gal(d.gallery);
    const media = d.cover ? `<img class="cv" loading="lazy" src="${esc(d.cover)}" alt="">` : `<div class="ph">${esc(d.ph || "")}</div>`;
    const meta = d.pages ? `${d.pages} стр.` : d.meta || "";
    return `<button class="doc"${g}>${media}<div>${d.n ? `<div class="n">${esc(d.n)}</div>` : ""}<b>${esc(d.t)}</b><p>${esc(d.d)}</p>${!small && d.li ? `<ul>${d.li.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}<span class="more">${esc(meta)}${g ? " · полистать ›" : ""}</span></div></button>`;
  };
  const fileCard = (f, n) => `<button class="file" data-dl="${esc(f.f)}" data-name="${esc(f.name)}"><div class="x"><i>⊞</i>XLSX</div><div class="tx"><div class="nm">${esc(n.title)} · бесплатно</div><b>${esc(f.t)}</b><p>${esc(f.d)}</p><span class="tg">${esc(f.tag)}</span></div><span class="dl">↓</span></button>`;
  const lessonCard = (l, nicheTitle) => {
    const nt = nicheTitle ? `<div class="nt">${esc(nicheTitle)}</div>` : "";
    if (l.soon) return `<div class="lesson soon"><div class="media"><span>скоро</span></div><div class="tx"><b>${esc(l.t)}</b><p>${esc(l.d)}</p></div></div>`;
    if (l.yt) return `<button class="lesson" data-yt="${esc(l.yt)}"><div class="media"><img loading="lazy" src="https://i.ytimg.com/vi/${esc(l.yt)}/hqdefault.jpg" alt="">${nt}<div class="play">▶</div><div class="dur">${esc(l.dur || "")}</div></div><div class="tx"><b>${esc(l.t)}</b><p>${esc(l.d)}</p></div></button>`;
    return `<button class="lesson" data-video="${esc(l.video)}"><div class="media v"><img loading="lazy" src="${esc(l.poster)}" alt="">${nt}<div class="play">▶</div><div class="dur">${esc(l.dur || "")}</div></div><div class="tx"><b>${esc(l.t)}</b><p>${esc(l.d)}</p></div></button>`;
  };
  document.addEventListener("click", (e) => {
    const v = e.target.closest("[data-video],[data-yt]");
    if (!v) return;
    const m = v.querySelector(".media");
    if (m.querySelector("video,iframe")) return;
    haptic();
    if (v.dataset.video) m.innerHTML = `<video src="${esc(v.dataset.video)}" controls autoplay playsinline></video>`;
    else m.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${esc(v.dataset.yt)}?autoplay=1&rel=0&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  });
  const allLessons = () => Object.values(H.niches).flatMap((n) => n.lessons.filter((l) => !l.soon).map((l) => [l, n]));
  const pct = (n) => Math.round((1 - n.price / n.old) * 100);

  // ───────── экраны ─────────
  function Home() {
    setAccent(null); setBack(false);
    const last = store.get("niche");
    const ls = allLessons();
    app.innerHTML = `<div class="screen">${top()}
      <div class="hhero"><span class="chip">✦ Хаб продаж для клиник</span><h1>Продажи в <em>стоматологии</em> и <em>косметологии</em></h1><p>Схемы, бесплатные уроки, таблицы и инструменты от Smile Sales</p>
        <div class="hstats"><div><b>9+</b><span>лет в продажах клиник</span></div><div><b>70+</b><span>КЦ и комм. блоков</span></div></div>
        <img src="${esc(H.author.hero)}" alt=""></div>
      ${sec("Выберите нишу", "Материалы, уроки и папка под вашу клинику")}
      <div class="covers">${["stom", "cosm"].map((k) => { const n = H.niches[k]; return `<a class="ncover ${k}" data-go="#/n/${k}" href="#"><img src="${esc(n.cover)}" alt="">${last === k ? `<span class="last">вы смотрели</span>` : ""}<div class="t"><b>${n.title}</b><span>${esc(n.pack)}</span></div><div class="go">${rub(n.price)}<em>›</em></div></a>`; }).join("")}</div>
      ${sec("Бесплатно", "Таблицы, которые можно забрать прямо сейчас", ["все", "#/free"])}
      <div class="free-banner"><b>🎁</b><span>Аудит отдела продаж и РНП для стоматологии и косметологии. Excel, всё считается само</span></div>
      <div class="files">${["stom", "cosm"].map((k) => fileCard(H.niches[k].files[0], H.niches[k])).join("")}</div>
      ${sec("10 правил продаж в клинике", "листайте вбок")}
      <div class="rules">${H.rules.map(([t, p], i) => `<div class="rule"><span class="no">${String(i + 1).padStart(2, "0")}</span><b>${esc(t)}</b><p>${esc(p)}</p></div>`).join("")}</div>
      ${sec("Бесплатные уроки", `${ls.length} видео`, ["все", "#/lessons"])}
      <div class="lrow">${ls.map(([l, n]) => lessonCard(l, n.title)).join("")}</div>
      ${sec("Инструменты")}
      <div class="tiles">
        <a class="tile" data-go="#/calc" href="#"><div class="ic">🧮</div><b>Калькулятор потерь</b><span>сколько пациентов уходит без записи</span></a>
        <a class="tile" data-go="#/quiz" href="#"><div class="ic">✅</div><b>Самопроверка отдела</b><span>10 пунктов, 2 минуты</span></a>
        <a class="tile wide dark" data-go="#/audit" href="#"><div class="ic">🔍</div><div class="tx"><b>${esc(H.audit.title)}</b><span>звонки, CRM, команда, план на неделю</span></div><span class="arr">›</span></a>
        <a class="tile wide" data-link="https://t.me/${H.contact}" href="#"><div class="ic">💬</div><div class="tx"><b>Задать вопрос Дмитрию</b><span>Telegram @${H.contact}</span></div><span class="arr">›</span></a>
      </div>
      ${authorBlock()}
      ${sec("Отзывы клиник")}
      ${reviews()}
    </div>`;
    setCTA(null);
  }

  const reviews = () => `<div class="revs">${H.reviews.map((r) => `<div class="rev"><div class="st">★★★★★</div><p>${esc(r.t)}</p><b>${esc(r.w)}</b><small>${esc(r.s)}</small></div>`).join("")}</div>`;
  function authorBlock() {
    const a = H.author;
    return `${sec("Кто автор")}<div class="author"><div class="ph"><img loading="lazy" src="${esc(a.photo)}" alt=""></div><div class="tx"><b>${esc(a.name)}</b><p>${esc(a.role)}. ${esc(a.bio)}</p></div></div>
      <div class="astats">${a.stats.map(([v, t]) => `<div><b>${esc(v)}</b><span>${esc(t)}</span></div>`).join("")}</div>`;
  }

  function Niche(k, tab) {
    const n = H.niches[k]; if (!n) return Home();
    store.set("niche", k); setAccent(n); setBack(true);
    tab = tab || "pack";
    const tabs = [["pack", "Папка"], ["free", "🎁 Бесплатно"], ["lessons", "Уроки"], ["how", "Как работает"], ["reviews", "Отзывы"], ["buy", "Купить"]];
    let body = "";
    if (tab === "pack") body = `${sec("Главное", "нажмите на документ, чтобы полистать")}${n.main.map((d) => docCard(d)).join("")}
      ${sec(`+ ${n.bonus.length} бонусов`, "входят в папку")}<div class="bon">${n.bonus.map((d) => docCard(d, true)).join("")}</div>`;
    if (tab === "free") body = `${sec("Забрать бесплатно", "таблицы Excel, формулы считают сами")}<div class="files">${n.files.map((f) => fileCard(f, n)).join("")}</div>
      ${sec("Уроки")}<div class="lessons">${n.lessons.filter((l) => !l.soon).map((l) => lessonCard(l)).join("")}</div>`;
    if (tab === "lessons") body = `${sec("Бесплатные уроки", n.title)}<div class="lessons">${n.lessons.map((l) => lessonCard(l)).join("")}</div>`;
    if (tab === "how") body = `${sec("Путь пациента по шагам")}<div class="block"><ol class="steps"><li>Заявка → консультация: ответ, квалификация, цена, запись</li><li>Консультация → «да»: план, деньги, возражения, «подумаю» с датой</li><li>«Да» → оплата и сопровождение до конца лечения</li></ol></div>
      ${sec("Нормы из папки")}<div class="norms">${n.norms.map(([v, t, s]) => `<div class="norm"><b>${esc(v)}</b><span>${esc(t)}</span>${s ? `<small>${esc(s)}</small>` : ""}</div>`).join("")}</div>
      <p class="disc">Ориентиры для клиник, где схема внедрена вместе с перестройкой процесса. Не гарантия.</p>
      <div style="margin:16px"><a class="btn light" data-link="${esc(n.landing)}" href="#">Полное описание на сайте ›</a></div>`;
    if (tab === "reviews") body = `${sec("Клиники о работе с Дмитрием")}${reviews()}${authorBlock()}`;
    if (tab === "buy") body = `${sec("Как купить")}<div class="block"><ol class="steps"><li>Нажимаете «Купить», открывается бот @${H.bot}</li><li>В боте «Оплатить», оплата картой через Tribute</li><li>Доступ к папке приходит сразу в Telegram</li></ol></div>`;
    app.innerHTML = `<div class="screen">${top("#/")}
      <div class="nhero"><div class="img"><img src="${esc(n.cover)}" alt=""><span class="kk">${esc(n.title.toUpperCase())}</span></div>
        <div class="body"><h1>${esc(n.tagline)}</h1><p>${esc(n.pack)} + бонусы. Команда ведёт ${k === "cosm" ? "пациентку" : "пациента"} от заявки до оплаты по понятным шагам.</p>
        <div class="nstats">${n.stats.map(([v, t]) => `<span><b>${esc(v)}</b> ${esc(t)}</span>`).join("")}</div>
        <div class="pricebox"><span class="now">${rub(n.price)}</span><s>${rub(n.old)}</s><span class="off">−${pct(n)}%</span><span class="kzt">${esc(n.kzt)} · доступ сразу после оплаты</span></div></div></div>
      <div class="tabs">${tabs.map(([id, t]) => `<button class="${id === tab ? "on" : ""}" data-go="#/n/${k}/${id}">${t}</button>`).join("")}</div>
      ${body}
    </div>`;
    setCTA({ text: `Купить папку · ${rub(n.price)}`, url: n.buy, color: n.accent, ask: true });
  }

  function Free() {
    setAccent(null); setBack(true);
    app.innerHTML = `<div class="screen">${top("#/")}<div class="pad"><span class="kick">🎁 Бесплатно</span><h1 style="margin-top:8px">Таблицы для отдела продаж</h1><p class="muted" style="margin-top:8px;font-size:14px">Скачайте, откройте в Excel или Google Таблицах и заполняйте. Итоги и проценты считаются сами.</p></div>
      ${Object.values(H.niches).map((n) => `${sec(n.title)}<div class="files">${n.files.map((f) => fileCard(f, n)).join("")}</div>`).join("")}
      ${sec("Что делать дальше")}<div class="block"><ol class="steps"><li>Пройдите аудит и запишите исходные цифры</li><li>Ведите РНП каждый день, смотрите отклонения от нормы</li><li>Через месяц повторите аудит и сравните</li></ol></div>
    </div>`;
    setCTA({ text: "Пройти самопроверку", go: "#/quiz" });
  }

  function Lessons() {
    setAccent(null); setBack(true);
    app.innerHTML = `<div class="screen">${top("#/")}<div class="pad"><span class="kick">Бесплатно</span><h1 style="margin-top:8px">Уроки по продажам</h1></div>
      ${Object.values(H.niches).map((n) => `${sec(n.title)}<div class="lessons">${n.lessons.map((l) => lessonCard(l)).join("")}</div>`).join("")}</div>`;
    setCTA(null);
  }

  function Calc() {
    setAccent(null); setBack(true);
    const st = { calls: 125, rate: 48, check: 30000, goal: 60 };
    app.innerHTML = `<div class="screen">${top("#/")}<div class="pad"><span class="kick">Инструмент</span><h1 style="margin-top:8px">Калькулятор потерь</h1><p class="muted" style="margin-top:8px;font-size:14px">Сколько первичных пациентов уходят без записи и сколько это в деньгах. Возьмите выгрузку звонков из телефонии и список записанных за тот же месяц.</p></div>
      <div class="block" style="margin-top:16px">
        <div class="field"><label>Первичных обращений в месяц <b id="vcalls"></b></label><input type="range" id="calls" min="20" max="600" step="5" value="${st.calls}"></div>
        <div class="field"><label>Записываются сейчас <b id="vrate"></b></label><input type="range" id="rate" min="10" max="90" step="1" value="${st.rate}"></div>
        <div class="field"><label>Цель по записи <b id="vgoal"></b></label><input type="range" id="goal" min="20" max="95" step="1" value="${st.goal}"></div>
        <div class="field"><label>Средний чек первичного пациента <b id="vcheck"></b></label><input type="range" id="check" min="3000" max="300000" step="1000" value="${st.check}"></div>
        <div class="res"><div><b id="lost"></b><span>пациентов в месяц без записи</span></div><div><b id="plus"></b><span>дополнительных записей при цели</span></div><div style="grid-column:span 2"><b id="money"></b><span>в месяц приносят эти записи при вашем чеке, без расходов на рекламу</span></div></div>
      </div>
      <p class="disc">Это расчёт, не обещание. В разобранной клинике было 125 первичных в месяц и 48% записи.</p></div>`;
    const $ = (id) => document.getElementById(id);
    const calc = () => {
      const c = +$("calls").value, r = +$("rate").value, g = Math.max(r, +$("goal").value), ch = +$("check").value;
      $("vcalls").textContent = c; $("vrate").textContent = r + "%"; $("vgoal").textContent = g + "%"; $("vcheck").textContent = rub(ch);
      $("lost").textContent = Math.round(c * (1 - r / 100));
      const plus = Math.round(c * (g - r) / 100);
      $("plus").textContent = "+" + plus;
      $("money").textContent = rub(plus * ch);
    };
    ["calls", "rate", "goal", "check"].forEach((id) => $(id).addEventListener("input", calc));
    calc();
    setCTA({ text: "Заказать аудит отдела", go: "#/audit" });
  }

  function Quiz() {
    setAccent(null); setBack(true);
    const saved = (store.get("quiz") || "").split(",").filter(Boolean).map(Number);
    app.innerHTML = `<div class="screen">${top("#/")}<div class="pad"><span class="kick">Самопроверка</span><h1 style="margin-top:8px">Как работает ваш отдел продаж</h1><p class="muted" style="margin-top:8px;font-size:14px">Отметьте то, что у вас уже есть на деле, а не на бумаге.</p></div>
      <div class="block" style="margin-top:16px">${H.quiz.map((q, i) => `<button class="q ${saved.includes(i) ? "on" : ""}" data-q="${i}"><span class="box">✓</span><span>${esc(q)}</span></button>`).join("")}</div>
      <div class="block" style="margin-top:10px"><div class="score"><b id="sc"></b><p id="sct"></p></div><div class="bar"><i id="scb"></i></div></div></div>`;
    const upd = () => {
      const on = [...document.querySelectorAll(".q.on")].map((b) => +b.dataset.q);
      store.set("quiz", on.join(","));
      const s = on.length;
      document.getElementById("sc").textContent = `${s}/10`; document.getElementById("scb").style.width = `${s * 10}%`;
      document.getElementById("sct").textContent = s >= 8 ? "Система есть. Дальше рост за счёт куратора и повторов." : s >= 5 ? "База есть, но пациенты теряются между этапами. Схема закроет пробелы." : "Отдел держится на людях, а не на системе. Начните со схемы и аудита.";
    };
    document.querySelectorAll(".q").forEach((b) => b.addEventListener("click", () => { haptic(); b.classList.toggle("on"); upd(); }));
    upd();
    const last = store.get("niche");
    setCTA({ text: "Смотреть материалы", go: last ? `#/n/${last}` : "#/" });
  }

  function Audit() {
    setAccent(null); setBack(true);
    const a = H.audit;
    app.innerHTML = `<div class="screen">${top("#/")}<div class="pad"><span class="kick">Услуга</span><h1 style="margin-top:8px">${esc(a.title)}</h1><p class="muted" style="margin-top:10px;font-size:14px">${esc(a.text)}</p></div>
      ${sec("Пример: разбор одной клиники")}<div class="norms">${a.case.map(([v, t]) => `<div class="norm"><b>${esc(v)}</b><span>${esc(t)}</span></div>`).join("")}</div>
      ${sec("Что смотрим")}<div class="block"><ol class="steps"><li>Звонки и переписки по чек-листу из 12 пунктов</li><li>CRM, таблицы администраторов, источники</li><li>Анонимный опрос команды и тест</li><li>План на первую неделю и цель на месяц</li></ol></div>
      <div style="margin:16px"><a class="btn light" data-link="${esc(a.url)}" href="#">Подробнее об аудите ›</a></div>
      ${authorBlock()}</div>`;
    setCTA({ text: "Обсудить аудит в Telegram", url: `https://t.me/${H.contact}` });
  }

  // ───────── маршрутизация ─────────
  function route() {
    galleries = [];
    const h = location.hash.replace(/^#\/?/, "").split("/");
    if (h[0] === "n") Niche(h[1], h[2]);
    else if (h[0] === "lessons") Lessons();
    else if (h[0] === "free") Free();
    else if (h[0] === "calc") Calc();
    else if (h[0] === "quiz") Quiz();
    else if (h[0] === "audit") Audit();
    else Home();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", () => { if (!viewer.hidden) { viewer.hidden = true; vstrip.innerHTML = ""; } route(); });
  if (tg && tg.BackButton) tg.BackButton.onClick(() => { haptic(); if (!viewer.hidden) return closeViewer(); history.length > 1 ? history.back() : (location.hash = "#/"); });

  // старт: параметр startapp из ссылки t.me/bot/app?startapp=cosm или ?n=cosm
  const sp = (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || new URLSearchParams(location.search).get("n");
  if (!location.hash && sp && H.niches[sp]) location.hash = `#/n/${sp}`;
  route();
})();
