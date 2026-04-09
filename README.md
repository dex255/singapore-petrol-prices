# Singapore Petrol Prices & Pump Comparison Tool

Welcome to the **Singapore Petrol Prices** tracker. This open-source repository provides a real-time, highly visual comparison of the latest fuel costs across all major petrol brands in Singapore: **Esso, Shell, SPC, Caltex, and Sinopec**. 

By intelligently scraping and archiving pump prices daily, motorists are empowered to find the cheapest petrol today and track pricing trends over time.

## 🌟 Key Features

* **Real-Time Price Board:** Instantly compare current Singapore petrol prices for all fuel grades including **92-Octane, 95-Octane, 98-Octane, Premium Unleaded**, and **Diesel**.
* **Loyalty Discount Estimator:** Seamlessly toggle "Loyalty Points Discounts" to view estimated net pump prices after base loyalty points and common tier credit card discounts are applied.
* **Historical Trend Charts:** Analyze fuel price fluctuations with interactive charts. Filter by fuel grade (e.g., 95 Octane vs Diesel) and time horizons (Past 7 Days, 3 Months, 12 Months).
* **Price Fluctuation Indicators:** Quickly spot overnight price drops (highlighted in bold green) and price hikes (highlighted in bold red).

## 🚀 How It Works

1. **Scraping Engine:** A lightweight Node.js script leverages `cheerio` and `axios` to scrape the latest petrol prices.
2. **Data Storage:** The output is structured and appended to our historical database at `prices.json`.
3. **Frontend UI:** A responsive, vanilla HTML/CSS/JS frontend reads `prices.json` to dynamically generate comparison tables, tooltips, and interactive Chart.js line graphs.
4. **Automation:** The `.github/workflows/update-prices.yml` workflow orchestrates the entire process autonomously, committing fresh data directly back to this repository without manual intervention.

## 🛠️ Tech Stack

* **Frontend:** HTML5, Modern CSS (Flexbox/Grid), Vanilla JavaScript (ES6+), [Chart.js](https://www.chartjs.org/)
* **Backend / Scraping:** [Node.js](https://nodejs.org/), `axios`, `cheerio`
* **CI/CD & Hosting:** GitHub Actions, GitHub Pages

## 💻 Local Development

Want to run this petrol price tracker locally? It's simple!

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dex255/singapore-petrol-prices.git
   cd singapore-petrol-prices
   ```

2. **Install dependencies (for the scraper):**
   ```bash
   npm install
   ```

3. **Run the local scraper (Optional):**
   ```bash
   node scraper.js
   ```

4. **Launch the Frontend:**
   Use any local web server to serve `index.html`. For example:
   ```bash
   npx serve .
   ```
   Navigate to `http://localhost:3000` to view the app!


## 📝 Disclaimer

*Data sourced dynamically for informational purposes. Actual pump prices and valid discounts may vary by physical station locations and user credit card tiers.*
