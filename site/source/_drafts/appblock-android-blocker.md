---
layout: post
title: "AppBlock, an Android Blocker Built on the Accessibility API"
tab_title: AppBlock
code: https://github.com/SadeekFarhan21/projects.farhansadeek.com/tree/main/appblock
date: 2026-07-03 19:38:37
tags:
  - android
  - kotlin
  - accessibility
  - digital-wellbeing
description: >-
  AppBlock is a fully local Android app and website blocker in about 2,100 lines
  of Kotlin that reads other apps' screens through one accessibility service, with
  no network permission and an APK of about 1 MB.
---

AppBlock blocks apps and websites on my Android phone on a schedule, and it does all of it on the phone. There's no account, no server and no network permission. It's a solo build of about 2,100 lines of Kotlin and Jetpack Compose that I built and released in a single day in July 2026, and the release APK is about 1 MB. **The whole blocker is one accessibility service that watches the screen, and most of the engineering went into reading other apps' interfaces correctly.** That covers knowing when a URL bar holds a real address rather than a half-typed one, finding the YouTube Shorts player by its view IDs, and making sure the block screen isn't dismissed by the app's own back press.

## Why It Matters

The popular blockers on the Play Store mostly work, but they want an account, push a subscription for features like schedules, and send usage data somewhere. A blocker is a simple idea. It needs to know what's in the foreground, compare it to a list, and cover it. I wanted that idea and nothing else, with all the data in local storage, so the app could ask for no internet access at all.

The feature set ended up small but complete.

- **Schedules** are named profiles with days of the week, a time window (or all day, including windows that cross midnight), a list of apps and a list of sites.
- **Quick Block** blocks everything in every schedule for 15 minutes to 2 hours with one tap.
- **Strict Mode** locks the setup for 1 hour to 7 days. While it's on you can't disable, edit or delete schedules or stop a Quick Block early.
- **Content Blocks** block YouTube Shorts and YouTube Music without blocking YouTube.
- **Insights** shows screen time and a count of blocked attempts.

## Technical Details

### One Service Sees Everything

Android doesn't let a normal app see which other app is open. An accessibility service can. It's the API screen readers use, so once the user enables it, it receives an event whenever a window changes and can read the view tree of whatever is on screen. AppBlock's service subscribes to two event types, window state changes and window content changes, and asks for view IDs to be reported.

```xml
<accessibility-service
    android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged"
    android:accessibilityFlags="flagDefault|flagReportViewIds|flagRetrieveInteractiveWindows"
    android:canRetrieveWindowContent="true"
    android:notificationTimeout="200" />
```

App blocking needs only the first event type. When a window comes to the foreground, the event carries its package name, and if that package is in an active schedule, the service launches a full-screen block activity over it.

Website blocking needs the second. A browser is one app, so the package name says nothing about the site. Instead, the service reads the browser's URL bar out of the view tree. Each browser names that view differently, so there's a table of 15 browser packages and their URL bar IDs: `url_bar` for Chrome and the Chromium family, `url_field` for Opera, `mozac_browser_toolbar_url_view` for Firefox, `omnibarTextInput` for DuckDuckGo, and so on.

### Matching a Host

URL bars rarely show a clean URL. They show `example.com/path` with no scheme, or a search query, or a domain with a port. So the service pulls out a candidate host and rejects anything that doesn't look like one.

```kotlin
private fun hostOf(url: String): String? {
    val candidate = url.substringAfter("://").substringBefore('/').substringBefore(':')
    if (candidate.isEmpty() || candidate.contains(' ') || !candidate.contains('.')) return null
    return candidate
}
```

A blocked site matches itself and every subdomain, so blocking `youtube.com` also blocks `m.youtube.com` but not `notyoutube.com`.

```kotlin
fun Set<String>.matches() = any { h == it || h.endsWith(".$it") }
```

### Schedules That Cross Midnight

A schedule stores its window as minutes since midnight. A normal window is active when the current minute is inside it. A "wind down" schedule from 22:00 to 06:00 has a start after its end, so it's really two pieces, and the second piece belongs to the previous day's schedule.

```kotlin
return if (startMinute <= endMinute) {
    today in days && minute >= startMinute && minute < endMinute
} else {
    // Window spans midnight, e.g. 22:00 – 06:00.
    val yesterday = if (today == 1) 7 else today - 1
    (today in days && minute >= startMinute) || (yesterday in days && minute < endMinute)
}
```

If the schedule only runs on weekdays, 02:00 on Saturday is still blocked, because it's the tail of Friday night.

## Implementation

The app is a single Compose activity with three tabs (Blocking, Strict Mode, Insights), a schedule editor, the accessibility service and the block screen. Everything persists through one `BlockRepository` object backed by SharedPreferences, and schedules are stored as JSON.

### Strict Mode Only Moves Forward

Strict Mode has to resist the person who set it, a few hours later. So the repository refuses every change that would weaken blocking while it's on, and allows every change that strengthens it. Adding a schedule works. Editing, disabling or deleting one doesn't. Turning a content block on works. Turning it off doesn't. The lock itself can only be extended.

```kotlin
fun activateStrict(durationMs: Long) {
    val base = maxOf(strictUntil, System.currentTimeMillis())
    strictUntil = base + durationMs
    prefs.edit().putLong(KEY_STRICT_UNTIL, strictUntil).apply()
}
```

Taking the max with the current time means extending an expired lock starts from now, and extending an active one adds to the end. There is no code path that makes `strictUntil` smaller.

### Content Blocks

YouTube Shorts lives inside the YouTube app, so blocking the package would block all of YouTube. Instead, when YouTube is in front, the service looks for the Shorts player in the view tree. The player's view ID changes between YouTube versions, so it checks five candidates (`reel_recycler`, `reel_watch_player`, `reel_player_page_container`, `shorts_video_container`, `reel_progress_bar`). If any of them is on screen, the service presses back to leave the player and shows the block screen. In a browser, the same block matches a `youtube.com` host with a path starting at `/shorts`. YouTube Music is a separate package on Android and a separate host on the web, so it's a plain match on each.

## Problems

### 1. Blocking a Site You Were Only Typing

Matching on the URL bar's text as soon as it changes doesn't work, because while you type, the bar shows your partial input and autocomplete suggestions. Typing "you" on the way to a search can bring up a YouTube suggestion, and a naive matcher would block a site you never visited. **The fix was to trust the URL bar only when it doesn't have focus.** After you commit a navigation, focus leaves the bar and its text is the page's real address.

```kotlin
if (node.isFocused) return null
```

### 2. The Block Screen Dismissed Itself

When a site is blocked, the service does two things. It fires a global back action so the browser leaves the page, and then it opens the block screen. Without the back action, dismissing the block screen would drop you right back on the blocked page. But the back press is asynchronous, and sometimes it arrived after the block screen had appeared, so it dismissed the block screen instead. The page was gone, but so was the explanation. **The block screen now ignores back presses for its first 800 ms**, which is long enough to absorb the service's own back action. After that window, back sends you to the home screen, never to the app you were blocked from.

### 3. One Visit, Many Events

Content-change events fire constantly while a page loads, so one visit to a blocked site produces several matches in a row, and each would open its own block screen. The service remembers the last thing it blocked and when, and ignores the same key for 1.5 seconds. The block activity also launches with `SINGLE_TOP` and `CLEAR_TOP`, so a repeat brings the existing screen forward instead of opening another.

## What I Would Change

Website blocking only covers browsers in the table. A browser that isn't listed has to be blocked as an app, and in-app web views aren't seen at all. Covering those properly means a local VPN service that filters DNS on the device, which would block by hostname no matter which app makes the request. It would also replace the most fragile part of the design, the list of other apps' view IDs that can change with any update.
