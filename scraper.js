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

        // Extract trend data from script
        const scripts = doc.querySelectorAll('script');
        let trendData = null;
        for (const script of scripts) {
            const content = script.textContent;
            if (content.includes('Chartkick["LineChart"]')) {
                const match = content.match(/new Chartkick\["LineChart"\]\s*\(\s*["']chart-1["']\s*,\s*(\[.*?\])\s*,\s*\{/s);
                if (match && match[1]) {
                    try {
                        // The data is almost JSON but might have single quotes or unquoted keys
                        // We use a safe-ish evaluation or a more robust regex-based fix
                        // For simplicity, we'll try a basic fix for single quotes
                        const jsonStr = match[1].replace(/'/g, '"');
                        trendData = JSON.parse(jsonStr);
                    } catch (e) {
                        console.warn('Failed to parse trend data strictly:', e.message);
                        // Fallback: try to capture the raw string if parsing fails
                        trendData = match[1];
                    }
                }
                break;
            }
        }

        data.trends = trendData;

        fs.writeFileSync('prices.json', JSON.stringify(data, null, 2));
        console.log('Prices saved to prices.json');
        console.log('Count:', data.prices.length);
    } catch (error) {
        console.error('Scraper Error:', error.message);
        process.exit(1);
    }
}

scrapePetrolPrices();
