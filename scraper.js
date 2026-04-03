const { JSDOM } = require('jsdom');
const fs = require('fs');

async function scrapePetrolPrices() {
    try {
        console.log('Fetching motorist.sg...');
        const response = await fetch('https://www.motorist.sg/petrol-prices');
        const html = await response.text();
        const dom = new JSDOM(html);
        const doc = dom.window.document;

        // The table has class .fuel_comparison_table
        const table = doc.querySelector('.fuel_comparison_table');
        if (!table) {
            console.error('Table .fuel_comparison_table not found in the HTML');
            process.exit(1);
        }

        // We want the rows with pump prices. They are in tbody.
        const rows = table.querySelectorAll('tbody tr.text-center');
        const data = {
            updatedAt: new Date().toISOString(),
            prices: []
        };

        const brands = ['Esso', 'Shell', 'SPC', 'Caltex', 'Sinopec'];

        rows.forEach(row => {
            const gradeCell = row.querySelector('td.text-left');
            if (!gradeCell) return; // Skip rows without grade
            
            const grade = gradeCell.textContent.trim();
            const cells = row.querySelectorAll('td');
            
            // Check if this row actually has prices (at least 6 cells: grade + 5 brands)
            if (cells.length < 6) return;

            const brandPrices = {};
            brands.forEach((brand, index) => {
                // The price is in cell index+1
                const price = cells[index + 1].textContent.trim();
                brandPrices[brand] = (price === '-' || price === '') ? null : price;
            });

            data.prices.push({
                grade,
                ...brandPrices
            });
        });

        // Extraction helper
        function extractTrendData(htmlContent) {
            const tempDoc = new JSDOM(htmlContent).window.document;
            const scriptsArr = tempDoc.querySelectorAll('script');
            for (const script of scriptsArr) {
                const content = script.textContent;
                if (content.includes('Chartkick["LineChart"]')) {
                    const match = content.match(/new Chartkick\["LineChart"\]\s*\(\s*["']chart-1["']\s*,\s*(\[.*?\])\s*,\s*\{/s);
                    if (match && match[1]) {
                        try {
                            const jsonStr = match[1].replace(/'/g, '"');
                            return JSON.parse(jsonStr);
                        } catch (e) {
                            return match[1];
                        }
                    }
                }
            }
            return null;
        }

        // Fetch all trends
        const grades = ['92', '95', '98', 'premium', 'diesel'];
        data.trends = {};
        
        for (const grade of grades) {
            console.log(`Fetching trend for ${grade}...`);
            try {
                // We add random sleep to be nice
                await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
                const url = `https://www.motorist.sg/petrol-prices?grade=${grade}&date_range=6`;
                const gRes = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                const gHtml = await gRes.text();
                data.trends[grade] = extractTrendData(gHtml);
                console.log(`Successfully fetched trend for ${grade}`);
            } catch (err) {
                console.error(`Failed to fetch trend for ${grade}:`, err.message);
            }
        }

        fs.writeFileSync('prices.json', JSON.stringify(data, null, 2));
        console.log('Prices and trends saved to prices.json');
        console.log('Count:', data.prices.length);
    } catch (error) {
        console.error('Scraper Error:', error.message);
        process.exit(1);
    }
}

scrapePetrolPrices();
