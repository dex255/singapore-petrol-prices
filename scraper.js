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

        if (data.prices.length === 0) {
            throw new Error('No prices extracted');
        }

        fs.writeFileSync('prices.json', JSON.stringify(data, null, 2));
        console.log('Prices saved to prices.json');
        console.log('Count:', data.prices.length);
    } catch (error) {
        console.error('Scraper Error:', error.message);
        process.exit(1);
    }
}

scrapePetrolPrices();
