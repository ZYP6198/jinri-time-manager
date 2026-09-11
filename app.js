const STORAGE_KEY = "jinri-time-manager-v1";
const COLORS = ["#5965d8", "#57b992", "#e09a5f", "#d9829d", "#c2a54d", "#8a82cf", "#6aa9c6", "#9ca4b7"];
const CATEGORY_COLORS = {};
const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const SHORT_WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value) { return new Date(`${value}T12:00:00`); }
function dateLabel(value, withYear = false) {
  const date = parseDate(value);
  return `${withYear ? `${date.getFullYear()}年` : ""}${date.getMonth() + 1}月${date.getDate()}日`;
}
function dateLong(value) { const d = parseDate(value); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; }
function dateWeek(value) { return WEEKDAYS[parseDate(value).getDay()]; }
function timeToMinutes(value) { if (!value) return 0; const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; }
function minutesToText(minutes) { if (!minutes || minutes < 1) return "—"; const hours = Math.floor(minutes / 60); const mins = Math.round(minutes % 60); return hours ? `${hours}小时${mins ? ` ${mins}分钟` : ""}` : `${mins}分钟`; }
function secondsToText(seconds, compact = false) {
  const safe = Math.max(0, Math.round(seconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (compact) return hours ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m`;
  if (hours) return `${hours}小时${minutes ? ` ${minutes}分钟` : ""}`;
  return `${minutes}分钟`;
}
function clockText(seconds) { const safe = Math.max(0, Math.floor(seconds || 0)); return [Math.floor(safe / 3600), Math.floor((safe % 3600) / 60), safe % 60].map((part) => String(part).padStart(2, "0")).join(":"); }
function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
function uid(prefix = "id") { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
function getGreeting() { const hour = new Date().getHours(); return hour < 6 ? "夜深了，也别忘了休息。" : hour < 12 ? "早上好，今天也要有一点进展。" : hour < 18 ? "下午好，继续保持这个节奏。" : "晚上好，给今天画一个温柔的句号。"; }
function formatTimeRange(task) { return task.plannedStart && task.plannedEnd ? `${task.plannedStart} — ${task.plannedEnd}` : task.plannedStart ? `${task.plannedStart} 开始` : "未安排时间"; }

function demoTasks(today) {
  return [
    { id: uid("task"), title: "阅读一篇论文", category: "科研", date: today, plannedStart: "08:30", plannedEnd: "10:00", priority: "P1", status: "done", isTop3: true, note: "先看摘要、图表和结论。", sessions: [{ start: new Date(`${today}T08:32:00`).getTime(), end: new Date(`${today}T09:48:00`).getTime() }], createdAt: Date.now() - 1000 * 60 * 60 * 6, completedAt: Date.now() - 1000 * 60 * 60 * 3 },
    { id: uid("task"), title: "完成实验代码", category: "编程", date: today, plannedStart: "10:30", plannedEnd: "12:00", priority: "P1", status: "running", isTop3: true, note: "把数据清洗函数补完并跑通测试。", sessions: [], activeStartedAt: Date.now() - 1000 * 60 * 37, createdAt: Date.now() - 1000 * 60 * 60 * 5 },
    { id: uid("task"), title: "修改论文第三章", category: "科研", date: today, plannedStart: "14:00", plannedEnd: "16:00", priority: "P2", status: "todo", isTop3: true, note: "重点检查结果解释和图注。", sessions: [], createdAt: Date.now() - 1000 * 60 * 60 * 4 },
    { id: uid("task"), title: "午间散步", category: "运动", date: today, plannedStart: "12:20", plannedEnd: "12:50", priority: "P3", status: "todo", isTop3: false, note: "离开屏幕，走一走。", sessions: [], createdAt: Date.now() - 1000 * 60 * 60 * 4 },
    { id: uid("task"), title: "整理明日计划", category: "生活", date: today, plannedStart: "20:30", plannedEnd: "20:50", priority: "P3", status: "todo", isTop3: false, note: "留出一点缓冲时间。", sessions: [], createdAt: Date.now() - 1000 * 60 * 60 * 2 },
  ];
}

function initialState() {
  const today = localDate();
  return {
    tasks: demoTasks(today),
    categories: ["科研", "学习", "工作", "编程", "阅读", "运动", "生活", "娱乐"],
    reviews: {},
    createdAt: Date.now(),
    isDemo: true,
  };
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...initialState(), ...JSON.parse(stored), isDemo: false };
  } catch (error) { console.warn("无法读取本地数据", error); }
  return initialState();
}

let state = loadState();
let currentView = "today";
let taskFilter = "all";
let statsPeriod = "today";
let calendarCursor = new Date();
let calendarSelected = localDate();
let reviewScore = 0;
let toastTimer;
let deferredInstallPrompt = null;

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, isDemo: false })); state.isDemo = false; } catch (error) { console.warn("无法保存本地数据", error); }
}
function categoryColor(category) {
  if (!CATEGORY_COLORS[category]) CATEGORY_COLORS[category] = COLORS[Object.keys(CATEGORY_COLORS).length % COLORS.length];
  return CATEGORY_COLORS[category];
}
function categoryDot(category) { return `<i class="category-dot" style="background:${categoryColor(category)}"></i>`; }
function getTaskActualSeconds(task) { return (task.sessions || []).reduce((total, session) => total + Math.max(0, (session.end || Date.now()) - session.start) / 1000, 0) + (task.activeStartedAt ? Math.max(0, Date.now() - task.activeStartedAt) / 1000 : 0); }
function plannedSeconds(task) { return Math.max(0, timeToMinutes(task.plannedEnd) - timeToMinutes(task.plannedStart)) * 60; }
function tasksForDate(date) { return state.tasks.filter((task) => task.date === date && task.status !== "abandoned"); }
function sortedTasks(tasks) { return [...tasks].sort((a, b) => (timeToMinutes(a.plannedStart) - timeToMinutes(b.plannedStart)) || (a.createdAt - b.createdAt)); }
function statusText(status) { return ({ todo: "未开始", running: "进行中", paused: "已暂停", done: "已完成", postponed: "已延期", abandoned: "已放弃" })[status] || "未开始"; }

function renderShell() {
  const today = localDate();
  $("#side-date").textContent = dateLabel(today);
  $("#side-date-week").textContent = dateWeek(today);
  $("#topbar-date").textContent = `${dateLong(today)} · ${dateWeek(today)}`;
  $("#page-title").textContent = currentView === "today" ? getGreeting() : ({ calendar: "回看你的每一天。", stats: "时间，留下了答案。", profile: "这是你的时间空间。" }[currentView] || getGreeting());
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === currentView));
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${currentView}`));
}

function renderToday() {
  const today = localDate();
  const tasks = tasksForDate(today);
  const completed = tasks.filter((task) => task.status === "done").length;
  const running = tasks.find((task) => task.status === "running");
  const planned = tasks.reduce((sum, task) => sum + plannedSeconds(task), 0);
  const actual = tasks.reduce((sum, task) => sum + getTaskActualSeconds(task), 0);
  const top3 = sortedTasks(tasks.filter((task) => task.isTop3)).slice(0, 3);
  const top3Completed = top3.filter((task) => task.status === "done").length;
  const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  $("#hero-progress").textContent = `${percent}%`;
  $("#hero-progress-count").textContent = `${completed} / ${tasks.length}`;
  $("#hero-progress-ring").style.background = `conic-gradient(#fff ${percent * 3.6}deg, rgba(255,255,255,.18) 0deg)`;
  $("#hero-copy").textContent = tasks.length ? (completed === tasks.length ? "太棒了，今天的清单已经全部收好。" : `还有 ${tasks.length - completed} 项，按自己的节奏来。`) : "把想做的事写下来，给今天一个方向。";
  $("#top3-count").textContent = `${top3Completed} / ${top3.length || 3}`;
  $("#task-count").textContent = tasks.length;
  $("#insight-copy").textContent = running ? `你正在专注于「${running.title}」，先把这一件事做好。` : actual ? `今天已经专注 ${secondsToText(actual)}，每一段投入都算数。` : "把计划写下来，执行就有了方向。";
  $("#today-metrics").innerHTML = [
    metricCard("任务完成", `${completed}<span class="metric-suffix">/${tasks.length}</span>`, "今天的清单", "purple", "✓"),
    metricCard("专注时间", secondsToText(actual, true), planned ? `计划 ${secondsToText(planned, true)}` : "还没有计划时长", "green", "◒"),
    metricCard("计划总时长", planned ? secondsToText(planned, true) : "—", "今天安排了多久", "orange", "◷"),
    metricCard("Top 3", `${top3Completed}<span class="metric-suffix">/${top3.length || 3}</span>`, "重要的事完成度", "yellow", "✦"),
  ].join("");
  $("#top3-list").innerHTML = top3.length ? top3.map((task, index) => `<div class="top3-item"><span class="top3-index">0${index + 1}</span><button class="top3-check ${task.status === "done" ? "checked" : ""}" data-action="complete" data-id="${task.id}">${task.status === "done" ? "✓" : ""}</button><span class="top3-title ${task.status === "done" ? "done" : ""}">${escapeHtml(task.title)}</span><span class="top3-time">${task.plannedStart || "待安排"}</span></div>`).join("") : `<div class="placeholder-copy">还没有设置重要任务。</div>`;
  const filtered = sortedTasks(tasks).filter((task) => taskFilter === "all" || (taskFilter === "done" ? task.status === "done" : taskFilter === "running" ? task.status === "running" : ["todo", "paused", "postponed"].includes(task.status)));
  $("#task-list").innerHTML = filtered.map(taskCard).join("");
  $("#empty-tasks").classList.toggle("hidden", filtered.length > 0 || tasks.length > 0);
  $("#active-timer-pill").classList.toggle("hidden", !running);
  if (running) { $("#active-timer-label").textContent = running.title; $("#active-timer-value").textContent = clockText(getTaskActualSeconds(running)); }
}

function metricCard(name, value, note, tone, symbol) { return `<div class="metric-card ${tone}"><div class="metric-card-top"><span class="metric-name">${name}</span><span class="metric-symbol">${symbol}</span></div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></div>`; }
function taskCard(task) {
  const actual = getTaskActualSeconds(task);
  const status = task.status;
  const canStart = ["todo", "paused", "postponed"].includes(status);
  const timeLabel = task.plannedStart || task.plannedEnd ? `${task.plannedStart || "—"}<br>${task.plannedEnd || "—"}` : "灵活<br>安排";
  return `<article class="task-item ${status}" data-id="${task.id}"><div class="task-time">${timeLabel}</div><div class="task-track"><span class="task-dot"></span></div><div class="task-main"><div class="task-topline"><span class="task-title ${status === "done" ? "done" : ""}">${escapeHtml(task.title)}</span>${task.isTop3 ? `<span class="task-badge">TOP 3</span>` : ""}${task.priority === "P1" ? `<span class="task-badge p1">P1</span>` : task.priority === "P2" ? `<span class="task-badge p2">P2</span>` : ""}</div><div class="task-meta"><span class="category-tag">${categoryDot(task.category)}${escapeHtml(task.category || "其他")}</span><span class="task-meta-divider">·</span><span>${plannedSeconds(task) ? `计划 ${minutesToText(plannedSeconds(task) / 60)}` : "未设时长"}</span>${actual ? `<span class="task-meta-divider">·</span><span class="${status === "running" ? "task-running-time" : ""}">${status === "running" ? clockText(actual) : `实际 ${secondsToText(actual)}`}</span>` : ""}</div></div><div class="task-action">${canStart ? `<button class="start" data-action="start" data-id="${task.id}">${status === "paused" ? "继续" : "开始"}</button>` : status === "running" ? `<button class="done-action" data-action="complete" data-id="${task.id}">完成</button>` : ""}<button class="more" data-action="detail" data-id="${task.id}" aria-label="查看详情">···</button></div></article>`;
}

function renderCalendar() {
  const cursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
  $("#calendar-month").textContent = `${cursor.getFullYear()}年 ${cursor.getMonth() + 1}月`;
  const firstDay = (cursor.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const prevDays = new Date(cursor.getFullYear(), cursor.getMonth(), 0).getDate();
  let html = "";
  for (let index = 0; index < 42; index += 1) {
    const dayOffset = index - firstDay + 1;
    let date; let dayNumber; let muted = false;
    if (dayOffset < 1) { date = new Date(cursor.getFullYear(), cursor.getMonth(), dayOffset); dayNumber = prevDays + dayOffset; muted = true; }
    else if (dayOffset > daysInMonth) { date = new Date(cursor.getFullYear(), cursor.getMonth() + 1, dayOffset - daysInMonth); dayNumber = dayOffset - daysInMonth; muted = true; }
    else { date = new Date(cursor.getFullYear(), cursor.getMonth(), dayOffset); dayNumber = dayOffset; }
    const dateString = localDate(date); const tasks = tasksForDate(dateString); const completed = tasks.filter((task) => task.status === "done").length; const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0; const isToday = dateString === localDate();
    html += `<button class="calendar-day ${muted ? "muted" : ""} ${dateString === calendarSelected ? "selected" : ""} ${isToday ? "today" : ""} ${tasks.length ? "has-record" : ""}" data-calendar-date="${dateString}"><span class="day-number">${dayNumber}</span>${tasks.length ? `<div class="day-progress"><span style="width:${Math.max(percent, 7)}%"></span></div><div class="day-progress-label">${percent}% · ${tasks.length}项</div>` : ""}</button>`;
  }
  $("#calendar-days").innerHTML = html;
  renderDayDetail();
}

function renderDayDetail() {
  const tasks = sortedTasks(tasksForDate(calendarSelected)); const completed = tasks.filter((task) => task.status === "done").length; const actual = tasks.reduce((sum, task) => sum + getTaskActualSeconds(task), 0); const planned = tasks.reduce((sum, task) => sum + plannedSeconds(task), 0); const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  $("#day-detail-panel").innerHTML = `<span class="section-label">DAY SNAPSHOT</span><h3 class="selected-day-title">${dateLong(calendarSelected)}</h3><div class="selected-day-sub">${dateWeek(calendarSelected)} · ${calendarSelected === localDate() ? "今天" : "历史记录"}</div><div class="day-stat-row"><div class="day-stat"><strong>${percent}%</strong><span>完成率</span></div><div class="day-stat"><strong>${secondsToText(actual, true)}</strong><span>专注时间</span></div><div class="day-stat"><strong>${tasks.length}</strong><span>任务</span></div></div>${tasks.length ? `<div class="day-task-list">${tasks.map((task) => `<div class="day-task">${categoryDot(task.category)}<span class="day-task-title">${escapeHtml(task.title)}</span><span class="day-task-time">${task.plannedStart || "—"}</span><span class="day-task-status ${task.status === "done" ? "done" : "todo"}">${statusText(task.status)}</span></div>`).join("")}</div><div class="insight-footer" style="margin-top:22px"><span class="insight-line"></span><span>计划 ${secondsToText(planned, true)} · 实际 ${secondsToText(actual, true)}</span></div>` : `<div class="day-detail-empty">这一天还没有时间记录。</div>`}`;
}

function rangeForPeriod(period) {
  const today = parseDate(localDate());
  if (period === "today") return { start: localDate(today), end: localDate(today), label: "今日" };
  if (period === "month") return { start: localDate(new Date(today.getFullYear(), today.getMonth(), 1)), end: localDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)), label: "本月" };
  const start = new Date(today); start.setDate(today.getDate() - 6); return { start: localDate(start), end: localDate(today), label: "本周" };
}
function tasksInRange(period) { const range = rangeForPeriod(period); return state.tasks.filter((task) => task.date >= range.start && task.date <= range.end && task.status !== "abandoned"); }
function renderStats() {
  $$(".period-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.period === statsPeriod));
  const tasks = tasksInRange(statsPeriod); const completed = tasks.filter((task) => task.status === "done").length; const planned = tasks.reduce((sum, task) => sum + plannedSeconds(task), 0); const actual = tasks.reduce((sum, task) => sum + getTaskActualSeconds(task), 0); const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0; const postponed = tasks.filter((task) => task.status === "postponed").length;
  $("#stats-metrics").innerHTML = [metricCard("任务完成率", `${percent}<span class="metric-suffix">%</span>`, `${completed} / ${tasks.length} 项完成`, "purple", "✓"), metricCard("总专注时间", secondsToText(actual, true), statsPeriod === "today" ? "今天" : statsPeriod === "week" ? "最近 7 天" : "本自然月", "green", "◒"), metricCard("计划偏差", `${actual - planned >= 0 ? "+" : "−"}${secondsToText(Math.abs(actual - planned), true)}`, actual > planned ? "比计划多投入" : "比计划少投入", "orange", "△"), metricCard("延期任务", postponed, "需要重新安排", "yellow", "↗")].join("");
  const chartDays = statsPeriod === "today" ? [parseDate(localDate())] : statsPeriod === "month" ? Array.from({ length: new Date().getDate() }, (_, i) => new Date(new Date().getFullYear(), new Date().getMonth(), i + 1)) : Array.from({ length: 7 }, (_, i) => { const date = parseDate(localDate()); date.setDate(date.getDate() - (6 - i)); return date; });
  const chartValues = chartDays.map((date) => { const day = localDate(date); return state.tasks.filter((task) => task.date === day).reduce((sum, task) => sum + getTaskActualSeconds(task), 0) / 3600; }); const max = Math.max(...chartValues, 1); const totalHours = chartValues.reduce((sum, value) => sum + value, 0);
  $("#chart-title").textContent = statsPeriod === "today" ? "今日专注时间" : statsPeriod === "month" ? "本月每日专注时间" : "最近 7 天专注时间"; $("#chart-total").textContent = `${totalHours.toFixed(totalHours % 1 ? 1 : 0)}h`;
  $("#bar-chart").innerHTML = chartDays.map((date, index) => `<div class="bar-column ${localDate(date) === localDate() ? "active" : ""}"><span class="bar-value">${chartValues[index].toFixed(1)}h</span><div class="bar-fill" style="height:${Math.max((chartValues[index] / max) * 100, 2)}%"></div><span class="bar-label">${statsPeriod === "month" ? `${date.getMonth() + 1}/${date.getDate()}` : statsPeriod === "today" ? "今天" : `周${SHORT_WEEKDAYS[date.getDay()]}`}</span></div>`).join("");
  const categories = {}; tasks.forEach((task) => { categories[task.category || "其他"] = (categories[task.category || "其他"] || 0) + getTaskActualSeconds(task); }); const categoryEntries = Object.entries(categories).sort((a, b) => b[1] - a[1]); const categoryTotal = categoryEntries.reduce((sum, [, value]) => sum + value, 0); let cursor = 0; const gradient = categoryEntries.length ? categoryEntries.map(([category, seconds]) => { const start = cursor; cursor += seconds / categoryTotal * 360; return `${categoryColor(category)} ${start}deg ${cursor}deg`; }).join(", ") : "#e8eaf4 0deg 360deg";
  $("#category-donut").style.background = `conic-gradient(${gradient})`; $("#donut-hours").textContent = secondsToText(categoryTotal, true); $("#category-total").textContent = secondsToText(categoryTotal, true); $("#category-legend").innerHTML = categoryEntries.length ? categoryEntries.slice(0, 5).map(([category, seconds]) => `<div class="legend-item"><i style="background:${categoryColor(category)}"></i><span>${escapeHtml(category)}</span><strong>${secondsToText(seconds, true)}</strong></div>`).join("") : `<div class="placeholder-copy">完成任务后，这里会出现分类时间。</div>`;
  const varianceTasks = [...tasks].sort((a, b) => getTaskActualSeconds(b) - getTaskActualSeconds(a)).slice(0, 5); const varianceMax = Math.max(...varianceTasks.flatMap((task) => [plannedSeconds(task), getTaskActualSeconds(task)]), 1); $("#variance-list").innerHTML = varianceTasks.length ? `${varianceTasks.map((task) => { const plan = plannedSeconds(task); const real = getTaskActualSeconds(task); const delta = real - plan; return `<div class="variance-row"><span class="variance-name">${escapeHtml(task.title)}</span><div class="variance-bar"><span class="variance-plan" style="width:${Math.max(plan / varianceMax * 100, plan ? 4 : 0)}%"></span><span class="variance-real" style="width:${Math.max(real / varianceMax * 100, real ? 4 : 0)}%"></span></div><span class="variance-value ${delta > 0 ? "over" : "under"}">${plan ? `${delta >= 0 ? "+" : "−"}${minutesToText(Math.abs(delta) / 60)}` : "未计划"}</span></div>`; }).join("")}<div class="variance-legend"><span><i class="plan"></i>计划</span><span><i class="real"></i>实际</span></div>` : `<div class="placeholder-copy">完成或记录任务后，这里会显示计划与实际的差异。</div>`;
}

function renderProfile() {
  const today = localDate(); const review = state.reviews[today] || {}; $("#review-date").textContent = dateLabel(today); $("#review-good").value = review.goodThing || ""; $("#review-waste").value = review.waste || ""; reviewScore = review.score || 0; renderScorePicker(); $("#category-chips").innerHTML = state.categories.map((category) => `<span class="category-chip">${categoryDot(category)}<span>${escapeHtml(category)}</span>${state.categories.length > 1 ? `<button data-remove-category="${escapeHtml(category)}" aria-label="删除${escapeHtml(category)}">×</button>` : ""}</span>`).join("");
  updateInstallRow();
}
function renderScorePicker() { $("#score-picker").innerHTML = Array.from({ length: 10 }, (_, index) => `<button class="score-btn ${index + 1 <= reviewScore ? "active" : ""}" data-score="${index + 1}">${index + 1}</button>`).join(""); }
function renderAll() { renderShell(); renderToday(); renderCalendar(); renderStats(); renderProfile(); renderTaskCategoryOptions(); }

function renderTaskCategoryOptions() { const select = $("#task-category"); if (select) select.innerHTML = state.categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join(""); }
function openModal(modal) { $("#modal-backdrop").classList.remove("hidden"); modal.classList.remove("hidden"); document.body.classList.add("modal-open"); }
function closeModals() { $$(".modal").forEach((modal) => modal.classList.add("hidden")); $("#modal-backdrop").classList.add("hidden"); document.body.classList.remove("modal-open"); }
function resetTaskForm() { $("#task-form").reset(); $("#task-id").value = ""; $("#task-date").value = localDate(); $("#task-priority").value = "P3"; $("#task-modal-title").textContent = "新建任务"; $("#task-submit").textContent = "保存任务"; $("#duration-preview").innerHTML = "计划时长 <strong>—</strong>"; renderTaskCategoryOptions(); }
function openAddTask(prefill = "") { resetTaskForm(); $("#task-title").value = prefill; openModal($("#task-modal")); setTimeout(() => $("#task-title").focus(), 80); }
function openEditTask(task) { resetTaskForm(); $("#task-modal-title").textContent = "编辑任务"; $("#task-submit").textContent = "保存修改"; $("#task-id").value = task.id; $("#task-title").value = task.title; $("#task-category").value = task.category; $("#task-priority").value = task.priority || "P3"; $("#task-date").value = task.date; $("#task-start").value = task.plannedStart || ""; $("#task-end").value = task.plannedEnd || ""; $("#task-note").value = task.note || ""; $("#task-top3").checked = Boolean(task.isTop3); updateDurationPreview(); openModal($("#task-modal")); }
function updateDurationPreview() { const start = $("#task-start").value; const end = $("#task-end").value; const minutes = timeToMinutes(end) - timeToMinutes(start); $("#duration-preview").innerHTML = `计划时长 <strong>${minutes > 0 ? minutesToText(minutes) : "—"}</strong>`; }
function createOrUpdateTask(event) { event.preventDefault(); const id = $("#task-id").value; const title = $("#task-title").value.trim(); const date = $("#task-date").value || localDate(); const start = $("#task-start").value; const end = $("#task-end").value; if (start && end && timeToMinutes(end) <= timeToMinutes(start)) { showToast("结束时间需要晚于开始时间", "warning"); return; } if (!title) return; const data = { title, category: $("#task-category").value || "其他", date, plannedStart: start, plannedEnd: end, priority: $("#task-priority").value, isTop3: $("#task-top3").checked && date === localDate(), note: $("#task-note").value.trim() }; if (id) { const task = state.tasks.find((item) => item.id === id); if (task) Object.assign(task, data); showToast("任务已更新", "success"); } else { state.tasks.push({ id: uid("task"), ...data, status: "todo", sessions: [], createdAt: Date.now() }); showToast("任务已加入今天", "success"); } saveState(); closeModals(); renderAll(); }

function completeTask(id) { const task = state.tasks.find((item) => item.id === id); if (!task) return; if (task.status === "running") stopRunningSession(task); task.status = "done"; task.completedAt = Date.now(); saveState(); renderAll(); showToast("做得好，任务完成了", "success"); }
function startTask(id) { const task = state.tasks.find((item) => item.id === id); if (!task) return; const running = state.tasks.find((item) => item.status === "running" && item.id !== id); if (running) { pauseTask(running.id, false); showToast(`已暂停「${running.title}」，开始新的专注`, "warning"); } task.status = "running"; task.activeStartedAt = Date.now(); saveState(); renderAll(); }
function stopRunningSession(task) { if (task.activeStartedAt) { task.sessions = task.sessions || []; task.sessions.push({ start: task.activeStartedAt, end: Date.now() }); delete task.activeStartedAt; } }
function pauseTask(id, notify = true) { const task = state.tasks.find((item) => item.id === id); if (!task) return; stopRunningSession(task); task.status = "paused"; saveState(); renderAll(); if (notify) showToast("计时已暂停"); }
function postponeTask(id) { const task = state.tasks.find((item) => item.id === id); if (!task) return; if (task.status === "running") stopRunningSession(task); const tomorrow = new Date(parseDate(task.date)); tomorrow.setDate(tomorrow.getDate() + 1); task.date = localDate(tomorrow); task.status = "postponed"; task.originalDate = task.originalDate || localDate(); saveState(); closeModals(); renderAll(); showToast(`已延期到 ${dateLabel(task.date)}`, "success"); }
function deleteTask(id) { const task = state.tasks.find((item) => item.id === id); if (!task) return; if (!window.confirm(`确定删除「${task.title}」吗？`)) return; state.tasks = state.tasks.filter((item) => item.id !== id); saveState(); closeModals(); renderAll(); showToast("任务已删除"); }
function openDetail(task) { const actual = getTaskActualSeconds(task); const planned = plannedSeconds(task); const canStart = ["todo", "paused", "postponed"].includes(task.status); $("#detail-modal").innerHTML = `<div class="detail-header"><div><span class="section-label">TASK DETAILS</span><h2 class="detail-title">${escapeHtml(task.title)}</h2><span class="detail-status ${task.status}">${statusText(task.status)}</span></div><button class="icon-button" data-close-modal aria-label="关闭">×</button></div><div class="detail-info-grid"><div class="detail-info"><span>计划日期</span><strong>${dateLabel(task.date, true)}</strong></div><div class="detail-info"><span>计划时间</span><strong>${formatTimeRange(task)}</strong></div><div class="detail-info"><span>计划时长</span><strong>${planned ? minutesToText(planned / 60) : "未设置"}</strong></div><div class="detail-info"><span>实际时长</span><strong>${actual ? secondsToText(actual) : "尚未记录"}</strong></div></div>${task.note ? `<div class="detail-note">${escapeHtml(task.note)}</div>` : ""}<div class="detail-actions">${canStart ? `<button class="button button-primary" data-action="start" data-id="${task.id}">${task.status === "paused" ? "继续计时" : "开始计时"}</button>` : task.status === "running" ? `<button class="button button-soft" data-action="pause" data-id="${task.id}">暂停</button>` : ""}${task.status !== "done" ? `<button class="button button-soft" data-action="complete" data-id="${task.id}">完成</button>` : ""}<button class="button button-soft" data-action="edit" data-id="${task.id}">编辑</button><button class="danger-button" data-action="delete" data-id="${task.id}">删除</button></div>${task.status !== "done" ? `<button class="text-button" style="margin-top:17px" data-action="postpone" data-id="${task.id}">延期到明天 →</button>` : ""}`; openModal($("#detail-modal")); }

function showToast(message, type = "") { const toast = $("#toast"); toast.textContent = message; toast.className = `toast ${type}`; clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600); }
function switchView(view) { currentView = view; renderShell(); if (view === "today") renderToday(); if (view === "calendar") renderCalendar(); if (view === "stats") renderStats(); if (view === "profile") renderProfile(); }
function exportData() { const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `今日-时间记录-${localDate()}.json`; link.click(); URL.revokeObjectURL(url); showToast("数据已导出", "success"); }
function resetData() { if (!window.confirm("确定清空当前记录并恢复演示数据吗？")) return; state = initialState(); saveState(); calendarCursor = new Date(); calendarSelected = localDate(); renderAll(); showToast("已恢复演示数据", "success"); }
function saveReview() { const today = localDate(); state.reviews[today] = { score: reviewScore, goodThing: $("#review-good").value.trim(), waste: $("#review-waste").value.trim(), updatedAt: Date.now() }; saveState(); showToast("今日复盘已保存", "success"); }
function addCategory() { const name = window.prompt("输入新的任务分类"); if (!name) return; const trimmed = name.trim(); if (!trimmed) return; if (state.categories.includes(trimmed)) { showToast("这个分类已经存在", "warning"); return; } state.categories.push(trimmed); saveState(); renderAll(); showToast("分类已添加", "success"); }
function removeCategory(name) { if (state.tasks.some((task) => task.category === name)) { showToast("已有任务使用这个分类，暂时不能删除", "warning"); return; } state.categories = state.categories.filter((category) => category !== name); saveState(); renderAll(); showToast("分类已删除"); }
function updateInstallRow() { const row = $("#install-app"); if (!row) return; const installed = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; const title = row.querySelector("strong"); const copy = row.querySelector("small"); if (installed) { title.textContent = "已安装到主屏幕"; copy.textContent = "从手机主屏幕直接打开"; row.classList.add("disabled"); } else { title.textContent = "安装到手机"; copy.textContent = deferredInstallPrompt ? "添加到主屏幕，像 App 一样使用" : "浏览器菜单中选择“添加到主屏幕”"; row.classList.remove("disabled"); } }
async function installApp() { if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true) { showToast("已经安装在主屏幕了", "success"); return; } if (!deferredInstallPrompt) { showToast("请在浏览器菜单中选择“添加到主屏幕”", "warning"); return; } deferredInstallPrompt.prompt(); const choice = await deferredInstallPrompt.userChoice; if (choice.outcome === "accepted") showToast("已添加到主屏幕", "success"); deferredInstallPrompt = null; updateInstallRow(); }

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-view]"); if (nav) { switchView(nav.dataset.view); return; }
  const filter = event.target.closest("[data-filter]"); if (filter) { taskFilter = filter.dataset.filter; $$(".filter-tab").forEach((tab) => tab.classList.toggle("active", tab === filter)); renderToday(); return; }
  const period = event.target.closest("[data-period]"); if (period) { statsPeriod = period.dataset.period; renderStats(); return; }
  const action = event.target.closest("[data-action]"); if (action) { const task = state.tasks.find((item) => item.id === action.dataset.id); if (!task) return; const kind = action.dataset.action; if (kind === "start") startTask(task.id); if (kind === "pause") pauseTask(task.id); if (kind === "complete") completeTask(task.id); if (kind === "detail") openDetail(task); if (kind === "edit") { closeModals(); openEditTask(task); } if (kind === "postpone") postponeTask(task.id); if (kind === "delete") deleteTask(task.id); return; }
  const calendarDay = event.target.closest("[data-calendar-date]"); if (calendarDay) { calendarSelected = calendarDay.dataset.calendarDate; renderCalendar(); return; }
  const score = event.target.closest("[data-score]"); if (score) { reviewScore = Number(score.dataset.score); renderScorePicker(); return; }
  const categoryRemove = event.target.closest("[data-remove-category]"); if (categoryRemove) { removeCategory(categoryRemove.dataset.removeCategory); return; }
  if (event.target.closest("[data-close-modal]") || event.target === $("#modal-backdrop")) closeModals();
});

$("#open-add-task").addEventListener("click", () => openAddTask()); $("#empty-add-task").addEventListener("click", () => openAddTask()); $("#set-top3").addEventListener("click", () => { const first = tasksForDate(localDate()).find((task) => !task.isTop3 && task.status !== "done"); if (first) { first.isTop3 = true; saveState(); renderToday(); showToast(`已将「${first.title}」加入 Top 3`, "success"); } else showToast("先创建一个任务吧", "warning"); }); $("#open-profile").addEventListener("click", () => switchView("profile")); $("#task-form").addEventListener("submit", createOrUpdateTask); $("#task-start").addEventListener("input", updateDurationPreview); $("#task-end").addEventListener("input", updateDurationPreview); $("#quick-add-input").addEventListener("keydown", (event) => { if (event.key === "Enter") { const value = event.target.value.trim(); if (value) { openAddTask(value); event.target.value = ""; } } }); $("#prev-month").addEventListener("click", () => { calendarCursor.setMonth(calendarCursor.getMonth() - 1); renderCalendar(); }); $("#next-month").addEventListener("click", () => { calendarCursor.setMonth(calendarCursor.getMonth() + 1); renderCalendar(); }); $("#calendar-today").addEventListener("click", () => { calendarCursor = new Date(); calendarSelected = localDate(); renderCalendar(); }); $("#save-review").addEventListener("click", saveReview); $("#add-category").addEventListener("click", addCategory); $("#install-app").addEventListener("click", installApp); $("#export-data").addEventListener("click", exportData); $("#reset-data").addEventListener("click", resetData);

window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); deferredInstallPrompt = event; updateInstallRow(); });
window.addEventListener("appinstalled", () => { deferredInstallPrompt = null; updateInstallRow(); showToast("今日已安装到主屏幕", "success"); });
if ("serviceWorker" in navigator && (window.location.protocol === "http:" || window.location.protocol === "https:")) navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("离线缓存注册失败", error));

setInterval(() => { if (state.tasks.some((task) => task.status === "running")) { renderToday(); if (currentView === "stats") renderStats(); if (currentView === "calendar") renderDayDetail(); } }, 1000);
renderAll();
