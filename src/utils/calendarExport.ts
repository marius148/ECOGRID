/**
 * Utility for exporting interventions to standard iCalendar (.ics) format
 * Compatible with Microsoft Outlook, Apple Calendar, Google Calendar, etc.
 */

import type { InterventionEvent } from '../components/InterventionsPlanningView';

function formatIcsDate(dateStr: string, hourFloat: number): string {
  // dateStr is "YYYY-MM-DD"
  const cleanDate = dateStr.replace(/-/g, '');
  const hours = Math.floor(hourFloat);
  const minutes = Math.round((hourFloat - hours) * 60);
  const hPad = hours.toString().padStart(2, '0');
  const mPad = minutes.toString().padStart(2, '0');
  return `${cleanDate}T${hPad}${mPad}00`;
}

export function generateInterventionIcs(event: InterventionEvent): string {
  const startStr = formatIcsDate(event.date, event.startHour);
  const endStr = formatIcsDate(event.date, event.endHour);
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const title = `[CII ENERGIE] ${event.title} - ${event.buildingName}`;
  const location = `${event.buildingName} - ${event.location}`;
  const description = [
    `Intervention CII ENERGIE`,
    `Site: ${event.buildingName}`,
    `Lieu: ${event.location}`,
    `Catégorie: ${event.category.toUpperCase()}`,
    `Statut: ${event.status}`,
    event.notes ? `Notes: ${event.notes}` : ''
  ].filter(Boolean).join('\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CII ENERGIE//Interventions Planning//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:cii-event-${event.id}-${startStr}@cii-energie.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export function downloadInterventionIcs(event: InterventionEvent): void {
  const icsContent = generateInterventionIcs(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = (event.title || 'intervention').replace(/[^a-zA-Z0-9]/g, '_');
  link.href = url;
  link.download = `CII_Intervention_${safeTitle}_${event.date}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadAllInterventionsIcs(events: InterventionEvent[]): void {
  if (events.length === 0) return;
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const vEvents = events.map(event => {
    const startStr = formatIcsDate(event.date, event.startHour);
    const endStr = formatIcsDate(event.date, event.endHour);
    const title = `[CII ENERGIE] ${event.title} - ${event.buildingName}`;
    const location = `${event.buildingName} - ${event.location}`;
    const description = [
      `Intervention CII ENERGIE`,
      `Site: ${event.buildingName}`,
      `Lieu: ${event.location}`,
      `Catégorie: ${event.category.toUpperCase()}`,
      `Statut: ${event.status}`,
      event.notes ? `Notes: ${event.notes}` : ''
    ].filter(Boolean).join('\\n');

    return [
      'BEGIN:VEVENT',
      `UID:cii-event-${event.id}-${startStr}@cii-energie.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    ].join('\r\n');
  }).join('\r\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CII ENERGIE//Interventions Planning//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    vEvents,
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CII_Planning_Complet_${new Date().toISOString().slice(0, 10)}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
