document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('prices.json');
        const data = await response.json();
        
        const priceTable = document.getElementById('price-data');
        const updatedDate = document.getElementById('updated-date');
        const loyaltyToggle = document.getElementById('loyalty-toggle');

        const loyaltyPrograms = {
            'Esso': { discount: 0.04, label: 'Smiles Rewards' },
            'Shell': { discount: 0.02, label: 'Shell GO+' },
            'SPC': { discount: 0.03, label: 'Member Rewards' },
            'Caltex': { discount: 0.02, label: 'Linkpoints' },
            'Sinopec': { discount: 0.033, label: 'X Card' }
        };

        // Formatted date string
        const date = new Date(data.updatedAt);
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        updatedDate.textContent = `Last updated: ${date.toLocaleDateString('en-SG', options)}`;

        const renderPriceTable = () => {
            const isLoyaltyEnabled = loyaltyToggle.checked;
            priceTable.innerHTML = '';
            
            data.prices.forEach(row => {
                const tr = document.createElement('tr');
                
                // Grade cell
                const tdGrade = document.createElement('td');
                tdGrade.classList.add('grade-column');
                tdGrade.textContent = row.grade;
                tr.appendChild(tdGrade);

                // Brand cells
                const brands = ['Esso', 'Shell', 'SPC', 'Caltex', 'Sinopec'];
                
                // Calculate display prices and find min
                const processedPrices = brands.map(brand => {
                    const priceStr = row[brand];
                    const originalPrice = (priceStr && priceStr !== '-') ? parseFloat(priceStr.replace('$', '')) : NaN;
                    
                    if (isNaN(originalPrice)) return { brand, original: NaN, display: NaN, isNull: true };
                    
                    let displayPrice = originalPrice;
                    if (isLoyaltyEnabled && loyaltyPrograms[brand]) {
                        displayPrice = originalPrice - loyaltyPrograms[brand].discount;
                    }
                    
                    return { brand, original: originalPrice, display: parseFloat(displayPrice.toFixed(3)), isNull: false };
                });

                const validDisplayPrices = processedPrices.filter(p => !p.isNull).map(p => p.display);
                const minPrice = validDisplayPrices.length > 0 ? Math.min(...validDisplayPrices) : null;

                processedPrices.forEach(p => {
                    const td = document.createElement('td');
                    
                    if (p.isNull) {
                        td.textContent = 'N/A';
                        td.classList.add('price-null');
                    } else {
                        const container = document.createElement('div');
                        container.classList.add('price-container');

                        const priceEl = document.createElement('div');
                        priceEl.textContent = `$${p.display.toFixed(2)}`;
                        if (minPrice !== null && p.display === minPrice) {
                            td.classList.add('price-cheapest');
                        }
                        container.appendChild(priceEl);

                        if (isLoyaltyEnabled) {
                            const originalEl = document.createElement('div');
                            originalEl.classList.add('original-price');
                            originalEl.textContent = `$${p.original.toFixed(2)}`;
                            container.appendChild(originalEl);

                            const infoEl = document.createElement('div');
                            infoEl.classList.add('loyalty-discount-info');
                            infoEl.textContent = loyaltyPrograms[p.brand].label;
                            container.appendChild(infoEl);
                        }

                        td.appendChild(container);
                    }
                    tr.appendChild(td);
                });

                priceTable.appendChild(tr);
            });
        };

        // Initial render
        renderPriceTable();

        // Toggle listener
        loyaltyToggle.addEventListener('change', renderPriceTable);

        // Render Trend Chart
        if (data.trends) {
            let currentChart = null;
            const ctx = document.getElementById('trend-chart').getContext('2d');
            
            const brandColors = {
                'Esso': '#d32f2f',
                'Shell': '#fbc02d',
                'SPC': '#1976d2',
                'Caltex': '#388e3c',
                'Sinopec': '#e64a19'
            };

            const updateTrendChart = (grade) => {
                const trendData = data.trends[grade];
                if (!trendData || trendData.length === 0) return;

                if (currentChart) {
                    currentChart.destroy();
                }

                const labels = trendData[0].data.map(item => item[0]);
                const datasets = trendData.map(brand => ({
                    label: brand.name,
                    data: brand.data.map(item => item[1]),
                    borderColor: brandColors[brand.name] || '#666',
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    pointRadius: 2
                }));

                currentChart = new Chart(ctx, {
                    type: 'line',
                    data: { labels, datasets },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: { font: { size: 10 } }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: false,
                                title: { display: true, text: 'Price (S$)' }
                            },
                            x: {
                                ticks: {
                                    maxRotation: 45,
                                    minRotation: 45,
                                    font: { size: 9 },
                                    autoSkip: true,
                                    maxTicksLimit: 12
                                }
                            }
                        }
                    }
                });
            };

            // Initial chart
            updateTrendChart('95');

            // Hook up filter buttons
            const buttons = document.querySelectorAll('.filter-btn');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    buttons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    updateTrendChart(btn.dataset.grade);
                });
            });
        }
    } catch (error) {
        console.error('Error loading prices:', error);
        document.getElementById('updated-date').textContent = 'Error loading data. Please try again later.';
    }
});
