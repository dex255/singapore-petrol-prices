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
        function extractTrendData(content) {
            // Updated regex to be more flexible (handles escaped quotes in AJAX responses)
            const match = content.match(/new Chartkick\[.*?LineChart.*?\]\s*\(\s*.*?chart-1.*?\s*,\s*(\[.*?\])\s*,\s*\{/s);
            if (match && match[1]) {
                try {
                    // Remove escaping backslashes if present
                    let cleaned = match[1].replace(/\\"/g, '"').replace(/\\'/g, "'");
                    // Still fix single quotes to double quotes for JSON.parse
                    cleaned = cleaned.replace(/'/g, '"');
                    return JSON.parse(cleaned);
                } catch (e) {
                    console.warn('Strict JS parse failed, returning raw string');
                    return match[1];
                }
            }
            return null;
        }

        // Fetch all trends
        const grades = ['92', '95', '98', 'premium', 'diesel'];
        data.trends = {};
        
        for (const grade of grades) {
            console.log(`Fetching trend via AJAX for ${grade}...`);
            try {
                // Sleep to avoid rate limiting
                await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
                
                // Using AJAX headers to ensure we get the unique data for each grade
                const url = `https://www.motorist.sg/petrol-prices?grade=${grade}&date_range=6`;
                const gRes = await fetch(url, {
                    headers: { 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                const gContent = await gRes.text();
                data.trends[grade] = extractTrendData(gContent);
                console.log(`Successfully fetched trend for ${grade} (${(data.trends[grade] ? 'Found' : 'Missing')})`);
            } catch (err) {
                console.error(`Failed to fetch trend for ${grade}:`, err.message);
            }
        }

        const date = new Date(data.updatedAt);
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        
        fs.writeFileSync('prices.json', JSON.stringify(data, null, 2));
        console.log('Prices and trends saved to prices.json');

        // Update index.html with the last updated date for SEO/Initial Load
        const indexHtml = fs.readFileSync('index.html', 'utf8');
        const updatedIndexHtml = indexHtml.replace(
            /<p id="updated-date">.*?<\/p>/,
            `<p id="updated-date">Last updated: ${date.toLocaleDateString('en-SG', options)}</p>`
        );
        fs.writeFileSync('index.html', updatedIndexHtml);
        console.log('index.html updated with latest date');

        console.log('Count:', data.prices.length);
    } catch (error) {
        console.error('Scraper Error:', error.message);
        process.exit(1);
    }
}

scrapePetrolPrices();
