---
layout: post
title: "Eleven Small Builds Where the Hard Part Was Deciding Who Owns the State"
tab_title: Small Builds
code: https://github.com/SadeekFarhan21/projects.farhansadeek.com
date: 2025-08-05 15:25:35
tags:
  - web-apps
  - multiplayer
  - payments
  - realtime
description: >-
  Eleven small builds and team contributions from August 2025 to June 2026,
  most of them one to three days of work, where the screens came quickly and
  the hard part was the one decision two parties could disagree about.
---

Between August 2025 and June 2026 I built eight small apps on my own and worked on three projects led by friends. Most of the solo builds took one to three days: a multiplayer chess site, a 1v1 AP Calculus BC quiz duel, a site where fans buy streamers food, a flight log with a live globe, a mental-math drill, a prayer-times app, a research-job scraper and the first piece of an Abenaki dictionary tool. Looking back across them, the screens were never the hard part. **In every app with more than one party, the hard part was a single decision that two people (or a person and a payment processor) could disagree about, and the fix each time was to give that decision exactly one owner.**

In the quiz duel that owner is a Postgres trigger that pairs players under a row lock. In chess it's a Node server holding the only copy of the board that counts. In the food-gifting site it's the payment webhook, the only code allowed to credit a creator. This post goes deep on those three, gives the others a paragraph each, and credits the team projects (Camden Hulse's Treena, Krish Badri's RAG app, and the movie recommender Krish and I built together) to the people who did most of the work.

## Why It Matters

Small builds are how I find out what a kind of app actually costs. A one-day app hides nothing. There's no team, no backlog and no time for anything that isn't needed, so whatever took the longest is what's hard about that kind of app.

For the single-player apps, that was usually data or an external API. For anything with two players or a payment, it was the same problem three times. Each user's browser holds its own copy of the state, and the copies drift. Two people click "Find match" in the same second. A player moves a piece when it isn't their turn, by accident or on purpose. A buyer lands on the "payment succeeded" page and closes the tab before the payment processor has said anything. A demo survives all of these when you test it alone, and falls over the first time two friends try it together.

So the question I ended up asking in each build was who gets to decide. Once that had an answer, the rest of the app was layout.

## Technical Details

### One Owner per Decision

Each multiplayer or money-handling app has a few decisions that have to come out the same for everyone: who is paired with whom, whether a move is legal, whether an order was paid. I put each of them in one place that sees every request, and made every client a renderer of whatever that place says.

| App | Decision | Owner |
|---|---|---|
| Trivia duel | who plays whom, who won each round | a Postgres trigger and RPC functions in Supabase |
| Chess | whose turn it is and whether a move is legal | one `chess.js` game per room on the Socket.IO server |
| FoodMe | whether a gift was paid for | the Whop `payment.succeeded` webhook |

### Why Chess Got Matchmaking for Free

Chess and the trivia duel both have a quick-match button, and the two implementations look nothing alike for a reason worth spelling out. The chess server is one long-running Node process, and Node runs one event handler at a time. When two `quick-match` events arrive together, the first handler runs to completion (it shifts the waiting player off an in-memory array and creates the room) before the second one starts and sees an empty queue. There's no race because there's only one thread to race on.

The trivia duel has no server of its own. Every browser talks straight to Supabase, so many clients write to one Postgres table at once, each in its own transaction, and two players arriving together can both see the same opponent waiting. Postgres handles this with `SELECT ... FOR UPDATE SKIP LOCKED`<sup>[[1]](#ref-1)</sup>. `FOR UPDATE` locks the row a transaction reads, and `SKIP LOCKED` tells any other transaction looking for a row to pass over locked ones instead of waiting on them. The second arrival either finds a different waiting player or finds nobody and joins the queue itself. **A waiting player can only be claimed once.**

Same feature, two backends, and very different amounts of thought. **Where the code runs decides how much concurrency you have to reason about**, and that was the most useful thing these builds taught me.

## Implementation

### Pairing Players Inside Postgres

The trivia duel, built March 21 to 23, 2026 with Next.js 16 and Supabase, is a five-round head-to-head on AP Calculus BC. I wrote 50 questions across the ten course units (20 easy, 20 medium, 10 hard), rendered with KaTeX. Each round has a 15-second timer, and when both players answer correctly the faster one takes the round.

Matchmaking is a trigger on the queue table. A player's browser inserts one row, and the trigger looks for someone else waiting. If it finds them, it builds the whole match in the same transaction.

```sql
SELECT * INTO opponent
FROM matchmaking_queue
WHERE user_id != NEW.user_id
ORDER BY joined_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;

IF NOT FOUND THEN
  RETURN NEW;  -- nobody waiting, so stay in the queue
END IF;

-- pick 5 random questions, insert the match and its 5 rounds,
-- then delete both players from the queue
```

The browser never polls to ask whether it got matched. It subscribes to inserts on the `matches` table through Supabase Realtime<sup>[[2]](#ref-2)</sup> and goes to the game page when a row with its user ID shows up. The queue has `UNIQUE(user_id)`, so a double-click gets Postgres error `23505`, and the client handles that by checking whether a match already exists for it.

Answers go through one database function, `submit_answer`. It checks that the caller (`auth.uid()`) is one of the two players, refuses a second answer for the same round, and grades the answer against the stored key. Once both answers are in, it decides the round winner and advances the round, and after round five it calls `complete_match`, which records the winner and updates both players' ratings. The React hook that drives the game screen only sends answers and draws what comes back.

### Turn Validation on the Socket Server

The chess site (August 6 to 16, 2025) is Next.js 15 behind a custom Node server, so Socket.IO<sup>[[3]](#ref-3)</sup> can share the HTTP port. Players create a room and share a six-character code, or press quick match, and anyone who joins a full room becomes a spectator.

The server keeps one `chess.js`<sup>[[4]](#ref-4)</sup> game per room, and a move only counts if that game accepts it. This is condensed from the 204-line socket route.

```ts
socket.on('make-move', ({ roomId, move }) => {
  const room = rooms.get(roomId)
  const player = room?.players.find(p => p.id === socket.id)
  if (!room || !player) return

  const turn = room.game.turn()
  if ((turn === 'w' && player.color !== 'white') ||
      (turn === 'b' && player.color !== 'black')) return

  try {
    const result = room.game.move(move)  // throws on an illegal move
    io.to(roomId).emit('move-made', {
      move: result, fen: room.game.fen(), turn: room.game.turn(),
      isCheckmate: room.game.isCheckmate(), // plus check, draw, stalemate
    })
  } catch {
    socket.emit('invalid-move', { move })
  }
})
```

Two checks run here. The color tied to the socket has to match whose turn it is, and chess.js has to accept the move as legal. Then every client in the room gets the new FEN string and rebuilds its board from it. The browser runs its own copy of chess.js too, but only to highlight legal squares when you pick up a piece, and it never decides anything. **Because the board lives on the server, two screens can't disagree about the position.**

### Crediting Creators From the Webhook

FoodMe (February 22 to March 2, 2026) lets a fan buy a streamer a meal. Creators sign in with Twitch or Google and choose items from five chains, with 15 items seeded from a Big Mac to a Chipotle burrito bowl. The fan pays 20% over the item's base price, the creator earns the base price into a balance kept per restaurant, and creators cash out in $10, $15 or $25 gift cards. When a gift lands, an alert shows for six seconds on a browser overlay the creator can put on stream.

Payments run through Whop. The checkout route writes the order first, as `pending_payment`, with the fan's price, the platform fee and the creator's credit all stored on it in cents, and puts the order ID in the Whop checkout metadata. Whop then sends the fan back to a URL ending in `?payment=success`, but that page only says thanks. **The only code that moves money is the webhook.**

```ts
if (!verifyWhopWebhook(body, signature)) {  // HMAC-SHA256, constant-time compare
  return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
}
const event = JSON.parse(body);
if (event.event !== "payment.succeeded") return NextResponse.json({ received: true });

const { data: order } = await supabase.from("orders")
  .select("*").eq("id", event.data.metadata.order_id).single();

// Idempotency: skip if already processed
if (order.status === "payment_complete") {
  return NextResponse.json({ received: true, already_processed: true });
}
// mark the order paid, add order.creator_credit_cents to the balance,
// insert a notification row that Realtime pushes to the overlay
```

Webhooks get retried, and payment providers say plainly that the same event can arrive more than once (Stripe's webhook guide is one example<sup>[[5]](#ref-5)</sup>), so the handler checks the order's status before it touches a balance. Freezing the amounts on the order at checkout also means the webhook never looks up current prices. If a menu price changes while a payment is in flight, the creator is still credited exactly what the fan saw.

### The Rest of the Builds

These were single-player, so the hard part sat somewhere else in each one.

SiloFlight (May 4 to 6, 2026) is a personal flight log with a Next.js site and an Expo app. You enter a flight number, it looks up the route, and the statistics page adds up your miles with the haversine formula and draws your routes on a globe beside live aircraft from the OpenSky Network<sup>[[6]](#ref-6)</sup>. There the hard part was the API budget. OpenSky's anonymous tier wants at least ten seconds between calls and caps daily credits, so the live-aircraft route keeps the last response for eight seconds and serves that copy when OpenSky is down, which means a page full of visitors looking at the same view costs one upstream call. Airport coordinates come from a bundled table of 13,764 airports.

The QuantPrep mental-math drill was a one-day build on December 6, 2025. It quizzes factorials from 0! to 10! and binomial coefficients up to n = 10 out of lookup tables, rendered in KaTeX, and keeps the last ten problems out of the draw so a run of answers doesn't repeat itself.

PrayerTime is a Flutter app that computes the five daily prayer times on the phone with the adhan library<sup>[[7]](#ref-7)</sup>, using the ISNA (North America) method and the Shafi'i rule for the afternoon prayer, from either GPS or a preset city. Since it works from coordinates, it never depends on a prayer-times API being up.

The Columbia research-jobs scraper (June 4 to 7, 2026) is a Python Playwright script. The job board sits behind CAS login and Duo, so the script opens a visible browser, waits while I log in by hand, then opens every "Read more" posting, saves its text and pages until there are none left. It collected 185 postings, and a second script parses each posting's free text into CSV columns such as department, eligibility, hours per week and contact email. Automating around a login turned out to be far easier than automating the login.

The Abenaki translator starts with a 27-line parser that turns an Abenaki-English dictionary in a Word document into a two-column CSV.

### Team Contributions

Treena is Camden Hulse's app, a mobile IDE built with Expo that puts a file browser, editor, terminal and AI agent on a phone. Camden wrote nearly all of it, and I built two pieces. The first is the remote-terminal client, a WebSocket class that sends `exec` and `kill` messages to the backend, routes `stdout`, `stderr` and `exit` messages back to the right command by ID, fails every pending command with "Connection lost" when the socket drops, and reconnects up to five times, three seconds apart. The second is the marketing site, a Next.js page with GSAP animation and a three.js background.

The RAG app is Krish Badri's MVP. You upload PDFs, their chunks get embedded, and you chat with an LLM that cites them. Krish built the upload pipeline, the embeddings and the chat, and I added upload batches. A batch groups the files from one session, gets a shareable link, and can limit retrieval to its own documents, so a question about this week's files only cites this week's files.

The movie recommender was a joint project with Krish on MovieLens 100K<sup>[[8]](#ref-8)</sup> (943 users, 1,682 movies, 100,000 ratings), and Krish did the larger share. He wrote the data pipeline on the official splits, the biased matrix factorization and the autoencoder in PyTorch, a neural collaborative filtering network from scratch in NumPy, and the Streamlit app, which handles a brand-new user by fitting only a fresh user embedding to a few ratings while the movie embeddings stay frozen. I set up the dataset and the first loading code and wrote part of the from-scratch network's dense layer.

## What I Would Change

I'd write the owner first. In each of the three multiplayer and payment builds I started with the screens, because they're fun and visible, and the trigger, socket handler and webhook came after the UI had already made assumptions about them. Next time I'd answer "who decides?" with a function before writing a single component, and open a second browser window in the first hour instead of the last.

## References

1. <span id="ref-1"></span>PostgreSQL Global Development Group. *SELECT, The Locking Clause*. PostgreSQL documentation. [link](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
2. <span id="ref-2"></span>Supabase. *Postgres Changes*. Supabase Realtime documentation. [link](https://supabase.com/docs/guides/realtime/postgres-changes)
3. <span id="ref-3"></span>Socket.IO. *Documentation*. [link](https://socket.io/docs/v4/)
4. <span id="ref-4"></span>Jeff Hlywa. *chess.js*. GitHub repository. [link](https://github.com/jhlywa/chess.js)
5. <span id="ref-5"></span>Stripe. *Receive Stripe events in your webhook endpoint*. Stripe documentation. [link](https://docs.stripe.com/webhooks)
6. <span id="ref-6"></span>The OpenSky Network. *OpenSky REST API*. [link](https://openskynetwork.github.io/opensky-api/rest.html)
7. <span id="ref-7"></span>Batoul Apps. *adhan*. Dart package. [link](https://pub.dev/packages/adhan)
8. <span id="ref-8"></span>F. Maxwell Harper, Joseph A. Konstan. *The MovieLens Datasets: History and Context*. ACM Transactions on Interactive Intelligent Systems, 2015. [doi:10.1145/2827872](https://doi.org/10.1145/2827872)
