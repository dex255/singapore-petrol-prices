document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('prices.json');
        const data = await response.json();
        
        const priceTable = document.getElementById('price-data');
        const updatedDate = document.getElementById('updated-date');

        // Formatted date string
        const date = new Date(data.updatedAt);
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        updatedDate.textContent = `Last updated: ${date.toLocaleDateString('en-SG', options)}`;

        // Render table rows
        priceTable.innerHTML = '';
        data.prices.forEach(row => {
            const tr = document.createElement('tr');
            
            // Grade cell
            const tdGrade = document.createElement('td');
            tdGrade.classList.add('grade-column');
            tdGrade.textContent = row.grade;
            tr.appendChild(tdGrade);

            // Brand cells
            ['Esso', 'Shell', 'SPC', 'Caltex', 'Sinopec'].forEach(brand => {
                const td = document.createElement('td');
                const price = row[brand];
                if (!price || price === '-') {
                    td.textContent = 'N/A';
                    td.classList.add('price-null');
                } else {
                    td.textContent = price;
                }
                tr.appendChild(td);
            });

            priceTable.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading prices:', error);
        document.getElementById('updated-date').textContent = 'Error loading data. Please try again later.';
    }
});
