# Superstore Sales Dashboard

## Overview

The **Superstore Sales Dashboard** is an interactive web application built using **Streamlit** and **Plotly**. This dashboard allows users to perform exploratory data analysis on a retail dataset, visualizing sales trends, category performance, and regional insights.

## Features

- **File Upload:** Upload your CSV file for analysis.
- **Date Range Filter:** Select a start and end date to filter sales data.
- **Dynamic Filtering:** Filter data by region, state, and city using sidebar selections.
- **Sales Visualizations:**
  - Bar charts for category-wise sales.
  - Pie charts for regional and segment sales distribution.
  - Line charts for time series sales analysis.
  - Treemaps for hierarchical view of sales.
- **Data Download:** Options to download filtered datasets as CSV files.
- **Scatter Plot:** Visualize the relationship between sales and profits.
- **Pivot Table:** Month-wise sub-category sales summary.

## Requirements

- Python 3.x
- Streamlit
- Pandas
- Plotly

## Installation

To install the required packages, run:

```bash
pip install streamlit pandas plotly
```

## Usage

1. **Run the App:**  
   Start the Streamlit server by navigating to your project directory and running:

   ```bash
   streamlit run app.py
   ```

## Usage

1. **Upload Dataset:**  
   Use the file uploader to upload your CSV file containing the sales data.

2. **Filter Data:**  
   Use the date picker and sidebar filters to refine your dataset.

3. **Explore Visualizations:**  
   View various charts and insights to understand sales trends and performance metrics.

4. **Download Data:**  
   Click on the download buttons to save the filtered data as CSV files.

## Example Dataset

For demonstration purposes, you can use the `Superstore.xls` dataset, which is referenced in the code. 

## Note

Make sure to check the dataset format to match the expected column names (like `Order Date`, `Sales`, `Region`, etc.) for accurate results.

## Contributing

If you'd like to contribute to the development of this dashboard, feel free to submit a pull request or open an issue.

## License

This project is licensed under the MIT License.

