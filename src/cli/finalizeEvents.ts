#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { finalizeEvents } from '../finalizeEvents';

function parseArgs() {
  const argv = process.argv.slice(2);
  let merged: string | undefined;
  let filters: string | undefined;
  let out: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--merged' && argv[i + 1]) {
      merged = argv[i + 1];
      i++;
    } else if (a === '--filters' && argv[i + 1]) {
      filters = argv[i + 1];
      i++;
    } else if (a === '--out' && argv[i + 1]) {
      out = argv[i + 1];
      i++;
    }
  }
  return { merged, filters, out };
}

function eventId(event: any) {
  return event && (event.id ?? event.externalId ?? event.value ?? event.eventId) ? String(event.id ?? event.externalId ?? event.value ?? event.eventId) : null;
}

function readHistoricEvents(historicPath: string) {
  const events = fs.existsSync(historicPath) ? JSON.parse(fs.readFileSync(historicPath, 'utf8')) : [];
  if (!Array.isArray(events)) throw new Error(`Expected ${historicPath} to contain a list of events`);

  const byId = new Map<string, { event: any; index: number }>();
  events.forEach((event, index) => {
    const id = eventId(event);
    if (id) byId.set(id, { event, index });
  });
  return { events, byId };
}

const HISTORIC_CHANGE_PROPERTIES = ['title', 'about', 'startTime', 'endTime', 'locationId'];

function historicChangedProperties(event: any, historicEvent: any) {
  return HISTORIC_CHANGE_PROPERTIES.filter((property) => event?.[property] !== historicEvent?.[property]);
}

function timestampValue(value: any) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function compareDefault(first: any, second: any) {
  const firstStart = Date.parse(first.startTime);
  const secondStart = Date.parse(second.startTime);
  const firstStartValue = Number.isNaN(firstStart) ? Number.POSITIVE_INFINITY : firstStart;
  const secondStartValue = Number.isNaN(secondStart) ? Number.POSITIVE_INFINITY : secondStart;
  if (firstStartValue !== secondStartValue) return firstStartValue - secondStartValue;

  const firstEnd = Date.parse(first.endTime);
  const secondEnd = Date.parse(second.endTime);
  const firstDuration = Number.isNaN(firstStart) || Number.isNaN(firstEnd) ? Number.POSITIVE_INFINITY : firstEnd - firstStart;
  const secondDuration = Number.isNaN(secondStart) || Number.isNaN(secondEnd) ? Number.POSITIVE_INFINITY : secondEnd - secondStart;
  if (firstDuration !== secondDuration) return firstDuration - secondDuration;

  return String(first.title ?? '').localeCompare(String(second.title ?? ''), 'sv');
}

function compareUpdated(first: any, second: any) {
  const updatedDiff = timestampValue(second.updated) - timestampValue(first.updated);
  return updatedDiff || compareDefault(first, second);
}

function assignSortKeys(events: any[]) {
  events.sort(compareDefault).forEach((event, index) => {
    event.sortKeyTime = index + 1;
  });

  events.sort(compareUpdated).forEach((event, index) => {
    event.sortKeyUpdated = index + 1;
  });

  events.sort(compareDefault);
}

function normalizedTitle(event: any) {
  return String(event?.title ?? '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}]/gu, '');
}

function normalizedText(value: any) {
  return String(value ?? '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}]/gu, '');
}

function addMusicCategories(events: any[]) {
  const musicPath = path.resolve(__dirname, '..', '..', 'config', 'music.json');
  const musicConfig = JSON.parse(fs.readFileSync(musicPath, 'utf8'));
  if (!Array.isArray(musicConfig)) throw new Error(`Expected ${musicPath} to contain a list of music categories`);

  const musicEntries = musicConfig.flatMap((entry: any) => {
    if (!entry || typeof entry !== 'object') return [];
    return Object.entries(entry).map(([title, categories]) => ({
      title: normalizedText(title),
      categories: Array.isArray(categories) ? categories : [],
    }));
  });

  for (const event of events) {
    const title = normalizedText(event.title);
    const matches = musicEntries.filter((entry) => title === entry.title || title.includes(entry.title) || entry.title.includes(title)).sort((first, second) => second.title.length - first.title.length);
    event.musicCategoryNames = matches[0]?.categories ?? [];
  }

  return events;
}

function normalizedStartTime(event: any) {
  const value = event?.startTime;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? String(value ?? '') : String(parsed);
}

function hasSubEventDescription(event: any) {
  return String(event?.aboutSubEvent ?? '').trim().length > 0;
}

function aboutLength(event: any) {
  return String(event?.about ?? '').length;
}

function removeDuplicateEvents(events: any[]) {
  const byTitleAndStartTime = new Map<string, any[]>();
  for (const event of events) {
    const title = normalizedTitle(event);
    if (!title) continue;
    const key = `${title}|${normalizedStartTime(event)}`;
    const group = byTitleAndStartTime.get(key);
    if (group) group.push(event);
    else byTitleAndStartTime.set(key, [event]);
  }

  const duplicates: any[] = [];
  let numUniqueDuplicateEvents = 0;
  const winners = new Set<any>();
  for (const group of byTitleAndStartTime.values()) {
    if (group.length < 2) {
      winners.add(group[0]);
      continue;
    }

    let best = group.find(hasSubEventDescription);
    if (!best) {
      best = group[0];
      for (const event of group.slice(1)) {
        if (aboutLength(event) > aboutLength(best)) best = event;
      }
    }
    duplicates.push(...group.filter((event) => event !== best));
    numUniqueDuplicateEvents++;
    winners.add(best);
  }

  return {
    duplicates,
    numUniqueDuplicateEvents,
    events: events.filter((event) => winners.has(event) || !normalizedTitle(event)),
  };
}

function findLikelyDuplicateGroups(events: any[]) {
  const byTitleAndStartTime = new Map<string, any[]>();
  for (const event of events) {
    const title = normalizedTitle(event);
    if (!title) continue;
    const key = `${title}|${normalizedStartTime(event)}`;
    const group = byTitleAndStartTime.get(key);
    if (group) group.push(event);
    else byTitleAndStartTime.set(key, [event]);
  }

  return Array.from(byTitleAndStartTime.values())
    .filter((group) => group.length >= 2)
    .map((group) =>
      group.map((event) => ({
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        about: event.about,
        id: event.id,
        type: event.type,
      })),
    );
}

function titleSimilarity(first: string, second: string) {
  if (!first || !second) return 0;
  if (first === second) return 1;

  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let row = 1; row <= first.length; row++) {
    const current = [row];
    for (let column = 1; column <= second.length; column++) {
      current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + (first[row - 1] === second[column - 1] ? 0 : 1));
    }
    previous.splice(0, previous.length, ...current);
  }

  return 1 - previous[second.length] / Math.max(first.length, second.length);
}

function localizedTimeString(value: any) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function scoreDuplicateLikelihood(events: any[]) {
  const byStartTime = new Map<string, any[]>();
  for (const event of events) {
    const startTime = normalizedStartTime(event);
    if (!startTime) continue;
    const group = byStartTime.get(startTime);
    if (group) group.push(event);
    else byStartTime.set(startTime, [event]);
  }

  return events
    .map((event) => {
      const title = normalizedTitle(event);
      const peers = byStartTime.get(normalizedStartTime(event)) ?? [];
      const duplicateScore = peers.reduce((bestScore, peer) => {
        if (peer === event) return bestScore;
        return Math.max(bestScore, titleSimilarity(title, normalizedTitle(peer)));
      }, 0);

      return {
        duplicateScore: Math.round(duplicateScore * 100),
        title: event.title ?? '',
        startTime: localizedTimeString(event.startTime),
        endTime: localizedTimeString(event.endTime),
        type: event.type ?? '',
        id: event.id ?? '',
        aboutShort: event.aboutShort ?? '',
        about: event.about ?? '',
      };
    })
    .sort((first, second) => second.duplicateScore - first.duplicateScore);
}

async function main() {
  const args = parseArgs();
  const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
  const mergedPath = args.merged ?? path.join(DATA_DIR, 'mergedEvents.json');
  const filtersPath = args.filters ?? path.join(DATA_DIR, 'filters.json');
  const outPath = args.out ?? path.join(DATA_DIR, 'finalizedEvents.json');
  const historicPath = path.join(DATA_DIR, 'historic.json');

  if (!fs.existsSync(mergedPath)) {
    console.error('Missing merged events file:', mergedPath);
    process.exit(2);
  }
  if (!fs.existsSync(filtersPath)) {
    console.error('Missing filters file:', filtersPath);
    process.exit(2);
  }

  try {
    const merged = JSON.parse(fs.readFileSync(mergedPath, 'utf8'));
    const filters = JSON.parse(fs.readFileSync(filtersPath, 'utf8'));
    const finalizedBeforeDeduplication = finalizeEvents(merged, filters);
    const { duplicates, numUniqueDuplicateEvents, events: finalized } = removeDuplicateEvents(finalizedBeforeDeduplication);
    const configuredDuplicatesPath = path.resolve(__dirname, '..', '..', 'config', 'duplicates.json');
    const configuredDuplicates = fs.existsSync(configuredDuplicatesPath) ? JSON.parse(fs.readFileSync(configuredDuplicatesPath, 'utf8')) : [];
    if (!Array.isArray(configuredDuplicates)) throw new Error(`Expected ${configuredDuplicatesPath} to contain a list of events`);
    const configuredDuplicateIds = new Set(configuredDuplicates.map((event: any) => event?.id).filter((id: any): id is string => typeof id === 'string' && id.length > 0));
    const removedConfiguredDuplicates = finalized.filter((event) => configuredDuplicateIds.has(String(event.id)));
    finalized.splice(0, finalized.length, ...finalized.filter((event) => !configuredDuplicateIds.has(String(event.id))));
    console.log(
      'Configured duplicate filtering:',
      JSON.stringify(
        {
          path: configuredDuplicatesPath,
          configuredIds: configuredDuplicateIds.size,
          matched: removedConfiguredDuplicates.length,
          removed: removedConfiguredDuplicates.map((event) => ({ id: event.id, title: event.title })),
        },
        null,
        2,
      ),
    );
    const historic = readHistoricEvents(historicPath);
    for (const event of finalized) {
      const id = eventId(event);
      const historicMatch = id ? historic.byId.get(id) : undefined;

      if (!historicMatch) {
        event.created = event.checked;
        event.updated = event.checked;
        event.status = 'new';
        event.updateStatus = 'new';
        historic.events.push(event);
        if (id) historic.byId.set(id, { event, index: historic.events.length - 1 });
        continue;
      }

      const historicEvent = historicMatch.event;
      event.created = historicEvent.created;
      event.updated = historicEvent.updated;
      event.status = 'old';

      if (event.created === event.updated) {
        event.updateStatus = 'created';
      } else {
        event.updateStatus = 'updated';
      }

      // TODO: merge .status and .updateStatus

      const changedProperties = historicChangedProperties(event, historicEvent);
      if (changedProperties.length > 0) {
        event.status = 'updated';
        event.updated = event.checked;
        event.updateStatus = 'updated';
        console.log(
          'Updated event detected:',
          JSON.stringify(
            {
              id,
              changedProperties,
              currentEvent: event,
              historicEvent,
            },
            null,
            2,
          ),
        );
        historic.events[historicMatch.index] = event;
        if (id) historic.byId.set(id, { event, index: historicMatch.index });
      }
    }
    assignSortKeys(finalized);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    addMusicCategories(finalized);
    const musicCategoryMatches = finalized
      .filter((event) => Array.isArray(event.categoryNames) && event.categoryNames.some((category: any) => /^(music|musik)$/i.test(String(category))))
      .map((event) => ({
        title: event.title,
        musicCategoryNames: event.musicCategoryNames,
      }))
      .sort((first, second) => {
        const firstMatched = first.musicCategoryNames.length > 0 ? 1 : 0;
        const secondMatched = second.musicCategoryNames.length > 0 ? 1 : 0;
        return secondMatched - firstMatched;
      });
    const musicCategoryMatchPath = path.join(path.dirname(outPath), 'musicCategoryMatch.json');
    fs.writeFileSync(musicCategoryMatchPath, JSON.stringify(musicCategoryMatches, null, 2), 'utf8');
    console.log('Wrote', musicCategoryMatchPath, ' —', musicCategoryMatches.length, 'music events,', musicCategoryMatches.filter((event) => event.musicCategoryNames.length > 0).length, 'matched');
    const scoredEventsPath = path.join(path.dirname(outPath), 'finalizedEventsDupScore.json');
    fs.writeFileSync(scoredEventsPath, JSON.stringify(scoreDuplicateLikelihood(finalized), null, 2), 'utf8');
    console.log('Wrote', scoredEventsPath, ' —', finalized.length, 'items');
    const likelyDuplicateGroups = findLikelyDuplicateGroups(finalized);
    const likelyDuplicatePath = path.join(path.dirname(outPath), 'likelyDuplicateEvents.json');
    fs.writeFileSync(
      likelyDuplicatePath,
      JSON.stringify(
        {
          numEvents: finalized.length,
          numLikelyDuplicateEvents: likelyDuplicateGroups.reduce((count, group) => count + group.length, 0),
          numUniqueLikelyDuplicateGroups: likelyDuplicateGroups.length,
          likelyDuplicateEvents: likelyDuplicateGroups,
        },
        null,
        2,
      ),
      'utf8',
    );
    console.log('Wrote', likelyDuplicatePath, ' —', likelyDuplicateGroups.length, 'groups');
    const duplicatePath = path.join(path.dirname(outPath), 'duplicateEvents.json');
    fs.writeFileSync(
      duplicatePath,
      JSON.stringify(
        {
          numEvents: finalizedBeforeDeduplication.length,
          uniqueEvents: finalized.length,
          numDuplicateEvents: duplicates.length,
          numUniqueDuplicateEvents,
          duplicateEvents: duplicates,
        },
        null,
        2,
      ),
      'utf8',
    );
    console.log('Wrote', duplicatePath, ' —', duplicates.length, 'items');
    fs.writeFileSync(historicPath, JSON.stringify(historic.events, null, 2), 'utf8');
    console.log('Wrote', historicPath, ' —', historic.events.length, 'items');
    fs.writeFileSync(outPath, JSON.stringify(finalized, null, 2), 'utf8');
    console.log('Wrote', outPath, ' —', finalized.length, 'items');
  } catch (err) {
    console.error('Failed to finalize events:', err && (err as any).stack ? (err as any).stack : String(err));
    process.exit(1);
  }
}

if (require.main === module) main();
