import streamlit as st
import yfinance as yf
import pandas as pd
import plotly.express as px
import numpy as np
from datetime import timedelta, date, datetime, timedelta
from dateutil.relativedelta import relativedelta;
from sklearn.model_selection import train_test_split;
from sklearn.ensemble import RandomForestRegressor;
import requests
# Create the container
title = st.container()
sidebar = st.container()
about = st.container()
dfset = st.container()
graph = st.container()
open_close = st.container()
high_low = st.container()
volume = st.container()
change = st.container()
verdict = st.container()
prediction = st.container()

def visit_website(url):
    try:
        response = requests.get(url)
        if response.status_code == 200:
            print("Visited", url, "successfully at", datetime.now())
        else:
            print("Failed to visit", url, "Status code:", response.status_code)
    except Exception as e:
        print("Failed to visit", url, "Error:", e)

exchange = pd.read_csv('https://raw.githubusercontent.com/dhhagan/stocks/master/scripts/stock_info.csv')

# nasdaq stocks
nasdaq = exchange[exchange['Exchange'] == 'NASDAQ'].Ticker

# nyse stocks
nyse = exchange[exchange['Exchange'] == 'NYSE'].Ticker

# companies and tickers
dictionary = dict(zip(exchange.Ticker, exchange.Name))


# Title
with title:
    st.title('Trade Prophet')
    st.markdown('This app built with Streamlit would give you the performance of the stocks today.')

# Sidebar
with sidebar:
    st.sidebar.title('Options')
    market = st.sidebar.selectbox('Enter Market', np.array(['NYSE', 'NASDAQ']))
    if market == 'NYSE':
        ticker = st.sidebar.selectbox('Enter Ticker', nyse)
    elif market == 'NASDAQ':
        ticker = st.sidebar.selectbox('Enter Ticker', nasdaq)
    start = st.sidebar.date_input('Enter Start Date', date.today() - timedelta(days=100))
    end = st.sidebar.date_input('Enter End Date', date.today())
    future_days = st.sidebar.slider('Enter Future Days', 30, 100) 

# Dataset
df = yf.download(ticker, start=start, end=end)
df = df[::-1]

with about:
    st.header(dictionary[ticker])
     
# Volume
with volume:
    
    fig_vol = px.area(df, x=df.index, y="Volume", title='Trading Volume over the interval')
    st.plotly_chart(fig_vol)

# Open Close
with open_close:
    st.subheader('Open and Close')
    fig_oc = px.line(df, x = df.index, y = ["Open", "Close"], title = "Open and Close over the interval")
    st.plotly_chart(fig_oc)

# High Low
with high_low:
    st.subheader('High and Low')
    fig_hl = px.line(df, x = df.index, y = ["High", "Low"], title = "High and Low over the interval")
    st.plotly_chart(fig_hl)

# Change

with change:
    st.subheader('Change')
    # Data for current day
    close_now = round(float(str(df.head(1)['Close'].values[0])), 2)
    open_now = round(float(str(df.head(1)['Open'].values[0])), 2)
    high_now = round(float(str(df.head(1)['High'].values[0])), 2)
    low_now = round(float(str(df.head(1)['Low'].values[0])), 2)
    volume_now = int(str(df.head(1)['Volume'].values[0]))

    # Data for the first day on the dataset
    close_past = round(float(str(df.tail(1)['Close'].values[0])), 2)
    open_past = round(float(str(df.tail(1)['Open'].values[0])), 2)
    high_past = round(float(str(df.tail(1)['High'].values[0])), 2)
    low_past = round(float(str(df.tail(1)['Low'].values[0])), 2)
    volume_past = int(str(df.tail(1)['Volume'].values[0]))

    # Change in the price
    close_change = round(close_now - close_past, 2)
    open_change = round(open_now - open_past, 2)
    high_change = round(high_now - high_past, 2)
    low_change = round(low_now - low_past, 2)
    volume_change = volume_now - volume_past

    # Change in percentage based on the first day
    close_percent = round(close_change / close_past * 100, 2)
    open_percent = round(open_change / open_past * 100, 2)
    high_percent = round(high_change / high_past * 100, 2)
    low_percent = round(low_change / low_past * 100)
    volume_percent = round(volume_change / volume_past * 100, 2)

    # Open and Close
    col1, col2 = st.columns(2)
    col1.metric('Close', str(close_now), str(close_change) +' (' + str(close_percent) + '%)')
    col2.metric('Open', str(open_now), str(open_change) + ' (' + str(open_percent) + '%)')

    # High and Low
    col3, col4 = st.columns(2)
    col3.metric('High', str(high_now), str(high_change) + ' (' + str(high_percent) + '%)')
    col4.metric('Low', str(low_now), str(low_change) +'(' + str(low_percent) + '%)')

    # Chagne in volume
    col5, col6, col7 = st.columns(3)
    col5.metric('Volume', str(volume_now), str(volume_change) +'(' + str(volume_percent) + '%)')

    with prediction:
        st.header('Prediction')
        data = yf.download(ticker, start=date.today() - relativedelta(days=future_days * 100), end=date.today())
        data['Prediction'] = data['Close'].shift(-future_days)
        X = np.array(data.drop(columns=['Prediction'], axis=1))[:-future_days]
        y = np.array(data['Prediction'])[:-future_days]
        x_train, x_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
        model = RandomForestRegressor(n_estimators=10, max_depth=5, random_state=42)
        x_future = data.drop(columns=['Prediction'], axis=1)[:-future_days]
        x_future = x_future.tail(future_days)
        x_future = np.array(x_future)
        model.fit(x_train, y_train)
        forest_prediction = model.predict(x_future)
        predictions = forest_prediction
        valid = data[X.shape[0]:].copy()
        valid['Prediction'] = predictions
        valid.drop(columns=['Prediction'], axis=1)
        predict_graph = px.line(valid, x=valid.index, y=['Close', 'Prediction'])
        predict_graph.update_layout(title='Close vs Prediction', xaxis_title='Date', yaxis_title='Price')
        st.plotly_chart(predict_graph)

        score = str(float(round(model.score(x_test, y_test) * 100, 2)))
        st.subheader('Model Score: ' + score + '%')

    with verdict:
        if (float(volume_change) > 0 and float(close_change) > 0) or (float(volume_change) < 0 and float(close_change) < 0):
            verdict = 'This stock was 🐮ish at that time.'
            text = 'Bullish market, in securities and commodities trading, a rising market. A bull is an investor who expects prices to rise and, on this assumption, purchases a security or commodity in hopes of reselling it later for a profit. A bullish market is one in which prices are generally expected to rise. Compare bear markets, which are those in which prices are expected to fall.'
        else:
            verdict = 'This stock was 🐻ish at that time'
            text = 'A bear market is when a market experiences prolonged price declines. It typically describes a condition in which securities prices fall 20% or more from recent highs amid widespread pessimism and negative investor sentiment. A bear market is one in which prices are generally expected to fall. Compare bullish markets, which are those in which prices are expected to rise.'

        st.header('Verdict')
        st.subheader(verdict)
        st.write(text)
visit_website('https://www.google.com')        