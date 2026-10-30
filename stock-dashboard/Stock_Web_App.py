# libraries

import math
import streamlit as st
import yfinance as yf
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from dateutil.relativedelta import relativedelta
import datetime

# containers
intro = st.container()
sidebar = st.container()
header = st.container()
datetime = st.container()
data = st.container()
open_close = st.container()
high_low = st.container()
volume = st.container()
change = st.container()
verdict = st.container()
source = st.container()


# nasdaq stocks
nasdaq = sorted(
['AAPL', 'TWTR', 'MSFT', 'COIN','TSLA', 'AMZN', 'GOOG', 'FB', 'NFLX', 'INTC', 'CSCO', 'CMCSA', 'NVDA', 'AMD', 'ADBE', 'ADP', 'ADSK', 'AKAM', 'ADI','QCOM','AMGN'])


# nyse stocks
nyse = sorted(
['HD', 'WMT', 'JPM', 'BAC', 'C', 'WFC', 'PFE', 'T', 'MA', 'UNH', 'KO', 'VZ', 'DIS', 'PG', 'MCD', 'MRK', 'PEP', 'MGM', 'BA', 'CAT', 'DD', 'JNJ', 'MMM', 'AXP', 'XOM', 'PNC', 'XOM', 'CME', 'TMO', 'COP', 'CVS',  'ORCL', 'PLTR', 'NKE', 'NOC'])


# companies and tickers
dictonary = {'AAPL': 'Apple', 'MSFT': 'Microsoft', 'TSLA': 'Tesla', 'AMZN': 'Amazon', 'GOOG': 'Google', 'FB': 'Meta', 'HD': 'Home Depot', 'NFLX': 'Netflix', 'TWTR': 'Twitter', 'WMT': 'Walmart', 'JPM': 'JP Morgan', 'BAC': 'Bank of America', 'C': 'Citigroup', 'WFC': 'Wells Fargo', 'PFE': 'Pfizer','T': 'AT&T', 'INTC': 'Intel Corp', 'CSCO': 'Cisco', 'V'  : 'Visa', 'MA' : 'Mastercard', 'UNH': 'UnitedHealth', 'KO' : 'Coca-Cola', 'VZ' : 'Verizon', 'DIS': 'Disney', 'PG' : 'Procter & Gamble', 'MCD': 'McDonalds', 'MRK': 'Merck', 'PEP': 'PepsiCo, Inc.', 'MGM': 'MGM Resorts International', 'BA' : 'Boeing', 'CAT': 'Caterpillar', 'DD' : 'DuPont', 'JNJ': 'Johnson & Johnson', 'MMM': '3M', 'AXP': 'American Express', 'PNC': 'PNC', 'UNP': 'Union Pacific', 'CVS': 'CVS Health Corp', 'CMCSA': 'Comcast', 'COP': 'ConocoPhillips', 'TMO': 'T-Mobile', 'CME': 'Chicago Mercantile Exchange', 'XOM':'Exxon Mobil Corp', 'ORCL': 'Oracle Corp', 'NVDA': 'Nvidia', 'AMD': 'Advanced Micro Devices', 'ADBE': 'Adobe Systems Inc', 'ADP': 'Automatic data Processing', 'PLTR': 'Paylocity', 'AMAT': 'Applied Materials', 'ADSK': 'Autodesk', 'AKAM': 'Akamai Technologies', 'QCOM': 'Qualcomm', 'NKE': 'Nike', 'AMGN': 'Amgen', 'ADI': 'Analog Devices', 'NOC': 'Northrop Grumman' }


try:
    # intro
    with intro:
        st.title('Stock Price App')
        st.markdown('This app is designed to provide a quick and easy way to see the stock price of any stock you choose.')

    # sidebar
    with sidebar:
        stock = st.sidebar.selectbox('Select Market', ['NYSE', 'NASDAQ'])
        if stock == 'NYSE':
            ticker = st.sidebar.selectbox('Select Stock', nyse)
        elif stock == 'NASDAQ':
            ticker = st.sidebar.selectbox('Select Stock', nasdaq)

    # datetime

    with datetime:
        #begin = datetime.date.today() - datetime.date.timedelta(months=2)
        #end = datetime.date.today()
        begin = st.sidebar.date_input('Starting Date', value=None)
        end = st.sidebar.date_input('Ending Date', value=None)
        print(begin, end)
        if begin > end:
            st.error('Starting date must be before ending date')

    # header

    with header:
        for key, value in dictonary.items():
            if key == ticker:
                st.header(value)
                break

    # data

    with data:
        df = yf.download(ticker, start=begin, end=end)
        df.to_csv('data.csv')
        df.reset_index(inplace=True)
        data = pd.read_csv('data.csv')
        col1, col2 = st.columns(2)
        st.subheader('Starting data')
        st.dataframe(data.head(9))
        st.subheader('Ending data')
        st.dataframe(data.tail(9))


    # open

    with open_close:
        st.subheader(value + ' Stock Price')
        open_close = go.Figure()
        open_close.add_trace(go.Line(x=data.Date, y=data.Close, mode='lines', name='Close', marker_color='darkslateblue'))
        open_close.add_trace(go.Line(x=data.Date, y=data.Open, mode='lines', name='Open', marker_color='firebrick'))
        open_close.update_layout(title_text='Opening and closing price over time ', title_x=0.5, xaxis_title='Date', yaxis_title='Price', xaxis_rangeslider_visible=True, font=dict(family='Roboto Mono, monospace', size=13))
        st.plotly_chart(open_close)

    # high low graph
    with high_low:
        high_low = go.Figure()
        high_low.update_layout(title_text='Highest and lowest price over time', title_x=0.5, xaxis_title='Date', yaxis_title='Price', xaxis_rangeslider_visible=True, font=dict(family='Roboto Mono, monospace', size=13))
        high_low.add_trace(go.Scatter(x=data.Date, y=data.High, fill=None, mode='lines', name='High', line_color='green'))
        high_low.add_trace(go.Scatter(x=data.Date, y=data.Low, fill='tonexty', mode='lines', name='Low', line_color='#d62228'))
        st.plotly_chart(high_low)

    # volume
    with volume:
        st.subheader('Volume')
        volume = go.Figure()
        volume.add_trace(go.Line(x=data.Date, y=data.Volume, fill='tonexty', marker_color='#1f77b4'))
        volume.update_layout(title_text='Volume over time', title_x=0.5, xaxis_title='Date', yaxis_title='Volume', xaxis_rangeslider_visible=True, font=dict(family='Roboto Mono, monospace', size=14))
        st.plotly_chart(volume)
        volume = round(data.tail(1)['Volume'].values[0], 2)
        volume_change = str(round(data.tail(1)['Volume'].values[0] - data.head(1)['Volume'].values[0], 2))
        volume_percent = str(round((data.tail(1)['Volume'].values[0] - data.head(1)['Volume'].values[0]) / data.head(1)['Volume'].values[0] * 100, 2)) + '%'
        st.metric('Volume', volume, volume_change + ' (' + volume_percent + ')')

        st.title('')

    # change
    with change:
        st.subheader('Current Price')

        close = str(round(data.tail(1)['Close'].values[0], 2))
        open = round(data.tail(1)['Open'].values[0], 2)
        high = round(data.tail(1)['High'].values[0], 2)
        low = round(data.tail(1)['Low'].values[0], 2)

        close_change = str(round(data.tail(1)['Close'].values[0] - data.head(1)['Close'].values[0], 2))
        open_change = str(round(data.tail(1)['Open'].values[0] - data.head(1)['Open'].values[0], 2))
        high_change = str(round(data.tail(1)['High'].values[0] - data.head(1)['High'].values[0], 2))
        low_change = str(round(data.tail(1)['Low'].values[0] - data.head(1)['Low'].values[0], 2))
        volume_change = str(round(data.tail(1)['Volume'].values[0] - data.head(1)['Volume'].values[0], 2))

        close_percent = str(round((data.tail(1)['Close'].values[0] - data.head(1)['Close'].values[0]) / data.head(1)['Close'].values[0] * 100, 2))
        open_percent = str(round((data.tail(1)['Open'].values[0] - data.head(1)['Open'].values[0]) / data.head(1)['Open'].values[0] * 100, 2))
        high_percent = str(round((data.tail(1)['High'].values[0] - data.head(1)['High'].values[0]) / data.head(1)['High'].values[0] * 100, 2))
        low_percent = str(round((data.tail(1)['Low'].values[0] - data.head(1)['Low'].values[0]) / data.head(1)['Low'].values[0] * 100, 2))

        col1, col2 = st.columns(2)
        col1.metric('Open', open, open_change + ' (' + open_percent + '%)')
        col2.metric('Close', close, close_change + ' (' + close_percent + '%)')

        col3, col4 = st.columns(2)
        col3.metric('High', high, high_change + ' (' + high_percent + '%)')
        col4.metric('Low', low, low_change + ' (' + low_percent + '%)')


    # verdict

    with verdict:
        if (float(volume_change) > 0 and float(close_change) > 0) or (float(volume_change) < 0 and float(close_change) < 0):
            verdict = 'This stock was bullish at that time. 🐮'
            text = 'Bullish market, in securities and commodities trading, a rising market. A bull is an investor who expects prices to rise and, on this assumption, purchases a security or commodity in hopes of reselling it later for a profit. A bullish market is one in which prices are generally expected to rise. Compare bear markets, which are those in which prices are expected to fall.'
        else:
            verdict = 'This stock was bearish at that time. 🐻'
            text = 'A bear market is when a market experiences prolonged price declines. It typically describes a condition in which securities prices fall 20% or more from recent highs amid widespread pessimism and negative investor sentiment. A bear market is one in which prices are generally expected to fall. Compare bullish markets, which are those in which prices are expected to rise.'

        st.header('Verdict')
        st.subheader(verdict)
        st.write(text)

    # source

    with source:

        code ='''
# libraries

import math
import streamlit as st
import yfinance as yf
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go


# containers
intro = st.container()
sidebar = st.container()
header = st.container()
datetime = st.container()
data = st.container()
open_close = st.container()
high_low = st.container()
volume = st.container()
change = st.container()
verdict = st.container()
source = st.container()


# nasdaq stocks
nasdaq = sorted(
['AAPL', 
'TWTR', 
'MSFT', 
'TSLA', 
'AMZN', 
'GOOG', 
'FB', 
'NFLX', 
'INTC', 
'CSCO', 
'CMCSA', 
'NVDA', 
'AMD', 
'ADBE', 
'ADP', 
'ADSK', 
'AKAM', 
'ADI',
'QCOM',
'AMGN'])


# nyse stocks
nyse = sorted(
[
    'HD', 
    'WMT', 
    'JPM', 
    'BAC', 
    'C', 
    'WFC', 
    'PFE', 
    'T', 
    'MA', 
    'UNH', 
    'KO', 
    'VZ', 
    'DIS', 
    'PG', 
    'MCD', 
    'MRK', 
    'PEP', 
    'MGM', 
    'BA', 
    'CAT', 
    'DD', 
    'JNJ', 
    'MMM', 
    'AXP', 
    'XOM', 
    'PNC', 
    'XOM', 
    'CME', 
    'TMO', 
    'COP', 
    'CVS',  
    'ORCL', 
    'PLTR', 
    'NKE', 
    'NOC'
])


# companies and tickers
dictonary = {

    'AAPL': 'Apple', 
    'MSFT': 'Microsoft', 
    'TSLA': 'Tesla', 
    'AMZN': 'Amazon', 
    'GOOG': 'Google', 
    'FB': 'Meta', 
    'HD': 'Home Depot', 
    'NFLX': 'Netflix', 
    'TWTR': 'Twitter', 
    'WMT': 'Walmart', 
    'JPM': 'JP Morgan', 
    'BAC': 'Bank of America', 
    'C': 'Citigroup', 
    'WFC': 'Wells Fargo', 
    'PFE': 'Pfizer',
    'T': 'AT&T', 
    'INTC': 'Intel Corp', 
    'CSCO': 'Cisco', 
    'V'  : 'Visa', 
    'MA' : 'Mastercard', 
    'UNH': 'UnitedHealth', 
    'KO' : 'Coca-Cola', 
    'VZ' : 'Verizon', 
    'DIS': 'Disney', 
    'PG' : 'Procter & Gamble', 
    'MCD': 'McDonalds', 
    'MRK': 'Merck', 
    'PEP': 'PepsiCo, Inc.', 
    'MGM': 'MGM Resorts International', 
    'BA' : 'Boeing', 
    'CAT': 'Caterpillar', 
    'DD' : 'DuPont', 
    'JNJ': 'Johnson & Johnson', 
    'MMM': '3M', 
    'AXP': 'American Express', 
    'PNC': 'PNC', 
    'UNP': 'Union Pacific', 
    'CVS': 'CVS Health Corp', 
    'CMCSA': 'Comcast', 
    'COP': 'ConocoPhillips', 
    'TMO': 'T-Mobile', 
    'CME': 'Chicago Mercantile Exchange', 
    'XOM':'Exxon Mobil Corp', 
    'ORCL': 'Oracle Corp', 
    'NVDA': 'Nvidia', 
    'AMD': 'Advanced Micro Devices', 
    'ADBE': 'Adobe Systems Inc', 
    'ADP': 'Automatic data Processing', 
    'PLTR': 'Paylocity', 
    'AMAT': 'Applied Materials', 
    'ADSK': 'Autodesk', 
    'AKAM': 'Akamai Technologies', 
    'QCOM': 'Qualcomm', 
    'NKE': 'Nike', 
    'AMGN': 'Amgen', 
    'ADI': 'Analog Devices', 
    'NOC': 'Northrop Grumman' 
}


try:
    # intro
    with intro:
        st.title('Stock Price App')
        st.markdown('This app is designed to provide a quick and easy way to see the stock price of any stock you choose.')

    # sidebar
    with sidebar:
        stock = st.sidebar.selectbox('Select Market', ['NYSE', 'NASDAQ'])
        if stock == 'NYSE':
            ticker = st.sidebar.selectbox('Select Stock', nyse)
        elif stock == 'NASDAQ':
            ticker = st.sidebar.selectbox('Select Stock', nasdaq)

    # datetime

    with datetime:
        begin = st.sidebar.date_input('Starting Date', value=None)
        end = st.sidebar.date_input('Ending Date', value=None)
        if begin > end:
            st.error('Starting date must be before ending date')

    # header

    with header:
        for key, value in dictonary.items():
            if key == ticker:
                st.header(value)
                break

    # data

    with data:
        df = yf.download(ticker, start=begin, end=end)
        df.to_csv('data.csv')
        df.reset_index(inplace=True)
        data = pd.read_csv('data.csv')
        col1, col2 = st.columns(2)
        st.subheader('Starting data')
        st.dataframe(data.head(9))
        st.subheader('Ending data')
        st.dataframe(data.tail(9))


    # open

    with open_close:
        st.subheader(value + ' Stock Price')
        open_close = go.Figure()
        open_close.add_trace(go.Line(x=data.Date, y=data.Close, mode='lines', name='Close', marker_color='darkslateblue'))
        open_close.add_trace(go.Line(x=data.Date, y=data.Open, mode='lines', name='Open', marker_color='firebrick'))
        open_close.update_layout(title_text='Opening and closing price over time ',
        title_x=0.5, xaxis_title='Date', yaxis_title='Price', xaxis_rangeslider_visible=True, font=dict(family='Roboto Mono, monospace', size=12))
        st.plotly_chart(open_close)

    # high low graph

    with high_low:
        high_low = go.Figure()
        high_low.update_layout(title_text='Highest and lowest price over time', title_x=0.5, xaxis_title='Date', yaxis_title='Price', xaxis_rangeslider_visible=True, font=dict(family='Roboto Mono, monospace', size=12))
        high_low.add_trace(go.Scatter(x=data.Date, y=data.High, fill=None, mode='lines', name='High', line_color='green'))
        high_low.add_trace(go.Scatter(x=data.Date, y=data.Low, fill='tonexty', mode='lines', name='Low', line_color='#d62228'))
        st.plotly_chart(high_low)

    # volume

    with volume:
        st.subheader('Volume')
        volume = go.Figure()
        volume.add_trace(go.Line(x=data.Date, y=data.Volume, fill='tonexty', marker_color='#1f77b4'))
        volume.update_layout(title_text='Volume over time', title_x=0.5, xaxis_title='Date', yaxis_title='Volume', xaxis_rangeslider_visible=True, font=dict(family='Roboto Mono, monospace', size=12))
        st.plotly_chart(volume)
        volume = round(data.tail(1)['Volume'].values[0], 2)
        volume_change = str(round(data.tail(1)['Volume'].values[0] - data.head(1)['Volume'].values[0], 2))
        volume_percent = str(round((data.tail(1)['Volume'].values[0] - data.head(1)['Volume'].values[0]) / data.head(1)['Volume'].values[0] * 100, 2)) + '%'
        st.metric('Volume', volume, volume_change + ' (' + volume_percent + ')')

        st.title('')

    # change

    with change:
        st.subheader('Current Price')

        close = str(round(data.tail(1)['Close'].values[0], 2))
        open = round(data.tail(1)['Open'].values[0], 2)
        high = round(data.tail(1)['High'].values[0], 2)
        low = round(data.tail(1)['Low'].values[0], 2)

        close_change = str(round(data.tail(1)['Close'].values[0] - data.head(1)['Close'].values[0], 2))
        open_change = str(round(data.tail(1)['Open'].values[0] - data.head(1)['Open'].values[0], 2))
        high_change = str(round(data.tail(1)['High'].values[0] - data.head(1)['High'].values[0], 2))
        low_change = str(round(data.tail(1)['Low'].values[0] - data.head(1)['Low'].values[0], 2))
        volume_change = str(round(data.tail(1)['Volume'].values[0] - data.head(1)['Volume'].values[0], 2))

        close_percent = str(round((data.tail(1)['Close'].values[0] - data.head(1)['Close'].values[0]) / data.head(1)['Close'].values[0] * 100, 2))
        open_percent = str(round((data.tail(1)['Open'].values[0] - data.head(1)['Open'].values[0]) / data.head(1)['Open'].values[0] * 100, 2))
        high_percent = str(round((data.tail(1)['High'].values[0] - data.head(1)['High'].values[0]) / data.head(1)['High'].values[0] * 100, 2))
        low_percent = str(round((data.tail(1)['Low'].values[0] - data.head(1)['Low'].values[0]) / data.head(1)['Low'].values[0] * 100, 2))

        col1, col2 = st.columns(2)
        col1.metric('Open', open, open_change + ' (' + open_percent + '%)')
        col2.metric('Close', close, close_change + ' (' + close_percent + '%)')

        col3, col4 = st.columns(2)
        col3.metric('High', high, high_change + ' (' + high_percent + '%)')
        col4.metric('Low', low, low_change + ' (' + low_percent + '%)')


    # verdict

    with verdict:
        if (float(volume_change) > 0 and float(close_change) > 0) or (float(volume_change) < 0 and float(close_change) < 0):
            verdict = 'This stock was bullish at that time. 🐮'
            text = 'Bullish market, in securities and commodities trading, a rising market. A bull is an investor who expects prices to rise and, on this assumption, purchases a security or commodity in hopes of reselling it later for a profit. A bullish market is one in which prices are generally expected to rise. Compare bear markets, which are those in which prices are expected to fall.'
        else:
            verdict = 'This stock was bearish at that time. 🐻'
            text = 'A bear market is when a market experiences prolonged price declines. It typically describes a condition in which securities prices fall 20% or more from recent highs amid widespread pessimism and negative investor sentiment. A bear market is one in which prices are generally expected to fall. Compare bullish markets, which are those in which prices are expected to rise.'

        st.header('Verdict')
        st.subheader(verdict)
        st.write(text)

# except value 
except IndexError:
    st.error('Starting date must be before ending date')
'''
        
        st.header('Source')
        st.subheader('Data source: Yahoo Finance')
        st.write('Click in the button below to the check the source code')
        col1, col2, col_3 = st.columns(3)
        if col2.button('Source code'):
            st.code(code)
except IndexError:
    st.error('Starting date must be before ending date')
