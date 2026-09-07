const DATA_PATH = '/data/packedEvents.json';
const FIREBASE_SCRIPT_URLS = ['https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth-compat.js', 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore-compat.js'];
let debugEnabled = new URL(window.location.href).searchParams.get('debug') === 'true';

const $header = document.querySelector('header');
const $status = document.getElementById('status');
const $appVersion = document.getElementById('app-version');
const $activeTabHeading = document.getElementById('active-tab-heading');
const $tabInformation = document.getElementById('tab-information');
const $errorDialog = document.getElementById('error-dialog');
const $errorMessage = document.getElementById('error-message');
const $errorClose = document.getElementById('error-close');
const $confirmDialog = document.getElementById('confirm-dialog');
const $confirmForm = document.getElementById('confirm-form');
const $confirmMessage = document.getElementById('confirm-dialog-message');
const $confirmCancel = document.getElementById('confirm-cancel');
const $listSubheaderRow = document.querySelector('.list-subheader-row');
const $removeShared = document.getElementById('remove-shared');
const $programSortControls = document.getElementById('program-sort-controls');
const $programSortStart = document.getElementById('program-sort-start');
const $programSortSeen = document.getElementById('program-sort-seen');
const $sharedSortSeparator = document.getElementById('shared-sort-separator');
const $programSortShared = document.getElementById('program-sort-shared');
const $shareFavorites = document.getElementById('share-favorites');
const $shareDialog = document.getElementById('share-dialog');
const $shareName = document.getElementById('share-name');
const $shareNameEdit = document.getElementById('share-name-edit');
const $shareNameSave = document.getElementById('share-name-save');
const $shareContent = document.getElementById('share-content');
const $shareClose = document.getElementById('share-close');
const $shareEmpty = document.getElementById('share-empty');
const $shareText = document.getElementById('share-text');
const $shareCopy = document.getElementById('share-copy');
const $shareLink = document.getElementById('share-link');
const $shareLinkCopy = document.getElementById('share-link-copy');
const $shareMessage = document.getElementById('share-message');
const $infoButton = document.getElementById('info-button');
const $infoDialog = document.getElementById('info-dialog');
const $infoClose = document.getElementById('info-close');
const $finishedVisibilityToggle = document.getElementById('finished-visibility-toggle');
const $themeToggle = document.getElementById('theme-toggle');
const $loginButton = document.getElementById('login-button');
const $userMenu = document.getElementById('user-menu');
const $removeUserData = document.getElementById('remove-user-data');
const $logoutButton = document.getElementById('logout-button');
const $syncAlert = document.getElementById('sync-alert');
const $syncLoginLink = document.getElementById('sync-login-link');
const $authDialog = document.getElementById('auth-dialog');
const $authForm = document.getElementById('auth-form');
const $authEmail = document.getElementById('auth-email');
const $authPassword = document.getElementById('auth-password');
const $authMessage = document.getElementById('auth-message');
const $googleLoginButton = document.getElementById('google-login-button');
const $authClose = document.querySelector('.auth-close');
const $list = document.getElementById('list');
const $search = document.getElementById('event-search');
const $clearFilters = document.getElementById('clear-filters');
const $childrenFilter = document.getElementById('children-filter');
const $adultsFilter = document.getElementById('adults-filter');
const $freeFilter = document.getElementById('free-filter');
const $paidFilter = document.getElementById('paid-filter');
const $fromFilter = document.getElementById('from-filter');
const $toFilter = document.getElementById('to-filter');
const $showFilters = document.getElementById('show-filters');
const $favoritesShortcut = document.getElementById('favorites-shortcut');
const $showFiltersLabel = document.getElementById('show-filters-label');
const $filterSearchSection = document.getElementById('filter-search-section');
const $closeFilters = document.getElementById('close-filters');
const $closeFiltersBottom = document.getElementById('close-filters-bottom');
const $filterCount = document.getElementById('filter-count');
const $selectedFilters = document.getElementById('selected-filters');
const $tabSelect = document.getElementById('tab-select');
const tabs = {
  program: document.getElementById('tab-program'),
  subevents: document.getElementById('tab-subevents'),
  cancelled: document.getElementById('tab-cancelled'),
  favorites: document.getElementById('tab-favorites'),
  live: document.getElementById('tab-live'),
  recent: document.getElementById('tab-recent'),
  soon: document.getElementById('tab-soon'),
  later: document.getElementById('tab-later'),
  finished: document.getElementById('tab-finished'),
  unfinished: document.getElementById('tab-unfinished'),
};

function updateDebugMode() {
  debugEnabled = new URL(window.location.href).searchParams.get('debug') === 'true';
}

const multiFilters = [
  { menu: document.getElementById('category-menu'), options: document.getElementById('category-options'), summary: document.getElementById('category-summary'), eventProperty: 'categoryNames', allLabel: 'Alla kategorier', selectedLabel: 'categories' },
  { menu: document.getElementById('language-menu'), options: document.getElementById('language-options'), summary: document.getElementById('language-summary'), eventProperty: 'languageNames', allLabel: 'Alla språk', selectedLabel: 'languages' },
  { menu: document.getElementById('location-menu'), options: document.getElementById('location-options'), summary: document.getElementById('location-summary'), eventProperty: 'locationNames', allLabel: 'Alla platser', selectedLabel: 'locations' },
  { menu: document.getElementById('accessibility-menu'), options: document.getElementById('accessibility-options'), summary: document.getElementById('accessibility-summary'), eventProperty: 'accessibilityNames', allLabel: 'All tillgänglighet', selectedLabel: 'accessibilities' },
];

let allEvents = [];
let activeTab = 'program';
let programSortMode = 'start';
let favoritesSortMode = 'start';
let sharedFavoritesSortMode = 'start';
let hideFinishedEvents = false;
let firebaseAuth = null;
let firebaseUser = null;
let firebaseInitializationPromise = null;
let settingsDocument = null;
let shareDocument = null;
let shareUnsubscribe = null;
let sharedFavorites = null;
let sharedOwnerName = 'Någon';
let missingSharedId = null;
let isDeletingUserData = false;
const sharedPageUrl = new URL(window.location.href);
const sharedPageMatch = sharedPageUrl.pathname.match(/^\/share\/([^/]+)\/?$/);
const sharedPageId = sharedPageMatch ? decodeURIComponent(sharedPageMatch[1]) : null;
const pendingShareId = sessionStorage.getItem('pendingShareId');
const requestedShareId = sharedPageId || pendingShareId;
const isSharePage = Boolean(sharedPageId);
if (isSharePage) {
  document.body.classList.add('share-loading');
  $status.textContent = 'Hämtar delade favoriter...';
}
let sharedUsers = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem('sharedUsers') || '[]');
    return Array.isArray(saved) ? saved.filter((user) => user?.id) : [];
  } catch (error) {
    return [];
  }
})();
let cloudSyncTimer = null;
let shareId = localStorage.getItem('shareId');
if (!shareId) {
  shareId = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem('shareId', shareId);
}
updateDebugMode();
const RECENT_EVENT_WINDOW_MS = 15 * 60 * 1000;
const SOON_EVENT_WINDOW_MS = 45 * 60 * 1000;

if ($appVersion && typeof APP_VERSION === 'string') $appVersion.textContent = APP_VERSION;

window.addEventListener('pageshow', updateDebugMode);

function setTheme(theme, persist = true) {
  document.body.dataset.theme = theme;
  if (persist) localStorage.setItem('theme', theme);
  const isLight = theme === 'light';
  $themeToggle.innerHTML = isLight ? '<i class="fa-solid fa-moon" aria-hidden="true"></i>' : '<i class="fa-solid fa-sun" aria-hidden="true"></i>';
  const label = isLight ? 'Byt till mörkt läge' : 'Byt till ljust läge';
  $themeToggle.setAttribute('aria-label', label);
  $themeToggle.title = label;
  if (persist) scheduleCloudSettingsSync();
}

const savedTheme = localStorage.getItem('theme');
const initialTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
setTheme(initialTheme, false);
hideFinishedEvents = localStorage.getItem('hideFinishedEvents') === 'true';

function eventStartTime(event) {
  if (Number.isFinite(event.startMs)) return event.startMs;
  return new Date(event.start || event.startTime || 0).getTime();
}

function eventAssumedDuration(event) {
  return event.type === 'subEvent' ? 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
}

function eventEndTime(event) {
  if (Number.isFinite(event.endMs)) return event.endMs;
  if (event.end || event.endTime) return new Date(event.end || event.endTime).getTime();

  const startTime = eventStartTime(event);
  return Number.isFinite(startTime) ? startTime + eventAssumedDuration(event) : NaN;
}

function isFinishedEvent(event, currentTime = eventCurrentTime()) {
  const endTime = eventEndTime(event);
  return !event.isCancelled && Number.isFinite(endTime) && endTime < currentTime;
}

function visibleByFinishedToggle(events, tab, currentTime) {
  if (!hideFinishedEvents) return events;
  return events.filter((event) => !isFinishedEvent(event, currentTime));
}

function updateFinishedVisibilityToggle() {
  const label = hideFinishedEvents ? 'Visa avslutade evenemang' : 'Dölj avslutade evenemang';
  $finishedVisibilityToggle.innerHTML = hideFinishedEvents ? '<i class="fa-solid fa-eye-slash" aria-hidden="true"></i>' : '<i class="fa-solid fa-eye" aria-hidden="true"></i>';
  $finishedVisibilityToggle.setAttribute('aria-label', label);
  $finishedVisibilityToggle.setAttribute('aria-pressed', String(hideFinishedEvents));
  $finishedVisibilityToggle.title = label;
}

function eventCurrentTime() {
  if (typeof FAKE_TODAY_DATE !== 'string') return Date.now();
  const match = FAKE_TODAY_DATE.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return Date.now();

  const now = new Date();
  const fakeNow = new Date(now);
  fakeNow.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return fakeNow.getTime();
}

function populateHourFilter(select) {
  for (let hour = 0; hour < 24; hour += 1) {
    const option = document.createElement('option');
    option.value = String(hour).padStart(2, '0');
    option.textContent = option.value;
    select.appendChild(option);
  }
}

function numericSortValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.POSITIVE_INFINITY;
}

function compareByStartTime(firstEvent, secondEvent) {
  const sortKeyDiff = numericSortValue(firstEvent.sortKeyTime) - numericSortValue(secondEvent.sortKeyTime);
  if (sortKeyDiff !== 0) return sortKeyDiff;

  const startDiff = eventStartTime(firstEvent) - eventStartTime(secondEvent);
  if (startDiff !== 0) return startDiff;

  const endDiff = eventEndTime(firstEvent) - eventEndTime(secondEvent);
  if (endDiff !== 0) return endDiff;

  return String(firstEvent.title || firstEvent.name || '').localeCompare(String(secondEvent.title || secondEvent.name || ''), 'sv-SE');
}

function compareByUpdatedSortKey(firstEvent, secondEvent) {
  const sortKeyDiff = numericSortValue(firstEvent.sortKeyUpdated) - numericSortValue(secondEvent.sortKeyUpdated);
  return sortKeyDiff || compareByStartTime(firstEvent, secondEvent);
}

function sortProgramEvents(events) {
  return events.slice().sort(programSortMode === 'updated' ? compareByUpdatedSortKey : compareByStartTime);
}

function sortFavoriteEvents(events, favorites) {
  return events.slice().sort((firstEvent, secondEvent) => {
    if (favoritesSortMode === 'stars') {
      const ratingDiff = numericSortValue(favorites[secondEvent.favoriteId]) - numericSortValue(favorites[firstEvent.favoriteId]);
      if (ratingDiff !== 0) return ratingDiff;
    }
    return compareByStartTime(firstEvent, secondEvent);
  });
}

function sortSharedFavoriteEvents(events, favorites, sharedFavorites) {
  return events.slice().sort((firstEvent, secondEvent) => {
    const sortRatings = sharedFavoritesSortMode === 'mine' ? favorites : sharedFavorites;
    if (sharedFavoritesSortMode !== 'start') {
      const firstRating = Number(sortRatings[firstEvent.favoriteId]);
      const secondRating = Number(sortRatings[secondEvent.favoriteId]);
      const firstHasRating = Number.isFinite(firstRating);
      const secondHasRating = Number.isFinite(secondRating);
      if (firstHasRating !== secondHasRating) return firstHasRating ? -1 : 1;
      const ratingDiff = secondRating - firstRating;
      if (ratingDiff !== 0) return ratingDiff;
    }
    return compareByStartTime(firstEvent, secondEvent);
  });
}

function updateProgramSortControls() {
  const isFavorites = activeTab === 'favorites';
  const isShared = activeTab === 'shared' || activeTab.startsWith('shared:');
  const sortMode = isShared ? sharedFavoritesSortMode : isFavorites ? favoritesSortMode : programSortMode;
  $programSortControls.setAttribute('aria-label', isShared ? 'Sortera delade favoriter' : isFavorites ? 'Sortera favoriter' : 'Sortera program');
  $programSortControls.hidden = !isShared && !isFavorites && activeTab !== 'program' && activeTab !== 'subevents';
  $shareFavorites.hidden = !isFavorites;
  $programSortSeen.textContent = isShared ? 'Betyg' : isFavorites ? 'Betyg' : 'Nyast';
  $programSortSeen.hidden = false;
  $sharedSortSeparator.hidden = !isShared;
  $programSortShared.hidden = !isShared;
  $programSortStart.classList.toggle('active', sortMode === 'start');
  $programSortStart.setAttribute('aria-pressed', String(sortMode === 'start'));
  const secondarySortMode = isShared ? 'mine' : isFavorites ? 'stars' : 'updated';
  $programSortSeen.classList.toggle('active', sortMode === secondarySortMode);
  $programSortSeen.setAttribute('aria-pressed', String(sortMode === secondarySortMode));
  $programSortShared.classList.toggle('active', sortMode === 'owner');
  $programSortShared.setAttribute('aria-pressed', String(sortMode === 'owner'));
  $programSortStart.textContent = isShared ? 'Starttid' : 'Starttid';
  $programSortShared.textContent = 'Delat betyg';
}

function favoriteEvents(favorites = loadFavorites()) {
  const favoriteIds = new Set(Object.keys(favorites));
  return sortFavoriteEvents(
    allEvents.filter((event) => favoriteIds.has(event.favoriteId)),
    favorites,
  );
}

function shareTextForFavorites(events, favorites) {
  const eventText = events.map((event) => {
    const title = event.title || event.name || event.displayName || 'Untitled';
    const location = event.locationAlias || 'Okänd plats';
    const start = formatLocalClockTime(event.startTime || event.start || event.startTimeText || event.time || '');
    const end = formatLocalClockTime(event.endTime || event.end || event.endTimeText || '');
    const rating = favorites[event.favoriteId];
    const starLabel = rating === 1 ? 'stjärna' : 'stjärnor';
    return `${start}-${end}\n${title} (${rating} ${starLabel})\n${location}\n\n${event.url || ''}`;
  });
  const userName = getShareName() || 'Någon';
  return [`${userName} har delat sina favoritevenemang från Uppsala Kulturnatt 2026 med dig.`, ...eventText, 'Hitta dina egna favoriter på https://uppsalakulturnatt.com/.'].join('\n\n');
}

function updateShareDialog() {
  const shareName = getShareName();
  $shareName.value = shareName;
  const hasSavedName = Boolean(shareName && shareName !== 'Någon');
  $shareName.disabled = hasSavedName;
  $shareNameEdit.hidden = !hasSavedName;
  $shareNameSave.hidden = hasSavedName;
  updateShareNameGate();
  const favorites = loadFavorites();
  const events = favoriteEvents(favorites);
  const count = events.length;
  const shareText = count > 0 ? shareTextForFavorites(events, favorites) : '';
  $shareEmpty.hidden = count > 0;
  $shareLink.textContent = `${window.location.origin}/share/${shareId}`;
  $shareText.value = shareText;
  $shareText.disabled = count === 0;
  $shareCopy.disabled = count === 0;
  $shareMessage.textContent = '';
}

function updateShareNameGate() {
  const hasName = Boolean($shareName.value.trim() && $shareName.value.trim() !== 'Någon');
  $shareNameSave.disabled = !hasName;
  $shareLinkCopy.disabled = !hasName;
  $shareContent.inert = !hasName;
  $shareContent.setAttribute('aria-hidden', String(!hasName));
}

function getShareName() {
  const name = localStorage.getItem('shareOwnerName')?.trim() || firebaseUser?.displayName?.trim() || '';
  return name === 'Någon' ? '' : name;
}

function confirmAction(message) {
  return new Promise((resolve) => {
    $confirmMessage.textContent = message;
    $confirmDialog.returnValue = 'cancel';
    const handleClose = () => {
      $confirmDialog.removeEventListener('close', handleClose);
      resolve($confirmDialog.returnValue === 'accept');
    };
    $confirmDialog.addEventListener('close', handleClose);
    $confirmDialog.showModal();
    requestAnimationFrame(() => $confirmCancel.focus());
  });
}

async function saveShareName() {
  const name = $shareName.value.trim();
  if (!name || name === 'Någon') {
    $shareName.focus();
    $shareMessage.textContent = 'Ange ett giltigt namn för att fortsätta.';
    return;
  }
  localStorage.setItem('shareOwnerName', name);
  try {
    await Promise.all([settingsDocument?.set({ name }, { merge: true }), publishSharedFavorites()]);
  } catch (error) {
    console.error('Firebase share name sync failed:', error);
    $shareMessage.textContent = 'Namnet kunde inte synkroniseras till Firebase.';
  }
  updateShareDialog();
}

async function copyFavorites() {
  if ($shareCopy.disabled) return;
  try {
    await navigator.clipboard.writeText($shareText.value);
  } catch (error) {
    $shareText.focus();
    $shareText.select();
    document.execCommand('copy');
  }
  $shareMessage.textContent = 'Favoriterna kopierades.';
}

async function copyShareLink() {
  await navigator.clipboard.writeText(`${window.location.origin}/share/${shareId}`);
  $shareMessage.textContent = 'Länken kopierades.';
}

async function copyShareLink() {
  await navigator.clipboard.writeText($shareLink.textContent);
  $shareMessage.textContent = 'Länken kopierades.';
}

function eventsInWindow(events, fromTime, toTime) {
  return events.filter((event) => {
    if (event.isCancelled) return false;
    const startTime = eventStartTime(event);
    return Number.isFinite(startTime) && startTime >= fromTime && startTime <= toTime;
  });
}

function laterEvents(events, fromTime) {
  return events.filter((event) => {
    if (event.isCancelled) return false;
    const startTime = eventStartTime(event);
    return Number.isFinite(startTime) && startTime > fromTime;
  });
}

function tabTooltip(tab) {
  return tabs[tab].title.replace(/\s*\([^)]*\)\s*$/, '');
}

function tabIcon(tab) {
  return tabs[tab].textContent.trim().split(/\s+/)[0];
}

function liveEvents(events, currentTime) {
  return events.filter((event) => {
    if (event.isCancelled) return false;
    const startTime = eventStartTime(event);
    const endTime = eventEndTime(event);
    return Number.isFinite(startTime) && Number.isFinite(endTime) && startTime <= currentTime && endTime >= currentTime;
  });
}

function formatLocalClockTime(value) {
  if (!value && value !== 0) return '—';

  const raw = String(value).trim();
  if (!raw) return '—';

  const simpleMatch = raw.match(/^(\d{1,2})[:.](\d{2})$/);
  if (simpleMatch) {
    return `${String(simpleMatch[1]).padStart(2, '0')}:${String(simpleMatch[2]).padStart(2, '0')}`;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  try {
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Stockholm',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const hour = parts.find((part) => part.type === 'hour')?.value;
    const minute = parts.find((part) => part.type === 'minute')?.value;
    if (hour && minute) return `${hour}:${minute}`;
  } catch (err) {
    // ignore and fall back to the raw value below
  }

  return raw;
}

function formatLocalDateTime(value) {
  if (!value && value !== 0) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function formatUpdatedStatus(event) {
  const updated = formatLocalDateTime(event.updated);
  if (!updated) return null;

  const rawUpdateStatus = typeof event.updateStatus === 'string' ? event.updateStatus.trim() : '';
  const updateStatus = rawUpdateStatus === 'new' || rawUpdateStatus === 'created' ? 'Skapad' : rawUpdateStatus === 'updated' ? 'Ändrad' : rawUpdateStatus;
  return `Uppdaterad: ${updated}${updateStatus ? ` (${updateStatus})` : ''}`;
}

function idFor(e) {
  return e.id || e.externalId || e.value || e.eventId || JSON.stringify(e).slice(0, 8);
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem('favorites');
    return normalizeFavorites(raw ? JSON.parse(raw) : {});
  } catch (e) {
    return {};
  }
}
function normalizeFavorites(value) {
  if (Array.isArray(value)) return Object.fromEntries(value.map((id) => [id, 1]));
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value).filter(([, rating]) => Number.isInteger(rating) && rating >= 1 && rating <= 3));
}

function saveFavorites(favorites) {
  const normalized = normalizeFavorites(favorites);
  const removed = loadRemovedFavorites();
  Object.keys(normalized).forEach((id) => delete removed[id]);
  localStorage.setItem('favorites', JSON.stringify(normalized));
  localStorage.setItem('removedFavorites', JSON.stringify(removed));
  scheduleCloudSettingsSync();
}

function loadRemovedFavorites() {
  try {
    const raw = localStorage.getItem('removedFavorites');
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function removeFavorite(id) {
  const favorites = loadFavorites();
  delete favorites[id];
  const removed = loadRemovedFavorites();
  removed[id] = Date.now();
  localStorage.setItem('removedFavorites', JSON.stringify(removed));
  saveFavorites(favorites);
}

function shareOwnerName() {
  return localStorage.getItem('shareOwnerName')?.trim() || firebaseUser?.displayName?.trim() || firebaseUser?.email?.trim() || 'Någon';
}

function rememberSharedUser(id, name) {
  if (!id) return;
  sharedUsers = [...sharedUsers.filter((user) => user.id !== id), { id, name: name || 'Någon' }];
  localStorage.setItem('sharedUsers', JSON.stringify(sharedUsers));
}

function addSharedTab(id, name) {
  const key = `shared:${id}`;
  if (!id || tabs[key]) return;
  const option = document.createElement('option');
  option.value = key;
  option.textContent = `\u{1F517} Delade favoriter (${name || 'Någon'})`;
  option.title = `Delade favoriter från ${name || 'Någon'}`;
  $tabSelect.appendChild(option);
  tabs[key] = option;
}

async function publishSharedFavorites() {
  if (!shareDocument || !firebaseUser) return;
  await shareDocument.set({
    ownerId: firebaseUser.uid,
    ownerName: shareOwnerName(),
    favorites: loadFavorites(),
    updatedAt: Date.now(),
  });
}

async function subscribeToSharedFavorites(id) {
  if (!firebase?.firestore || !id) return;
  shareUnsubscribe?.();
  const document = firebase.firestore().collection('shares').doc(id);
  return new Promise((resolve, reject) => {
    let firstSnapshot = true;
    shareUnsubscribe = document.onSnapshot((snapshot) => {
      if (!snapshot.exists) {
        missingSharedId = id;
        if (sessionStorage.getItem('pendingShareId') === id) sessionStorage.removeItem('pendingShareId');
        sharedUsers = sharedUsers.filter((user) => user.id !== id);
        localStorage.setItem('sharedUsers', JSON.stringify(sharedUsers));
        const sharedTab = tabs[`shared:${id}`];
        sharedTab?.remove();
        delete tabs[`shared:${id}`];
        $list.hidden = true;
        $listSubheaderRow.hidden = true;
        scheduleCloudSettingsSync();
        const sharedLinkUrl = sharedPageId ? sharedPageUrl.href : `${window.location.origin}/share/${encodeURIComponent(id)}`;
        const error = new Error(`Kan inte hitta användare med delningslänk ${sharedLinkUrl}. Be om en ny länk och försök igen.`);
        showError(error.message);
        reject(error);
        return;
      }
      const shared = snapshot.data();
      missingSharedId = null;
      sharedFavorites = normalizeFavorites(shared.favorites);
      sharedOwnerName = shared.ownerName || 'Någon';
      rememberSharedUser(id, sharedOwnerName);
      addSharedTab(id, sharedOwnerName);
      if (activeTab === `shared:${id}` || (firstSnapshot && requestedShareId === id)) setActive(`shared:${id}`);
      firstSnapshot = false;
      resolve();
    }, reject);
  });
}

function setStatus(message = '') {
  if (isSharePage && document.body.classList.contains('share-loading')) {
    $status.textContent = 'Hämtar delade favoriter...';
    $status.hidden = false;
    return;
  }
  $status.textContent = message;
  $status.hidden = !message;
}

function setShareLoading(loading) {
  if (!isSharePage) return;
  document.body.classList.toggle('share-loading', loading);
  if (loading) setStatus('Hämtar delade favoriter...');
  else setStatus();
}

function showError(message = '') {
  if (!message) return;
  $errorMessage.textContent = message;
  if (!$errorDialog.open) $errorDialog.showModal();
}

function reportSettingsSyncError(operation, error) {
  console.error('Firebase settings sync failed:', {
    operation,
    code: error?.code || 'unknown',
    message: error?.message || String(error),
    error,
  });
  setStatus();
  showError('Inställningarna kunde inte synkroniseras med din användarprofil. Ladda om sidan och försök igen. Om problemet kvarstår, rensa webbplatsdata och försök på nytt.');
}

function normalizeEvent(event) {
  event.favoriteId = idFor(event);
  event.url = event.id ? `https://kulturnatten.uppsala.se/program/event/?externalId=${event.id}` : '';
  event.categoryNames = Array.isArray(event.categoryNames) ? event.categoryNames : [];
  event.languageNames = Array.isArray(event.languageNames) ? event.languageNames : [];
  event.locationNames = Array.isArray(event.locationNames) ? event.locationNames : [];
  event.accessibilityNames = Array.isArray(event.accessibilityNames) ? event.accessibilityNames : [];
  event.startMs = eventStartTime(event);
  event.endMs = eventEndTime(event);
  event.startMinutes = clockMinutes(event.start || event.startTime || event.startTimeText || event.time);
  event.endMinutes = eventEndClockMinutes(event);
  event.searchText = [event.title, event.name, event.displayName, event.locationAlias, event.locationName, event.location, event.about].map((value) => String(value ?? '').toLocaleLowerCase('sv-SE')).join(' ');
  return event;
}

function localSettings() {
  const settings = {
    theme: document.body.dataset.theme,
    favorites: loadFavorites(),
    hideFinishedEvents,
    sharedUsers,
  };
  const ownerName = shareOwnerName();
  if (ownerName !== 'Någon') settings.name = ownerName;
  return settings;
}

function settingsMergeFields(settings) {
  return ['theme', 'favorites', 'hideFinishedEvents', 'sharedUsers', 'name'].filter((field) => Object.prototype.hasOwnProperty.call(settings, field));
}

function applySettings(settings) {
  if (settings && (settings.theme === 'light' || settings.theme === 'dark')) setTheme(settings.theme, false);
  if (settings && settings.favorites) localStorage.setItem('favorites', JSON.stringify(normalizeFavorites(settings.favorites)));
  if (settings && typeof settings.hideFinishedEvents === 'boolean') {
    hideFinishedEvents = settings.hideFinishedEvents;
    localStorage.setItem('hideFinishedEvents', String(hideFinishedEvents));
  }
  if (settings && typeof settings.name === 'string' && settings.name.trim()) {
    localStorage.setItem('shareOwnerName', settings.name.trim());
  }
  if (settings && Array.isArray(settings.sharedUsers)) {
    const usersById = new Map(sharedUsers.map((user) => [user.id, user]));
    settings.sharedUsers
      .filter((user) => user?.id)
      .forEach((user) => {
        usersById.set(user.id, { id: user.id, name: user.name || 'Någon' });
      });
    sharedUsers = Array.from(usersById.values());
    localStorage.setItem('sharedUsers', JSON.stringify(sharedUsers));
    sharedUsers.forEach((user) => addSharedTab(user.id, user.name));
  }
  updateFinishedVisibilityToggle();
}

function scheduleCloudSettingsSync() {
  window.clearTimeout(cloudSyncTimer);
  cloudSyncTimer = window.setTimeout(() => {
    if (!settingsDocument) return;

    const settings = localSettings();

    settingsDocument
      .set(settings, {
        mergeFields: settingsMergeFields(settings),
      })
      .catch((error) => {
        reportSettingsSyncError('write user settings', error);
      });

    publishSharedFavorites().catch((error) => {
      console.error('Firebase share sync failed:', error);
    });
  }, 300);
}

async function syncSettingsWithFirebase() {
  if (!settingsDocument) return;

  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let operation = 'read user settings';
    try {
      const snapshot = await settingsDocument.get();
      const local = localSettings();
      const remote = snapshot.exists ? snapshot.data() : null;

      if (remote) {
        const remoteFavorites = normalizeFavorites(remote.favorites);
        const removedFavorites = loadRemovedFavorites();
        const mergedFavorites = Object.fromEntries(Object.entries(remoteFavorites).filter(([id]) => !removedFavorites[id]));

        applySettings({
          ...remote,
          favorites: { ...mergedFavorites, ...local.favorites },
        });
      }

      const settings = localSettings();

      operation = 'write user settings';
      await settingsDocument.set(settings, {
        mergeFields: settingsMergeFields(settings),
      });

      localStorage.removeItem('removedFavorites');
      await publishSharedFavorites();
      updateTabCounts();
      setActive(activeTab);
      return;
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        reportSettingsSyncError(operation, error);
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
}

function showAuthMessage(message = '') {
  $authMessage.textContent = message;
}

function openAuthenticationDialog() {
  showAuthMessage();
  $authForm.reset();
  $authDialog.showModal();
  requestAnimationFrame(() => $googleLoginButton.focus());
}

function updateAuthenticationUi(user) {
  firebaseUser = user;
  $syncAlert.hidden = Boolean(user);
  $userMenu.hidden = true;
  $loginButton.setAttribute('aria-expanded', 'false');
  $loginButton.replaceChildren();
  if (!user || user.isAnonymous) {
    $loginButton.setAttribute('aria-label', 'Logga in');
    $loginButton.title = 'Logga in';
    $loginButton.append(Object.assign(document.createElement('i'), { className: 'fa-regular fa-user', ariaHidden: 'true' }));
    return;
  }

  const profile = user.providerData?.find((provider) => provider.providerId === 'google.com') || user.providerData?.[0];
  const displayName = user.displayName || profile?.displayName || user.email || 'användare';
  const photoURL = user.photoURL || profile?.photoURL;
  $loginButton.setAttribute('aria-label', `Konto: ${displayName}`);
  $loginButton.title = `Inloggad som ${displayName}`;
  if (photoURL) {
    const image = document.createElement('img');
    image.className = 'user-avatar';
    image.src = photoURL;
    image.alt = '';
    image.addEventListener(
      'error',
      () => {
        $loginButton.replaceChildren(Object.assign(document.createElement('i'), { className: 'fa-solid fa-user-check', ariaHidden: 'true' }));
      },
      { once: true },
    );
    $loginButton.append(image);
  } else {
    $loginButton.append(Object.assign(document.createElement('i'), { className: 'fa-solid fa-user-check', ariaHidden: 'true' }));
  }
}

async function removeUserData() {
  if (!firebaseAuth || !firebaseUser) return;
  const confirmed = await confirmAction('Alla dina lokala och molnlagrade användardata, inklusive inloggningen, kommer att tas bort. Detta går inte att ångra. Vill du fortsätta?');
  if (!confirmed) return;

  const user = firebaseUser;
  $removeUserData.disabled = true;
  try {
    const database = firebase.firestore();
    const shareSnapshots = await database.collection('shares').where('ownerId', '==', user.uid).get();
    const references = new Map(shareSnapshots.docs.map((snapshot) => [snapshot.ref.path, snapshot.ref]));
    if (shareDocument) references.set(shareDocument.path, shareDocument);
    if (settingsDocument) references.set(settingsDocument.path, settingsDocument);
    const referenceList = Array.from(references.values());
    for (let index = 0; index < referenceList.length; index += 450) {
      const batch = database.batch();
      referenceList.slice(index, index + 450).forEach((reference) => batch.delete(reference));
      await batch.commit();
    }

    isDeletingUserData = true;
    shareUnsubscribe?.();
    shareUnsubscribe = null;
    window.clearTimeout(cloudSyncTimer);
    await user.delete();
    await firebaseAuth.signOut().catch(() => {});

    settingsDocument = null;
    shareDocument = null;
    sharedFavorites = null;
    sharedOwnerName = 'Någon';
    sharedUsers = [];
    Object.keys(tabs)
      .filter((tab) => tab.startsWith('shared:'))
      .forEach((tab) => {
        tabs[tab].remove();
        delete tabs[tab];
      });
    updateAuthenticationUi(null);
    $userMenu.hidden = true;
    $loginButton.setAttribute('aria-expanded', 'false');
    setActive('program');
    updateTabCounts();
    setStatus('Alla användardata har tagits bort.');
    localStorage.clear();
    sessionStorage.clear();
  } catch (error) {
    isDeletingUserData = false;
    console.error('Removing user data failed:', error);
    showError(`Användardata kunde inte tas bort: ${error?.message || error}`);
  } finally {
    $removeUserData.disabled = false;
  }
}

function loadScript(src) {
  const existingScript = document.querySelector(`script[src="${src}"]`);
  if (existingScript) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
}

function initFirebaseAuthentication() {
  if (typeof firebase === 'undefined' || typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG) {
    $loginButton.disabled = true;
    $loginButton.title = 'Firebase är inte konfigurerat';
    setShareLoading(false);
    return;
  }

  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    firebaseAuth = firebase.auth();
    const database = firebase.firestore();
    database.settings({
      experimentalForceLongPolling: true,
      useFetchStreams: false,
    });
    firebaseAuth.onAuthStateChanged(async (user) => {
      if (!user) {
        if (isDeletingUserData) {
          updateAuthenticationUi(null);
          return;
        }
        await firebaseAuth.signInAnonymously();
        return;
      }
      updateAuthenticationUi(user);
      if (user.displayName?.trim()) localStorage.setItem('shareOwnerName', user.displayName.trim());
      settingsDocument = user ? database.collection('users').doc(user.uid) : null;
      shareDocument = database.collection('shares').doc(shareId);
      try {
        if (requestedShareId) {
          await subscribeToSharedFavorites(requestedShareId);
          sessionStorage.removeItem('pendingShareId');
        }
        if (user) await syncSettingsWithFirebase();
      } catch (error) {
        showError(error?.message || 'Delade favoriter kunde inte laddas.');
      } finally {
        setShareLoading(false);
      }
    });
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    $loginButton.disabled = true;
    $loginButton.title = 'Firebase kunde inte startas';
    setShareLoading(false);
  }
}

async function ensureFirebaseAuthentication() {
  if (firebaseAuth) return true;
  if (!firebaseInitializationPromise) {
    firebaseInitializationPromise = FIREBASE_SCRIPT_URLS.reduce((promise, src) => promise.then(() => loadScript(src)), Promise.resolve()).then(() => initFirebaseAuthentication());
  }

  try {
    await firebaseInitializationPromise;
  } catch (error) {
    console.error('Firebase scripts failed to load:', error);
    $loginButton.disabled = true;
    $loginButton.title = 'Firebase kunde inte laddas';
    setShareLoading(false);
  }
  return Boolean(firebaseAuth);
}

function scheduleFirebaseIdleLoad() {
  const loadFirebase = () => ensureFirebaseAuthentication();
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadFirebase, { timeout: 3000 });
  } else {
    window.setTimeout(loadFirebase, 1500);
  }
}

function updateTabCounts() {
  const favorites = loadFavorites();
  const favoriteIds = new Set(Object.keys(favorites));
  const now = eventCurrentTime();
  let activeCount = 0;
  let subeventCount = 0;
  let cancelledCount = 0;
  let favoriteCount = 0;
  let liveCount = 0;
  let recentCount = 0;
  let soonCount = 0;
  let laterCount = 0;
  let finishedCount = 0;
  let unfinishedCount = 0;

  for (const event of allEvents) {
    const isCancelled = Boolean(event.isCancelled);
    const isFinished = isFinishedEvent(event, now);
    if (isCancelled) cancelledCount += 1;
    if (isFinished) finishedCount += 1;
    if (!isCancelled && !isFinished) unfinishedCount += 1;

    if (hideFinishedEvents && isFinished) continue;
    if (!isCancelled && event.type === 'event') activeCount += 1;
    if (!isCancelled && event.type === 'subEvent') subeventCount += 1;
    if (favoriteIds.has(event.favoriteId)) favoriteCount += 1;
    if (!isCancelled && Number.isFinite(event.startMs) && Number.isFinite(event.endMs) && event.startMs <= now && event.endMs >= now) liveCount += 1;
    if (!isCancelled && Number.isFinite(event.startMs) && event.startMs >= now - RECENT_EVENT_WINDOW_MS && event.startMs <= now) recentCount += 1;
    if (!isCancelled && Number.isFinite(event.startMs) && event.startMs >= now && event.startMs <= now + SOON_EVENT_WINDOW_MS) soonCount += 1;
    if (!isCancelled && Number.isFinite(event.startMs) && event.startMs > now + SOON_EVENT_WINDOW_MS) laterCount += 1;
  }

  tabs.program.textContent = `\u{1F4C5} Evenemang (${activeCount})`;
  tabs.program.title = `Evenemang (${activeCount} st)`;
  tabs.subevents.textContent = `\u{1F4DD} Delevenemang (${subeventCount})`;
  tabs.subevents.title = `Delevenemang (${subeventCount} st)`;
  tabs.cancelled.textContent = `\u{1F6AB} Inställda (${cancelledCount})`;
  tabs.cancelled.title = `Inställda evenemang (${cancelledCount} st)`;
  tabs.favorites.textContent = `\u2B50 Mina favoriter (${favoriteCount})`;
  tabs.favorites.title = `Mina favoriter (${favoriteCount} st)`;
  tabs.live.textContent = `\u{1F550} Pågående (${liveCount})`;
  tabs.live.title = `Pågående evenemang (${liveCount} st)`;
  tabs.recent.textContent = `\u23EA Startat nyss (${recentCount})`;
  tabs.recent.title = `Evenemang som startat nyss (${recentCount} st)`;
  tabs.soon.textContent = `\u23E9 Startar strax (${soonCount})`;
  tabs.soon.title = `Evenemang som startar strax (${soonCount} st)`;
  tabs.later.textContent = `\u23F3 Startar senare (${laterCount})`;
  tabs.later.title = `Evenemang som startar senare (${laterCount} st)`;
  tabs.unfinished.textContent = `\u26AB Ej avslutade (${unfinishedCount})`;
  tabs.unfinished.title = `Ej avslutade evenemang (${unfinishedCount} st)`;
  tabs.finished.textContent = `\u2705 Avslutade (${finishedCount})`;
  tabs.finished.title = `Avslutade evenemang (${finishedCount} st)`;
}

function coordinatesToMapQuery(coordinates) {
  if (!coordinates || typeof coordinates !== 'object') return null;

  const latitude = Number(coordinates.latitude ?? coordinates.lat);
  const longitude = Number(coordinates.longitude ?? coordinates.lng ?? coordinates.lon);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && (latitude !== 0 || longitude !== 0) ? `${latitude},${longitude}` : null;
}

function matchesSearch(event) {
  const searchTerm = $search.value.trim().toLocaleLowerCase('sv-SE');
  if (!searchTerm) return true;

  return event.searchText.includes(searchTerm);
}

function selectedFilterValues(filter) {
  return Array.from(filter.options.querySelectorAll('input:checked'))
    .map((input) => input.value)
    .filter((value) => value !== 'all');
}

function displayFilterValue(filter, value) {
  if (filter.eventProperty === 'languageNames' && String(value).toLocaleLowerCase('sv-SE').includes('kräver inga språkkunskaper')) return 'Inga språkkunskaper';
  return value;
}

function languageFilterPriority(language) {
  const normalizedLanguage = String(language).trim().toLocaleLowerCase('sv-SE');
  if (normalizedLanguage === 'svenska') return 0;
  if (normalizedLanguage === 'engelska') return 1;
  return 2;
}

function matchesMultiFilters(event) {
  return multiFilters.every((filter) => {
    const selectedValues = selectedFilterValues(filter);
    if (selectedValues.length === 0) return true;

    const eventValues = Array.isArray(event[filter.eventProperty]) ? event[filter.eventProperty] : [];
    return eventValues.some((value) => selectedValues.includes(value));
  });
}

function matchesChildrenFilter(event) {
  if ($childrenFilter.checked) return event.isForChildren === true;
  if ($adultsFilter.checked) return event.isForChildren === false;
  return true;
}

function matchesFreeFilter(event) {
  if ($freeFilter.checked) return event.isFree === true;
  if ($paidFilter.checked) return event.isFree === false;
  return true;
}

function clockMinutes(value) {
  const formattedTime = formatLocalClockTime(value);
  const match = formattedTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function eventEndClockMinutes(event) {
  return clockMinutes(event.end || event.endTime || event.endTimeText) ?? clockMinutes(new Date(eventEndTime(event)).toISOString());
}

function filterStartClockMinutes(value) {
  return /^\d{2}$/.test(value) ? Number(value) * 60 : null;
}

function filterEndClockMinutes(value) {
  return /^\d{2}$/.test(value) ? Number(value) * 60 + 59 : null;
}

function matchesTimeFilters(event) {
  const fromTime = filterStartClockMinutes($fromFilter.value);
  const toTime = filterEndClockMinutes($toFilter.value);
  if (fromTime === null && toTime === null) return true;

  const startTime = event.startMinutes;
  const endTime = event.endMinutes;
  if (startTime === null || endTime === null) return false;

  return (fromTime === null || endTime >= fromTime) && (toTime === null || startTime <= toTime);
}

function matchesActiveFilters(event) {
  return matchesSearch(event) && matchesChildrenFilter(event) && matchesFreeFilter(event) && matchesMultiFilters(event) && matchesTimeFilters(event);
}

function populateMultiFilter(filter, items) {
  const orderedItems = filter.eventProperty === 'languageNames' ? items.slice().sort((first, second) => languageFilterPriority(first?.name) - languageFilterPriority(second?.name)) : items;
  for (const item of orderedItems) {
    if (!item?.name) continue;
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = item.name;
    label.append(input, ` ${displayFilterValue(filter, item.name)}`);
    filter.options.appendChild(label);
  }
}

function updateFilterSummary(filter) {
  const selectedValues = selectedFilterValues(filter);
  filter.summary.textContent = selectedValues.length === 0 ? filter.allLabel : `${selectedValues.length} ${filter.selectedLabel}`;
}

function addCategoryFilter(category) {
  const categoryFilter = multiFilters[0];
  const categoryInput = Array.from(categoryFilter.options.querySelectorAll('input:not([value="all"])')).find((input) => input.value === category);
  if (!categoryInput) return;

  for (const input of categoryFilter.options.querySelectorAll('input')) input.checked = false;
  const allOption = categoryFilter.options.querySelector('input[value="all"]');
  if (allOption) allOption.checked = false;
  categoryInput.checked = true;
  updateFilterSummary(categoryFilter);
  updateClearFiltersButton();
  updateFilterCount();
  setActive(activeTab);
}

function createCategoryChip(category) {
  const tag = document.createElement('button');
  tag.type = 'button';
  tag.className = 'chip';
  tag.textContent = category;
  tag.addEventListener('click', (event) => {
    event.stopPropagation();
    addCategoryFilter(category);
  });
  return tag;
}

function updateClearFiltersButton() {
  $clearFilters.disabled = !$search.value && !$childrenFilter.checked && !$adultsFilter.checked && !$freeFilter.checked && !$paidFilter.checked && !$fromFilter.value && !$toFilter.value && multiFilters.every((filter) => selectedFilterValues(filter).length === 0);
}

function updateFilterCount() {
  const selectedCount = multiFilters.reduce((count, filter) => count + selectedFilterValues(filter).length, 0) + ($search.value.trim() ? 1 : 0) + ($childrenFilter.checked ? 1 : 0) + ($adultsFilter.checked ? 1 : 0) + ($freeFilter.checked ? 1 : 0) + ($paidFilter.checked ? 1 : 0) + ($fromFilter.value ? 1 : 0) + ($toFilter.value ? 1 : 0);
  const countLabel = selectedCount > 0 ? ` (${selectedCount})` : '';
  $filterCount.textContent = countLabel;
  updateShowFiltersButton(countLabel);
}

function updateShowFiltersButton(countLabel = $filterCount.textContent) {
  const label = '<i class="fa-solid fa-filter" aria-hidden="true"></i>';
  const actionLabel = $filterSearchSection.open ? 'Dölj filter' : 'Visa filter';
  $showFiltersLabel.innerHTML = label;
  $showFilters.setAttribute('aria-label', `${actionLabel}${countLabel}`);
  $showFilters.title = `${actionLabel}${countLabel}`;
}

function updateSelectedFilters(filteredEventCount) {
  const selectedFilters = [];
  if ($search.value.trim()) selectedFilters.push($search.value.trim());
  if ($childrenFilter.checked) selectedFilters.push('Barn');
  if ($adultsFilter.checked) selectedFilters.push('Vuxna');
  if ($freeFilter.checked) selectedFilters.push('Gratis');
  if ($paidFilter.checked) selectedFilters.push('Kostar');
  for (const filter of multiFilters) selectedFilters.push(...selectedFilterValues(filter).map((value) => displayFilterValue(filter, value)));
  if ($fromFilter.value) selectedFilters.push(`Från ${$fromFilter.value}`);
  if ($toFilter.value) selectedFilters.push(`Till ${$toFilter.value}`);
  const finishedVisibilityText = hideFinishedEvents ? 'dölj avslutade' : 'visa avslutade';
  const selectedFilterText = `${selectedFilters.length > 0 ? selectedFilters.join(', ') : 'Inga'} + ${finishedVisibilityText}`;
  $selectedFilters.replaceChildren();
  const label = document.createElement('span');
  label.textContent = 'Filter:';
  const values = document.createElement('span');
  values.textContent = ` ${selectedFilterText} (${filteredEventCount})`;
  $selectedFilters.append(label, values);
}

function languageCountryCode(language) {
  const normalizedLanguage = String(language).toLocaleLowerCase('sv-SE');
  if (normalizedLanguage.includes('kräver inga språkkunskaper')) return null;
  if (normalizedLanguage.includes('arabiska')) return 'sa';
  if (normalizedLanguage.includes('engelska')) return 'gb';
  if (normalizedLanguage.includes('finska')) return 'fi';
  if (normalizedLanguage.includes('franska')) return 'fr';
  if (normalizedLanguage.includes('italienska')) return 'it';
  if (normalizedLanguage.includes('kinesiska')) return 'cn';
  if (normalizedLanguage.includes('polska')) return 'pl';
  if (normalizedLanguage.includes('ryska')) return 'ru';
  if (normalizedLanguage.includes('spanska')) return 'es';
  if (normalizedLanguage.includes('svenska')) return 'se';
  if (normalizedLanguage.includes('tyska')) return 'de';
  if (normalizedLanguage.includes('ukrainska')) return 'ua';
  return null;
}

function displayLanguageName(language) {
  return String(language).toLocaleLowerCase('sv-SE').includes('kräver inga språkkunskaper') ? 'Språkoberoende' : language;
}

function locationIconClass(location) {
  const normalizedLocation = String(location).toLocaleLowerCase('sv-SE');
  if (normalizedLocation.includes('inomhus')) return 'fa-solid fa-building';
  if (normalizedLocation.includes('utomhus')) return 'fa-solid fa-tree';
  if (normalizedLocation.includes('scen')) return 'fa-solid fa-masks-theater';
  if (normalizedLocation.includes('digitalt')) return 'fa-solid fa-laptop';
  return 'fa-solid fa-location-dot';
}

function accessibilityIconClass(accessibility) {
  const normalizedAccessibility = String(accessibility).toLocaleLowerCase('sv-SE');
  if (normalizedAccessibility.includes('barnvagn')) return 'fa-solid fa-baby-carriage';
  if (normalizedAccessibility.includes('hörselskadade')) return 'fa-solid fa-ear-listen';
  if (normalizedAccessibility.includes('hiss')) return 'fa-solid fa-elevator';
  if (normalizedAccessibility.includes('rullstol') && normalizedAccessibility.includes('toalett')) return 'fa-solid fa-restroom';
  if (normalizedAccessibility.includes('rullstol')) return 'fa-solid fa-wheelchair';
  if (normalizedAccessibility.includes('synskadade')) return 'fa-solid fa-eye-low-vision';
  return 'fa-solid fa-universal-access';
}

function closeFilters() {
  if ($filterSearchSection.open) $filterSearchSection.close();
  $showFilters.setAttribute('aria-expanded', 'false');
  $showFilters.setAttribute('aria-pressed', 'false');
  updateShowFiltersButton();
}

function clearActiveFocus() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function positionFiltersDialog() {
  if (!window.matchMedia('(min-width: 641px)').matches) {
    $filterSearchSection.style.top = '';
    $filterSearchSection.style.right = '';
    $filterSearchSection.style.left = '';
    return;
  }

  const buttonBounds = $showFilters.getBoundingClientRect();
  const horizontalMargin = 12;

  $filterSearchSection.style.top = `${buttonBounds.bottom + 8}px`;
  $filterSearchSection.style.right = `${Math.max(horizontalMargin, window.innerWidth - buttonBounds.right)}px`;
  $filterSearchSection.style.left = 'auto';
}

function createEventDetails(ev, eventTitle) {
  const details = document.createElement('div');
  details.className = 'event-details';
  details.hidden = true;

  if (ev.about) {
    const about = document.createElement('p');
    about.className = 'event-about';
    about.textContent = ev.about;
    details.appendChild(about);
  }

  if (!SHOW_CATEGORIES_IN_LIST) {
    const categoryNames = Array.isArray(ev.categoryNames) ? ev.categoryNames : [];
    if (categoryNames.length > 0) {
      const categories = document.createElement('div');
      categories.className = 'tag-row has-tags';
      for (const category of categoryNames) {
        categories.appendChild(createCategoryChip(category));
      }
      details.appendChild(categories);
    }
  }

  const detailsList = document.createElement('ul');
  detailsList.className = 'event-detail-list';

  if (typeof ev.isFree === 'boolean') {
    const freeAdmission = document.createElement('li');
    freeAdmission.textContent = `Gratis: ${ev.isFree ? 'Ja' : 'Nej'}`;
    detailsList.appendChild(freeAdmission);
  }

  if (typeof ev.isForChildren === 'boolean') {
    const audience = document.createElement('li');
    audience.appendChild(document.createTextNode('Målgrupp:'));
    const audienceList = document.createElement('ul');
    audienceList.className = 'accessibility-list';
    const audienceListItem = document.createElement('li');
    const audienceItem = document.createElement('span');
    audienceItem.className = 'accessibility-item';
    const audienceIcon = document.createElement('i');
    audienceIcon.className = `fa-solid ${ev.isForChildren ? 'fa-children' : 'fa-user'} accessibility-icon`;
    audienceIcon.setAttribute('aria-hidden', 'true');
    audienceItem.appendChild(audienceIcon);
    audienceItem.appendChild(document.createTextNode(ev.isForChildren ? 'Barn och vuxna' : 'Vuxna'));
    audienceListItem.appendChild(audienceItem);
    audienceList.appendChild(audienceListItem);
    audience.appendChild(audienceList);
    detailsList.appendChild(audience);
  }

  const languageNames = Array.isArray(ev.languageNames) ? ev.languageNames.filter(Boolean) : [];
  const languages = document.createElement('li');
  languages.appendChild(document.createTextNode('Språk: '));
  if (languageNames.length > 0) {
    const languageList = document.createElement('ul');
    languageList.className = 'language-list';
    languageNames.forEach((language) => {
      const languageListItem = document.createElement('li');
      const languageItem = document.createElement('span');
      languageItem.className = 'language-item';
      const countryCode = languageCountryCode(language);
      if (countryCode) {
        const languageIcon = document.createElement('img');
        languageIcon.className = 'language-country-icon';
        languageIcon.src = `https://flagcdn.com/16x12/${countryCode}.png`;
        languageIcon.srcset = `https://flagcdn.com/32x24/${countryCode}.png 2x`;
        languageIcon.alt = '';
        languageIcon.width = 16;
        languageIcon.height = 12;
        languageItem.appendChild(languageIcon);
      } else {
        const languageIcon = document.createElement('i');
        languageIcon.className = 'fa-solid fa-globe language-country-icon';
        languageIcon.setAttribute('aria-hidden', 'true');
        languageItem.appendChild(languageIcon);
      }
      languageItem.appendChild(document.createTextNode(displayLanguageName(language)));
      languageListItem.appendChild(languageItem);
      languageList.appendChild(languageListItem);
    });
    languages.appendChild(languageList);
  } else {
    const languageList = document.createElement('ul');
    languageList.className = 'language-list';
    const languageListItem = document.createElement('li');
    const languageItem = document.createElement('span');
    languageItem.className = 'language-item';
    const languageIcon = document.createElement('i');
    languageIcon.className = 'fa-solid fa-globe language-country-icon';
    languageIcon.setAttribute('aria-hidden', 'true');
    languageItem.appendChild(languageIcon);
    languageItem.appendChild(document.createTextNode('Ej angivet'));
    languageListItem.appendChild(languageItem);
    languageList.appendChild(languageListItem);
    languages.appendChild(languageList);
  }
  detailsList.appendChild(languages);

  const accessibilityNames = Array.isArray(ev.accessibilityNames) ? ev.accessibilityNames.filter(Boolean) : [];
  const accessibility = document.createElement('li');
  accessibility.appendChild(document.createTextNode('Tillgänglighet: '));
  if (accessibilityNames.length > 0) {
    const accessibilityList = document.createElement('ul');
    accessibilityList.className = 'accessibility-list';
    accessibilityNames.forEach((accessibilityName, index) => {
      const accessibilityListItem = document.createElement('li');
      const accessibilityItem = document.createElement('span');
      accessibilityItem.className = 'accessibility-item';
      const accessibilityIcon = document.createElement('i');
      accessibilityIcon.className = `${accessibilityIconClass(accessibilityName)} accessibility-icon`;
      accessibilityIcon.setAttribute('aria-hidden', 'true');
      accessibilityItem.appendChild(accessibilityIcon);
      accessibilityItem.appendChild(document.createTextNode(accessibilityName));
      accessibilityListItem.appendChild(accessibilityItem);
      accessibilityList.appendChild(accessibilityListItem);
    });
    accessibility.appendChild(accessibilityList);
  } else {
    const accessibilityList = document.createElement('ul');
    accessibilityList.className = 'accessibility-list';
    const accessibilityListItem = document.createElement('li');
    const accessibilityItem = document.createElement('span');
    accessibilityItem.className = 'accessibility-item';
    const accessibilityIcon = document.createElement('i');
    accessibilityIcon.className = 'fa-solid fa-circle-question accessibility-icon';
    accessibilityIcon.setAttribute('aria-hidden', 'true');
    accessibilityItem.appendChild(accessibilityIcon);
    accessibilityItem.appendChild(document.createTextNode('Ej angivet'));
    accessibilityListItem.appendChild(accessibilityItem);
    accessibilityList.appendChild(accessibilityListItem);
    accessibility.appendChild(accessibilityList);
  }
  detailsList.appendChild(accessibility);

  const locationNames = Array.isArray(ev.locationNames) ? ev.locationNames.map((location) => String(location).trim()).filter(Boolean) : [];
  if (locationNames.length > 0) {
    const locations = document.createElement('li');
    locations.appendChild(document.createTextNode('Plats: '));
    const locationList = document.createElement('ul');
    locationList.className = 'location-list';
    locationNames.forEach((locationName) => {
      const locationListItem = document.createElement('li');
      const locationItem = document.createElement('span');
      locationItem.className = 'location-item';
      const locationIcon = document.createElement('i');
      locationIcon.className = `${locationIconClass(locationName)} location-icon`;
      locationIcon.setAttribute('aria-hidden', 'true');
      locationItem.appendChild(locationIcon);
      locationItem.appendChild(document.createTextNode(locationName));
      locationListItem.appendChild(locationItem);
      locationList.appendChild(locationListItem);
    });
    locations.appendChild(locationList);
    detailsList.appendChild(locations);
  }

  if (ev.organizer) {
    const organizer = document.createElement('li');
    organizer.textContent = 'Arrangör: ';
    if (ev.webpage) {
      const link = document.createElement('a');
      link.href = ev.webpage;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = ev.organizer;
      organizer.appendChild(link);
    } else if (ev.organizer) {
      organizer.appendChild(document.createTextNode(ev.organizer));
    }
    detailsList.appendChild(organizer);
  }

  if (ev.url) {
    const source = document.createElement('li');
    source.appendChild(document.createTextNode('Källa: '));
    const link = document.createElement('a');
    link.href = ev.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'kulturnatten.uppsala.se';
    source.appendChild(link);
    detailsList.appendChild(source);
  }

  const type = document.createElement('li');
  type.textContent = `Typ: ${ev.type === 'subEvent' ? 'Del av evenemang' : 'Evenemang'}`;
  detailsList.appendChild(type);

  const updatedStatus = formatUpdatedStatus(ev);
  if (ev.startTime) {
    const startsAt = document.createElement('li');
    startsAt.textContent = `Startar: ${formatLocalDateTime(ev.startTime) ?? ev.startTime}`;
    detailsList.appendChild(startsAt);

    const endsAt = document.createElement('li');
    endsAt.textContent = `Slutar: ${ev.endTime ? (formatLocalDateTime(ev.endTime) ?? ev.endTime) : 'Ej angivet'}`;
    detailsList.appendChild(endsAt);
  }

  if (updatedStatus) {
    const updatedAt = document.createElement('li');
    updatedAt.textContent = updatedStatus;
    detailsList.appendChild(updatedAt);
  }

  const checked = formatLocalDateTime(ev.checked);
  if (debugEnabled && checked) {
    const checkedAt = document.createElement('li');
    checkedAt.textContent = `Kontrollerad: ${checked}`;
    detailsList.appendChild(checkedAt);
  }

  if (ev.streetAddress) {
    const address = document.createElement('li');
    address.textContent = `Address: ${ev.streetAddress}`;
    detailsList.appendChild(address);
  }

  if (detailsList.childElementCount > 0) details.appendChild(detailsList);

  const mapQuery = coordinatesToMapQuery(ev.coordinates);
  if (mapQuery) {
    const mapToggle = document.createElement('button');
    mapToggle.type = 'button';
    mapToggle.className = 'map-toggle';
    mapToggle.textContent = 'Visa karta';
    mapToggle.setAttribute('aria-expanded', 'false');

    const map = document.createElement('iframe');
    map.className = 'event-map';
    map.title = `Google Map: ${eventTitle}`;
    map.loading = 'lazy';
    map.referrerPolicy = 'no-referrer-when-downgrade';
    map.hidden = true;
    let mapLoaded = false;

    mapToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!mapLoaded) {
        map.src = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`;
        mapLoaded = true;
      }
      map.hidden = !map.hidden;
      mapToggle.textContent = map.hidden ? 'Visa karta' : 'Göm karta';
      mapToggle.setAttribute('aria-expanded', String(!map.hidden));
    });

    details.appendChild(mapToggle);
    details.appendChild(map);
  }

  return details.childElementCount > 0 ? details : null;
}

function renderList(events, favorites = loadFavorites()) {
  $list.innerHTML = '';
  if (!events || events.length === 0) {
    $list.innerHTML = '<div class="no-events">Inga evenemang</div>';
    return;
  }
  const fragment = document.createDocumentFragment();
  let openCard = null;
  for (const ev of events) {
    const card = document.createElement('div');
    card.className = 'card';
    card.classList.toggle('shared-card', activeTab === 'shared' || activeTab.startsWith('shared:'));
    card.classList.toggle('cancelled', Boolean(ev.isCancelled));
    card.tabIndex = 0;
    card.setAttribute('role', 'button');

    if (activeTab === 'shared' || activeTab.startsWith('shared:')) {
      const sharedLabel = document.createElement('div');
      sharedLabel.className = 'shared-card-label';
      sharedLabel.textContent = 'Delad favorit';
      card.appendChild(sharedLabel);
    }

    const timeLine = document.createElement('div');
    timeLine.className = 'line time-line';

    const startValue = formatLocalClockTime(ev.start || ev.startTime || ev.startTimeText || ev.time || '—');
    const endValue = ev.end || ev.endTime || ev.endTimeText ? formatLocalClockTime(ev.end || ev.endTime || ev.endTimeText) : null;
    const timeText = endValue ? `${startValue}–${endValue}` : startValue;
    const isFinished = isFinishedEvent(ev);
    card.classList.toggle('finished', isFinished);

    const timeLabel = document.createElement('span');
    timeLabel.textContent = timeText;

    const eventStatus = ev.isCancelled ? '(INSTÄLLT)' : isFinished ? '(AVSLUTAT)' : null;
    if (eventStatus) {
      const statusLabel = document.createElement('span');
      statusLabel.className = 'event-status';
      statusLabel.textContent = eventStatus;
      timeLine.appendChild(statusLabel);
    }

    const titleText = document.createElement('span');
    titleText.className = 'event-title';
    const eventTitle = ev.title || ev.name || ev.displayName || 'Untitled';
    titleText.textContent = eventTitle;

    const titleGroup = document.createElement('span');
    titleGroup.className = 'event-title-group';
    titleGroup.appendChild(titleText);
    if ((activeTab === 'shared' || activeTab.startsWith('shared:')) && sharedFavorites?.[ev.favoriteId]) {
      const sharedRating = document.createElement('span');
      const rating = sharedFavorites[ev.favoriteId];
      sharedRating.className = 'shared-rating';
      sharedRating.textContent = `(${rating} ${rating === 1 ? 'stjärna' : 'stjärnor'})`;
      sharedRating.title = `${sharedOwnerName}s betyg: ${rating} ${rating === 1 ? 'stjärna' : 'stjärnor'}`;
      sharedRating.setAttribute('aria-label', `${sharedOwnerName}s betyg: ${rating} ${rating === 1 ? 'stjärna' : 'stjärnor'}`);
      titleGroup.appendChild(sharedRating);
    }

    const titleLine = document.createElement('div');
    titleLine.className = 'line';
    titleLine.appendChild(titleGroup);

    timeLine.prepend(timeLabel);

    const parentTitle = ev.parentTitle || ev.parent || ev.groupTitle;
    let parentLine = null;
    if (parentTitle && !(parentTitle === eventTitle && parentTitle === (ev.locationAlias || ev.locationName || ev.location || '—'))) {
      parentLine = document.createElement('div');
      parentLine.className = 'line secondary';
      parentLine.textContent = parentTitle;
    }

    const locationAlias = ev.locationAlias || ev.locationName || ev.location || '—';
    const locationLine = document.createElement('div');
    locationLine.className = 'line secondary';
    const hideLocationAlias = locationAlias === eventTitle || (parentLine && parentTitle === locationAlias);
    if (!hideLocationAlias) {
      locationLine.textContent = locationAlias;
    }

    const tags = document.createElement('div');
    tags.className = 'tag-row';
    const categoryNames = Array.isArray(ev.categoryNames) ? ev.categoryNames : [];
    if (categoryNames.length === 0 && ev.categoryName) {
      categoryNames.push(ev.categoryName);
    }

    if (SHOW_CATEGORIES_IN_LIST && categoryNames.length > 0) {
      tags.classList.add('has-tags');
    }

    for (const category of SHOW_CATEGORIES_IN_LIST ? categoryNames : []) {
      tags.appendChild(createCategoryChip(category));
    }
    if (SHOW_CATEGORIES_IN_LIST && categoryNames.length > 0) {
      const searchTitle = eventTitle
        .replace(/\([^)]*\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const searchLinks = document.createElement('span');
      searchLinks.className = 'search-links';

      const facebookSearchLink = document.createElement('a');
      facebookSearchLink.className = 'facebook-search-link';
      facebookSearchLink.href = `https://www.facebook.com/search/top/?${new URLSearchParams({ q: searchTitle })}`;
      facebookSearchLink.target = '_blank';
      facebookSearchLink.rel = 'noopener noreferrer';
      facebookSearchLink.setAttribute('aria-label', `Sök efter ${searchTitle} på Facebook`);
      facebookSearchLink.title = 'Sök på Facebook';
      facebookSearchLink.innerHTML = '<i class="fa-brands fa-facebook-f" aria-hidden="true"></i>';
      searchLinks.appendChild(facebookSearchLink);

      const spotifySearchLink = document.createElement('a');
      spotifySearchLink.className = 'spotify-search-link';
      spotifySearchLink.href = `https://open.spotify.com/search/${encodeURIComponent(searchTitle)}/artists`;
      spotifySearchLink.target = '_blank';
      spotifySearchLink.rel = 'noopener noreferrer';
      spotifySearchLink.setAttribute('aria-label', `Sök efter ${searchTitle} på Spotify`);
      spotifySearchLink.title = 'Sök på Spotify';
      spotifySearchLink.innerHTML = '<i class="fa-brands fa-spotify" aria-hidden="true"></i>';
      searchLinks.appendChild(spotifySearchLink);

      const youtubeSearchLink = document.createElement('a');
      youtubeSearchLink.className = 'youtube-search-link';
      youtubeSearchLink.href = `https://www.youtube.com/results?${new URLSearchParams({ search_query: searchTitle })}`;
      youtubeSearchLink.target = '_blank';
      youtubeSearchLink.rel = 'noopener noreferrer';
      youtubeSearchLink.setAttribute('aria-label', `Sök efter ${searchTitle} på YouTube`);
      youtubeSearchLink.title = 'Sök på YouTube';
      youtubeSearchLink.innerHTML = '<i class="fa-brands fa-youtube" aria-hidden="true"></i>';
      searchLinks.appendChild(youtubeSearchLink);

      const googleSearchLink = document.createElement('a');
      googleSearchLink.className = 'google-search-link';
      googleSearchLink.href = `https://www.google.com/search?${new URLSearchParams({ q: `${searchTitle} uppsala kulturnatt` })}`;
      googleSearchLink.target = '_blank';
      googleSearchLink.rel = 'noopener noreferrer';
      googleSearchLink.setAttribute('aria-label', `Sök efter ${searchTitle} på Google`);
      googleSearchLink.title = 'Sök på Google';
      googleSearchLink.innerHTML = '<i class="fa-brands fa-google" aria-hidden="true"></i>';
      searchLinks.appendChild(googleSearchLink);
      tags.appendChild(searchLinks);
    }

    const myid = ev.favoriteId;
    const rating = favorites[myid] || 0;
    const ratingControl = document.createElement('span');
    ratingControl.className = 'favorite-rating';
    ratingControl.setAttribute('role', 'group');
    ratingControl.setAttribute('aria-label', 'Ditt betyg för favorit');
    for (let value = 1; value <= 3; value += 1) {
      const star = document.createElement('button');
      star.type = 'button';
      star.className = 'star';
      star.setAttribute('aria-label', `${value} ${value === 1 ? 'stjärna' : 'stjärnor'}`);
      star.title = `Ditt betyg: ${value} ${value === 1 ? 'stjärna' : 'stjärnor'}`;
      star.setAttribute('aria-pressed', String(rating === value));
      star.classList.toggle('inactive', value > rating);
      star.innerHTML = value <= rating ? '<i class="fa-solid fa-star" aria-hidden="true"></i>' : '<i class="fa-sharp fa-regular fa-star" aria-hidden="true"></i>';
      star.addEventListener('click', (event) => {
        event.stopPropagation();
        const current = loadFavorites();
        current[myid] = value;
        saveFavorites(current);
        updateTabCounts();
        setActive(activeTab);
      });
      ratingControl.appendChild(star);
    }
    if (rating > 0) {
      const removeFavoriteButton = document.createElement('button');
      removeFavoriteButton.type = 'button';
      removeFavoriteButton.className = 'favorite-remove';
      removeFavoriteButton.setAttribute('aria-label', `Ta bort ${eventTitle} från favoriter`);
      removeFavoriteButton.title = 'Ta bort favorit';
      removeFavoriteButton.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
      removeFavoriteButton.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (!(await confirmAction('Vill du ta bort evenemanget från dina favoriter?'))) return;
        removeFavorite(myid);
        updateTabCounts();
        setActive(activeTab);
      });
      ratingControl.appendChild(removeFavoriteButton);
    }
    titleGroup.appendChild(ratingControl);
    titleLine.title = `${timeText} ${titleText.textContent}`;

    let details = null;

    card.setAttribute('aria-expanded', 'false');
    const toggleDetails = () => {
      if (!details) {
        details = createEventDetails(ev, eventTitle);
        if (!details) return;
        card.appendChild(details);
        card.details = details;
      }
      if (details.hidden && openCard && openCard !== card) {
        openCard.details.hidden = true;
        openCard.setAttribute('aria-expanded', 'false');
      }
      details.hidden = !details.hidden;
      card.setAttribute('aria-expanded', String(!details.hidden));
      openCard = details.hidden ? null : card;
      if (!details.hidden) {
        const offset = $header.getBoundingClientRect().height + 4;
        const cardTop = card.getBoundingClientRect().top;
        if (cardTop < offset || cardTop > window.innerHeight) {
          window.scrollTo({ top: cardTop + window.scrollY - offset, behavior: 'smooth' });
        }
      }
    };
    card.addEventListener('click', (event) => {
      if (event.target.closest('a, .star, .favorite-remove')) return;
      toggleDetails();
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleDetails();
      }
    });

    card.appendChild(timeLine);
    card.appendChild(titleLine);
    if (parentLine) card.appendChild(parentLine);
    if (locationLine.textContent) card.appendChild(locationLine);
    const updatedStatus = formatUpdatedStatus(ev);
    if (programSortMode === 'updated' && updatedStatus) {
      const updatedLine = document.createElement('div');
      updatedLine.className = 'line secondary';
      updatedLine.textContent = updatedStatus;
      card.appendChild(updatedLine);
    }
    card.appendChild(tags);
    fragment.appendChild(card);
  }
  $list.appendChild(fragment);
  updateSearchLinkMargins();
}

function updateSearchLinkMargins() {
  for (const searchLinks of $list.querySelectorAll('.search-links')) {
    const previousElement = searchLinks.previousElementSibling;
    const isNewLine = previousElement && searchLinks.offsetTop > previousElement.offsetTop;
    searchLinks.classList.toggle('is-new-line', Boolean(isNewLine));
  }
}

function setActive(tab) {
  if (!tab.startsWith('shared:')) {
    shareUnsubscribe?.();
    shareUnsubscribe = null;
  }
  if (!missingSharedId) {
    $list.hidden = false;
    $listSubheaderRow.hidden = false;
  }
  activeTab = tab;
  $tabSelect.value = tab;
  $tabSelect.classList.toggle('is-shared', tab === 'shared' || tab.startsWith('shared:'));
  $activeTabHeading.textContent = `${tabIcon(tab)} ${tabTooltip(tab)}`;
  const isSharedTab = tab === 'shared' || tab.startsWith('shared:');
  const sharedEventCount = Object.keys(sharedFavorites || {}).length;
  const tabInformation = isSharedTab
    ? `${sharedOwnerName}s favoritevenemang som har delats med dig. Listan uppdateras automatiskt när ${sharedOwnerName} lägger till eller tar bort favoriter. Du hittar tillbaka hit via menyn ovan.`
    : {
        program: 'Glöm inte att även titta på delevenemang i menyn ovan. Dessa programpunkter har identifierats i evenemangets beskrivning och gör det enklare att hitta favoritevenemang.',
        subevents: 'Nedan visas programpunkter som har identifierats i evenemangets beskrivning. Kategorin kan vara felaktig eftersom den baseras på texttolkning.',
        recent: 'Evenemang som har startat de senaste 15 minuterna.',
        soon: 'Evenemang som startar inom de närmaste 45 minuterna.',
        later: 'Evenemang som startar senare i dag.',
        live: 'Evenemang som pågår just nu.',
        favorites: 'Dina favoritevenemang, betygsatta med 1–3 stjärnor. Favoritval kan tas bort via papperskorgsikonen.',
        unfinished: 'Evenemang som pågår eller ännu inte har startat.',
      }[tab] || '';
  $tabInformation.textContent = tabInformation;
  $tabInformation.hidden = !tabInformation;
  $removeShared.hidden = !isSharedTab;
  if (isSharedTab) $activeTabHeading.textContent = `\u{1F517} Delade favoritevenemang från ${sharedOwnerName} (${sharedEventCount} st)`;
  updateProgramSortControls();
  const favs = loadFavorites();
  const now = eventCurrentTime();
  let events = [];
  if (tab === 'program') {
    events = sortProgramEvents(allEvents.filter((event) => !event.isCancelled && event.type === 'event'));
  } else if (tab === 'subevents') {
    events = sortProgramEvents(allEvents.filter((event) => !event.isCancelled && event.type === 'subEvent'));
  } else if (tab === 'cancelled') {
    events = allEvents.filter((event) => event.isCancelled);
  } else if (tab === 'favorites') {
    events = favoriteEvents(favs);
  } else if (tab === 'shared' || tab.startsWith('shared:')) {
    events = sortSharedFavoriteEvents(
      allEvents.filter((event) => sharedFavorites?.[event.favoriteId]),
      favs,
      sharedFavorites,
    );
  } else if (tab === 'live') {
    events = liveEvents(allEvents, now);
  } else if (tab === 'recent') {
    events = eventsInWindow(allEvents, now - RECENT_EVENT_WINDOW_MS, now);
  } else if (tab === 'soon') {
    events = eventsInWindow(allEvents, now, now + SOON_EVENT_WINDOW_MS);
  } else if (tab === 'later') {
    events = laterEvents(allEvents, now + SOON_EVENT_WINDOW_MS);
  } else if (tab === 'finished') {
    events = allEvents.filter((event) => isFinishedEvent(event, now));
  } else if (tab === 'unfinished') {
    events = allEvents.filter((event) => !event.isCancelled && !isFinishedEvent(event, now));
  }
  events = visibleByFinishedToggle(events, tab, now);
  const filteredEvents = events.filter(matchesActiveFilters);
  updateSelectedFilters(filteredEvents.length);
  renderList(filteredEvents, favs);
}

$tabSelect.addEventListener('change', async () => {
  const tab = $tabSelect.value;
  if (tab.startsWith('shared:')) {
    const id = tab.slice('shared:'.length);
    try {
      await subscribeToSharedFavorites(id);
      setActive(tab);
    } catch (error) {
      showError(error?.message || 'Delade favoriter kunde inte laddas.');
    }
    return;
  }
  setActive(tab);
});
$shareFavorites.addEventListener('click', () => {
  updateShareDialog();
  $shareDialog.showModal();
  requestAnimationFrame(() => {
    if (!$shareName.disabled && !$shareName.value.trim()) $shareName.focus();
    else $shareClose.focus();
  });
});
$shareClose.addEventListener('click', () => $shareDialog.close());
$shareDialog.addEventListener('click', (event) => {
  if (event.target === $shareDialog) $shareDialog.close();
});
$shareCopy.addEventListener('click', copyFavorites);
$shareNameSave.addEventListener('click', saveShareName);
$shareNameEdit.addEventListener('click', () => {
  $shareName.disabled = false;
  $shareNameEdit.hidden = true;
  $shareNameSave.hidden = false;
  $shareName.focus();
});
$shareName.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') saveShareName();
});
$shareName.addEventListener('input', updateShareNameGate);
$removeShared.addEventListener('click', async () => {
  if (!(await confirmAction(`Vill du ta bort ${sharedOwnerName}s delade favoriter från den här vyn?`))) return;
  const sharedUserId = activeTab.startsWith('shared:') ? activeTab.slice('shared:'.length) : sharedPageId;
  if (sharedUserId) {
    sharedUsers = sharedUsers.filter((user) => user.id !== sharedUserId);
    localStorage.setItem('sharedUsers', JSON.stringify(sharedUsers));
    const sharedTab = tabs[`shared:${sharedUserId}`];
    sharedTab?.remove();
    delete tabs[`shared:${sharedUserId}`];
    scheduleCloudSettingsSync();
  }
  sharedFavorites = null;
  setActive('program');
});
$shareLinkCopy.addEventListener('click', copyShareLink);
$infoButton.addEventListener('click', () => {
  $infoDialog.showModal();
});
$infoClose.addEventListener('click', () => $infoDialog.close());
$infoDialog.addEventListener('click', (event) => {
  if (event.target === $infoDialog) $infoDialog.close();
});
$errorClose.addEventListener('click', () => $errorDialog.close());
$errorDialog.addEventListener('click', (event) => {
  if (event.target === $errorDialog) $errorDialog.close();
});
$confirmDialog.addEventListener('click', (event) => {
  if (event.target === $confirmDialog) $confirmDialog.close('cancel');
});
$finishedVisibilityToggle.addEventListener('click', () => {
  hideFinishedEvents = !hideFinishedEvents;
  localStorage.setItem('hideFinishedEvents', String(hideFinishedEvents));
  scheduleCloudSettingsSync();
  updateFinishedVisibilityToggle();
  updateTabCounts();
  setActive(activeTab);
});
$themeToggle.addEventListener('click', () => {
  setTheme(document.body.dataset.theme === 'light' ? 'dark' : 'light');
});
$loginButton.addEventListener('click', async () => {
  if (!(await ensureFirebaseAuthentication())) return;
  if (firebaseUser) {
    const willOpen = $userMenu.hidden;
    $userMenu.hidden = !willOpen;
    $loginButton.setAttribute('aria-expanded', String(willOpen));
    return;
  }

  openAuthenticationDialog();
});
$syncLoginLink.addEventListener('click', (event) => {
  event.preventDefault();
  if (firebaseUser) return;
  ensureFirebaseAuthentication().then((isReady) => {
    if (isReady && !firebaseUser) openAuthenticationDialog();
  });
});
$logoutButton.addEventListener('click', async () => {
  if (!firebaseAuth) return;
  try {
    await firebaseAuth.signOut();
    $userMenu.hidden = true;
    $loginButton.setAttribute('aria-expanded', 'false');
  } catch (error) {
    console.error('Firebase sign-out failed:', error);
    showError(`Utloggningen misslyckades: ${error?.message || error}`);
  }
});
$removeUserData.addEventListener('click', removeUserData);
$authClose.addEventListener('click', () => $authDialog.close());
$authDialog.addEventListener('click', (event) => {
  if (event.target === $authDialog) $authDialog.close();
});
$authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!(await ensureFirebaseAuthentication())) return;

  const action = event.submitter?.value;
  const email = $authEmail.value.trim();
  const password = $authPassword.value;
  try {
    showAuthMessage('Väntar...');
    if (action === 'register') {
      await firebaseAuth.createUserWithEmailAndPassword(email, password);
    } else {
      await firebaseAuth.signInWithEmailAndPassword(email, password);
    }
    $authDialog.close();
  } catch (error) {
    console.error('Firebase email authentication failed:', error);
    showAuthMessage(error?.message || 'Inloggningen misslyckades.');
  }
});
$googleLoginButton.addEventListener('click', async () => {
  if (!(await ensureFirebaseAuthentication())) return;
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await firebaseAuth.signInWithPopup(provider);
    $authDialog.close();
  } catch (error) {
    console.error('Firebase Google authentication failed:', error);
    showAuthMessage(error?.message || 'Google-inloggningen misslyckades.');
  }
});
$programSortStart.addEventListener('click', () => {
  if (activeTab === 'favorites') favoritesSortMode = 'start';
  else if (activeTab === 'shared' || activeTab.startsWith('shared:')) sharedFavoritesSortMode = 'start';
  else programSortMode = 'start';
  updateProgramSortControls();
  setActive(activeTab);
});
$programSortSeen.addEventListener('click', () => {
  if (activeTab === 'favorites') favoritesSortMode = 'stars';
  else if (activeTab === 'shared' || activeTab.startsWith('shared:')) sharedFavoritesSortMode = 'mine';
  else programSortMode = 'updated';
  updateProgramSortControls();
  setActive(activeTab);
});
$programSortShared.addEventListener('click', () => {
  if (activeTab === 'shared' || activeTab.startsWith('shared:')) sharedFavoritesSortMode = 'owner';
  updateProgramSortControls();
  setActive(activeTab);
});
$showFilters.addEventListener('click', () => {
  if ($filterSearchSection.open) {
    closeFilters();
    return;
  }
  $filterSearchSection.showModal();
  positionFiltersDialog();
  requestAnimationFrame(clearActiveFocus);
  $showFilters.setAttribute('aria-expanded', 'true');
  $showFilters.setAttribute('aria-pressed', 'true');
  updateShowFiltersButton();
});
$favoritesShortcut.addEventListener('click', () => setActive('favorites'));
$closeFilters.addEventListener('click', closeFilters);
$closeFiltersBottom.addEventListener('click', closeFilters);
$filterSearchSection.addEventListener('close', () => {
  $showFilters.setAttribute('aria-expanded', 'false');
  $showFilters.setAttribute('aria-pressed', 'false');
  updateShowFiltersButton();
});
$filterSearchSection.addEventListener('click', (event) => {
  if (event.target === $filterSearchSection) closeFilters();
});
window.addEventListener('resize', () => {
  if ($filterSearchSection.open) positionFiltersDialog();
  updateSearchLinkMargins();
});
$search.addEventListener('input', () => {
  updateClearFiltersButton();
  updateFilterCount();
  setActive(activeTab);
});
$childrenFilter.addEventListener('change', () => {
  if ($childrenFilter.checked) $adultsFilter.checked = false;
  updateClearFiltersButton();
  updateFilterCount();
  setActive(activeTab);
});
$adultsFilter.addEventListener('change', () => {
  if ($adultsFilter.checked) $childrenFilter.checked = false;
  updateClearFiltersButton();
  updateFilterCount();
  setActive(activeTab);
});
$freeFilter.addEventListener('change', () => {
  if ($freeFilter.checked) $paidFilter.checked = false;
  updateClearFiltersButton();
  updateFilterCount();
  setActive(activeTab);
});
$paidFilter.addEventListener('change', () => {
  if ($paidFilter.checked) $freeFilter.checked = false;
  updateClearFiltersButton();
  updateFilterCount();
  setActive(activeTab);
});
for (const timeFilter of [$fromFilter, $toFilter]) {
  timeFilter.addEventListener('input', () => {
    updateClearFiltersButton();
    updateFilterCount();
    setActive(activeTab);
  });
}
$clearFilters.addEventListener('click', () => {
  $search.value = '';
  $childrenFilter.checked = false;
  $adultsFilter.checked = false;
  $freeFilter.checked = false;
  $paidFilter.checked = false;
  $fromFilter.value = '';
  $toFilter.value = '';
  for (const filter of multiFilters) {
    for (const input of filter.options.querySelectorAll('input')) input.checked = input.value === 'all';
    filter.menu.open = false;
    updateFilterSummary(filter);
  }
  updateClearFiltersButton();
  updateFilterCount();
  setActive(activeTab);
});
document.addEventListener('click', (event) => {
  for (const filter of multiFilters) {
    if (filter.menu.open && !event.composedPath().includes(filter.menu)) filter.menu.open = false;
  }
  if (!$userMenu.hidden && !event.composedPath().includes($loginButton) && !event.composedPath().includes($userMenu)) {
    $userMenu.hidden = true;
    $loginButton.setAttribute('aria-expanded', 'false');
  }
});
for (const filter of multiFilters) {
  filter.options.addEventListener('change', (event) => {
    const changedInput = event.target;
    if (!(changedInput instanceof HTMLInputElement)) return;

    const allOption = filter.options.querySelector('input[value="all"]');
    const namedOptions = Array.from(filter.options.querySelectorAll('input:not([value="all"])'));
    if (changedInput.value === 'all' && changedInput.checked) {
      for (const input of namedOptions) input.checked = false;
    } else if (changedInput.checked && allOption) {
      allOption.checked = false;
    } else if (!namedOptions.some((input) => input.checked) && allOption) {
      allOption.checked = true;
    }
    updateFilterSummary(filter);
    updateClearFiltersButton();
    updateFilterCount();
    setActive(activeTab);
  });
}

async function main() {
  try {
    setStatus('Hämtar evenemang…');
    populateHourFilter($fromFilter);
    populateHourFilter($toFilter);
    const res = await fetch(DATA_PATH);
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    const json = await res.json();
    const events = json && Array.isArray(json.events) ? json.events : Array.isArray(json) ? json : [];
    allEvents = events.map(normalizeEvent).sort((a, b) => a.startMs - b.startMs);
    populateMultiFilter(multiFilters[0], Array.isArray(json?.categories) ? json.categories : []);
    populateMultiFilter(multiFilters[1], Array.isArray(json?.languages) ? json.languages : []);
    populateMultiFilter(multiFilters[2], Array.isArray(json?.locations) ? json.locations : []);
    populateMultiFilter(multiFilters[3], Array.isArray(json?.accessibilities) ? json.accessibilities : []);
    updateFinishedVisibilityToggle();
    updateClearFiltersButton();
    updateFilterCount();
    updateTabCounts();
    sharedUsers.forEach((user) => addSharedTab(user.id, user.name));
    setStatus();
    setActive('program');
    if (!missingSharedId) $listSubheaderRow.hidden = false;
  } catch (err) {
    showError('Failed to load events: ' + (err && err.message ? err.message : String(err)));
    console.error(err);
  }
}

main().finally(scheduleFirebaseIdleLoad);
