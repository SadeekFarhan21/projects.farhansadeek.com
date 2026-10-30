---
layout: post
title: "Ten Early Projects and the Work That Moved Behind the Chart"
tab_title: Early Projects
code: https://github.com/SadeekFarhan21/projects.farhansadeek.com
date: 2021-12-12 01:37:18
tags:
  - streamlit
  - data-visualization
  - machine-learning
description: >-
  Ten projects from high school and my first year of college, from a Streamlit
  stock app with 55 hand-typed tickers in 2022 to 8,471 hurricane-damage
  coordinates clustered at Hack OHI/O in 2024, where what grew was the code
  that ran before the first chart.
---

In March 2022 I built a Streamlit page that charted one stock and printed a verdict at the bottom, bullish or bearish. Getting the data took one line, a call to `yf.download`. Two and a half years later at Hack OHI/O, I spent a Sunday morning turning 8,471 satellite photo file names into map coordinates and clustering them, and the chart was the last thing on the list. Those are the two ends of ten small projects I built in high school and my first year of college. **The front end barely changed (Streamlit, Plotly, a verdict at the bottom). What changed was how much work happened before the first chart, and the projects that taught me the most were the ones where most of the code sat there.**

These are small. The largest single app is a few hundred lines. The clock, the snake game and the Superstore dashboard started from tutorials. Two of the projects were weekend hackathons and one was a five-person DataFest team. They run from a CSS clock in December 2021 to a pair of Ohio State course tools in 2025, and a stock verdict rule I wrote near the start shows up again, word for word, in a second app.

## Why It Matters

People argue a lot about tutorials versus projects when you're learning to program. Looking back, my line falls somewhere else. A tutorial teaches the last step, turning a clean table into a chart. A project worth doing starts with a question and no table, so you build the table yourself.

My early projects show that split clearly. The apps where the data arrived ready made (a stock quote, a sample retail spreadsheet, a weather API) look polished and taught me the libraries. The ones where I had to work out where the data came from (where a satellite photo was taken, how a semester maps to a file name, how five people should split a 3 GB dataset) look rougher, and they're the ones I still think about. This post walks through all ten in order, because the order is the argument.

## Technical Details

### One Template for Three Years

Streamlit<sup>[[1]](#ref-1)</sup> turns a Python script into a web page and reruns the whole script every time a widget changes. There's no server code and no state to manage, so each of my apps was a column of `st.container()` blocks, each holding one Plotly figure.

The 2022 Stock App is the template in its purest form. The sidebar picks an exchange, then one of 55 tickers I typed in by hand, then a start and end date. yfinance<sup>[[2]](#ref-2)</sup> downloads the daily prices, and the page draws open and close as two lines, high and low as a filled band, volume as an area chart, and `st.metric` boxes showing how much each value moved between the first and last day. It also had a button that printed the app's own source code, which I'd pasted into the file as a 280-line string.

### The Verdict Rule

The bottom of the page is the part I cared about. It compares the last day in the window with the first.

```python
if (float(volume_change) > 0 and float(close_change) > 0) or \
   (float(volume_change) < 0 and float(close_change) < 0):
    verdict = 'This stock was bullish at that time.'
else:
    verdict = 'This stock was bearish at that time.'
```

If price and volume moved the same way, the page says bullish, and otherwise bearish. That comes from the old trader's idea that volume confirms price. A rise on growing volume has buyers behind it, and a fall on shrinking volume has few sellers behind it. The paragraph the app printed under a bearish verdict defined a bear market differently, as a fall of 20% or more from recent highs. **The definition I'd actually implement three years later was already on the page, in the text under the rule.**

## Implementation

### Learning the Pieces, 2021 to 2023

The clock came first, in December 2021, and it's 142 lines of HTML, CSS and JavaScript. Each hand is a rotated `div`, and the only math is the hour hand, which has to creep forward with the minutes.

```js
let hrotation = 30 * htime + mtime / 2
let mrotation = 6 * mtime
let srotation = 6 * stime
```

Twelve hours make 360 degrees, so each hour is 30 degrees, and each minute adds half a degree to the hour hand.

The snake game, in May 2023, was Java Swing. The board is 500 by 500 pixels in 10-pixel units, a Swing `Timer` ticks every 80 milliseconds, and each tick shifts every body segment into the position of the one ahead of it before moving the head. I picked a random starting length between 4 and 8 and a random starting direction so the game opened differently each time.

### Trade Prophet and RetailIQ, November 2023

Trade Prophet is the Stock App rebuilt twenty months later. **Instead of 55 typed tickers it reads a public CSV of 5,782 listings, 3,065 on the NYSE and 2,717 on NASDAQ**, and builds the ticker list and the company names from it. The window defaults to the last 100 days, Plotly Express replaces the hand-built figures, and a new section trains a random forest (10 trees, depth 5) to project the closing price 30 to 100 days ahead, chosen with a slider. The verdict rule came over word for word, and the whole app is 168 lines.

The Superstore dashboard started the same week from a tutorial on the Superstore sample dataset and later became RetailIQ. It loads an uploaded CSV or the sample spreadsheet, filters by date, then region, state and city, and draws category bars, region and segment pies, a monthly sales line, a treemap of region, category and sub-category, and a sales against profit scatter. It's 178 lines, and it taught me Plotly Express more than anything about retail.

### Truth Trakker at High School IO, November 2023

High School IO is a hackathon for high school students, and our team built Truth Trakker for it. It's one Streamlit page with three analyses picked from a radio button. The first classifies a news article as real or fake with TF-IDF features and a random forest, the second guesses whether the text was written by a language model, and the third runs a pretrained sentiment model so readers can see the article's tone. The fake news model trains on a balanced set of 4,594 labeled articles, 2,297 real and 2,297 fake. The AI-text check is where most of our time went, and it's covered under Problems.

### DataFest 2024

ASA DataFest<sup>[[3]](#ref-3)</sup> gives teams one weekend with a dataset nobody has seen. In 2024 it came from CourseKata<sup>[[4]](#ref-4)</sup>, an online statistics textbook, and the challenge was to suggest how to improve the student experience. The data was about 3 GB across six tables (end-of-chapter checkpoints, pulse checks, items, media views, page views and question responses).

We were five. Advik Marini ran slides and the presentation, Luke Zhang did the statistics, Gagan Karnati did the coding side of the analysis, and Ragav Janardhan and I did the visualization. We split the work by table, so each person owned a slice of the data rather than a slice of the slides. Luke and I took the checkpoints and responses tables. A typical cell of mine scored each response and averaged by question type.

```python
responses['accuracy'] = responses['points_earned'] / responses['points_possible']
accuracy_by_type = responses.groupby('lrn_type')['accuracy'].mean()
```

Code questions arrived without a question type, so I labeled them `code` before grouping. It's a small step, and it was one of the first times a dataset needed me to decide what a missing value meant.

### NimbusNote, April 2024

NimbusNote is a 100-line React weather page built over two days. On load it asks the browser for your location and fetches current conditions from OpenWeather<sup>[[5]](#ref-5)</sup>. Typing a city and pressing Enter fetches that city instead, and the page shows temperature, conditions, feels-like, humidity and wind in imperial units. It was my first time managing React state and effects.

### Hurricane Damage at Hack OHI/O 12, October 2024

The goal was to find where a hurricane did the most damage from satellite imagery. My part was the data and models in Python. A small PyTorch CNN (three convolution layers of 16, 32 and 64 channels on 64 by 64 crops, then a 128-unit layer and two outputs) classifies a crop as damaged or not, and DBSCAN<sup>[[6]](#ref-6)</sup> clusters the damaged locations into hotspots. Jayson Clark built the dashboard, a React app that draws the hotspot regions as circles on a Google Map and ranks them. The interesting part was getting a location out of a photo, covered under Problems.

### Ohio State Course Tools, 2025

The last two are tools I built for myself at Ohio State. The schedule planner, built in about an hour one afternoon in February 2025, is a 73-line Streamlit page with a dropdown of 337 subject codes that fetches the plain-text section listing for a subject and term. The course search, from June 2025, is a Next.js page over a small Express server that parses those same listings into sections, with class number, days, time, room, enrollment, capacity and waitlist pulled out of each line by regular expressions.

## Problems

### 1. Getting a Location Out of a Photo

On Saturday we started with xBD<sup>[[7]](#ref-7)</sup>, a building damage dataset of before and after image pairs, and my first script just counted hurricane images by their `pre` and `post` file names. Pairs are good for training a damage model, but they didn't answer our question of *where*, and by Saturday afternoon I'd moved to a Kaggle set of satellite crops from Texas after Hurricane Harvey<sup>[[8]](#ref-8)</sup>, sorted into `damage` and `no_damage` folders.

That set has a useful property. **Each file is named for where it was taken**, as longitude and latitude joined by an underscore, so the coordinates come free with the image.

```python
file_name = os.path.splitext(file)[0]
parts = file_name.split('_')
if len(parts) >= 2:
    longitude = float(parts[0])
    latitude = float(parts[1])
    csv_writer.writerow([longitude, latitude])
```

That loop turned the damage folder into 8,471 points, spanning longitude -97.0 to -93.5 and latitude 28.4 to 31.0, the stretch of the Texas coast Harvey hit. Once the damage was a table of coordinates, finding hotspots was a clustering problem. DBSCAN suits it because it doesn't need the number of clusters up front and treats isolated points as noise. With `metric='haversine'` on coordinates in radians, it measures distance along the Earth's surface instead of on a flat grid. **The photo was the model's input, but the file name was the dataset.**

### 2. Telling AI Text Apart in a Weekend

ChatGPT was almost a year old, and we wanted a check that said whether a passage was machine-written. We built two versions. The first computed two statistics from word counts. Perplexity measures how surprising the words are under a simple model of the text, and burstiness measures how unevenly words repeat. Human writing tends to score higher on both, so we combined them into one score with weights of 0.7 and 0.3. Those weights were guesses, though, and we had no labeled machine-written text to fit them on.

The second version used a classifier someone had already trained for the job, OpenAI's RoBERTa-large detector for GPT-2 output<sup>[[9]](#ref-9)</sup>, through the Hugging Face pipeline, and called a passage AI-generated when its score reached 70%. That's the one the final app shipped. **Two hand-picked statistics need labeled data to set their weights, and without any, a model trained on labeled data was the more honest choice.**

### 3. Turning a Semester Into a File Name

The course listings are stored one file per subject per term, and the term is a four-digit code. Working out the code was the whole puzzle of the schedule planner.

```python
season_code = {'winter': 0, 'spring': 2, 'summer': 4, 'autumn': 8}
term = f"{year - 1900}{season_code[season]}"
```

The first three digits are the year minus 1900 and the last is the season, so Autumn 2025 is 125 followed by 8, or `1258`. After that, every listing for 337 subjects back to 2010 was one URL away.

## Results

A few numbers show the change. **The ticker list went from 55 entries I typed to 5,782 read from a file**, and that was the first time a project's scope came from data instead of from me. On a held-out 20% of its 4,594 articles (919 of them), Truth Trakker's fake news model **scores 89.45% as a random forest and 90.42% as the logistic regression we tried first**, so the simpler model was as good. **The hurricane work produced 8,471 damage coordinates from file names alone**, and none of it came from an API.

## What I Would Change

I'd start every project from the question and work backward to the data, which is what DataFest forced on me and what I chose to do at Hack OHI/O. The polished 2022 and 2023 apps were good library practice, but they were the same page pointed at different tables.

I'd also treat the verdict rule as a claim to test instead of a sentence to print. That happened eventually. Four months after Hack OHI/O, my Quantathon team's [QuantifyAI](/posts/quantifyai-market-regimes/) labeled every trading day Bear, Bull or Static with a 20% drawdown rule, the same definition my 2022 app printed, and backtested strategies on top of it. It's the question the Stock App asked, answered with years of history instead of two days.

## References

1. <span id="ref-1"></span>Streamlit. *Streamlit documentation*. [link](https://docs.streamlit.io/)
2. <span id="ref-2"></span>Ran Aroussi. *yfinance*. GitHub repository. [link](https://github.com/ranaroussi/yfinance)
3. <span id="ref-3"></span>American Statistical Association. *ASA DataFest*. [link](https://ww2.amstat.org/education/datafest/)
4. <span id="ref-4"></span>CourseKata. [link](https://coursekata.org/)
5. <span id="ref-5"></span>OpenWeather. *Current weather data*. API documentation. [link](https://openweathermap.org/current)
6. <span id="ref-6"></span>Martin Ester, Hans-Peter Kriegel, Jörg Sander, Xiaowei Xu. *A Density-Based Algorithm for Discovering Clusters in Large Spatial Databases with Noise*. KDD, 1996. [scikit-learn DBSCAN](https://scikit-learn.org/stable/modules/generated/sklearn.cluster.DBSCAN.html)
7. <span id="ref-7"></span>Ritwik Gupta, Richard Hosfelt, Sandra Sajeev, et al. *xBD: A Dataset for Assessing Building Damage from Satellite Imagery*. 2019. [arXiv:1911.09296](https://arxiv.org/abs/1911.09296)
8. <span id="ref-8"></span>Kevin Mader. *Satellite Images of Hurricane Damage*. Kaggle dataset. [link](https://www.kaggle.com/datasets/kmader/satellite-images-of-hurricane-damage)
9. <span id="ref-9"></span>OpenAI. *RoBERTa-large OpenAI detector*. Hugging Face model card. [link](https://huggingface.co/openai-community/roberta-large-openai-detector)
