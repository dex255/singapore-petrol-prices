document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('prices.json');
        const data = await response.json();
        
        const priceTable = document.getElementById('price-data');
        const updatedDate = document.getElementById('updated-date');
        const loyaltyToggle = document.getElementById('loyalty-toggle');

        const getLoyaltyDiscount = (brand, grade, originalPrice) => {
            const gradesLower = grade.toLowerCase();
            const isPremium = gradesLower.includes('premium') || gradesLower.includes('98');

            switch (brand) {
                case 'Esso':
                    return 0.04; // Best rate: 750 pts = $30 ($0.04/L)
                case 'Shell':
                    // 1.2 pts for Premium/98, 1 pt for FuelSave
                    // 300 pts = $10 ($0.033/pt)
                    return isPremium ? (1.2 * 0.0333) : (1 * 0.0333);
                case 'Caltex':
                    return 0.02; // 2 Linkpoints / L, 100 pts = $1
                case 'Sinopec':
                    // 1.5 pts for Premium/98, 1 pt for others
                    // 90 pts = $3 ($0.033/pt)
                    return isPremium ? (1.5 * 0.0333) : (1 * 0.0333);
                case 'SPC':
                    // SPC&U/SPC+ focus on coupons (e.g. $5 off $60 which is ~8.3% off)
                    return originalPrice ? (originalPrice * (5 / 60)) : 0.28;
                default:
                    return 0;
            }
        };

        const loyaltyLabels = {
            'Esso': 'Smiles Points',
            'Shell': 'Shell GO+ Pts',
            'SPC': 'SPC&U Coupon',
            'Caltex': 'Link Rewards',
            'Sinopec': 'X Card Pts'
        };

        const loyaltyProgramDetails = {
            'Esso': {
                name: 'Smiles Rewards',
                earn: '1 Smiles Point per litre',
                redeem: 'Instant fuel: 300 pts ($10), 750 pts ($30)'
            },
            'Shell': {
                name: 'Shell GO+',
                earn: '1 pt per litre (FuelSave), 1.2 pts (V-Power)',
                redeem: '300 Shell GO+ Points = $10 Instant Off'
            },
            'SPC': {
                name: 'SPC Membership',
                earn: 'Spend-based Membership Rewards',
                redeem: 'Varies by coupon; common: $5 off $60 fuel'
            },
            'Caltex': {
                name: 'Link Rewards',
                earn: '2 Linkpoints per litre',
                redeem: '100 Linkpoints = $1 off fuel'
            },
            'Sinopec': {
                name: 'X Card Loyalty',
                earn: '1–1.5 X Card points per litre',
                redeem: '90 X Card points = $3 off fuel'
            }
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
                    if (isLoyaltyEnabled) {
                        const discount = getLoyaltyDiscount(brand, row.grade, originalPrice);
                        displayPrice = originalPrice - discount;
                    }
                    
                    return { brand, original: originalPrice, display: parseFloat(displayPrice.toFixed(3)), isNull: false };
                });

                const validDisplayPrices = processedPrices.filter(p => !p.isNull).map(p => p.display);
                const minPrice = validDisplayPrices.length > 0 ? Math.min(...validDisplayPrices) : null;

                processedPrices.forEach((p, idx) => {
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
                            infoEl.textContent = loyaltyLabels[p.brand];
                            container.appendChild(infoEl);

                            // Tooltip for loyalty program details
                            const details = loyaltyProgramDetails[p.brand];
                            if (details) {
                                const tooltip = document.createElement('div');
                                tooltip.classList.add('loyalty-tooltip');
                                tooltip.innerHTML = `
                                    <span class="tooltip-title">${details.name}</span>
                                    <div class="tooltip-row">
                                        <span class="tooltip-label">Earn Rate:</span>
                                        <span>${details.earn}</span>
                                    </div>
                                    <div class="tooltip-row">
                                        <span class="tooltip-label">Rewards:</span>
                                        <span>${details.redeem}</span>
                                    </div>
                                `;
                                container.appendChild(tooltip);
                            }
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
            let currentGrade = '95';
            let currentRange = 900; // Default: 30 Months (All)
            const ctx = document.getElementById('trend-chart').getContext('2d');
            
            const brandColors = {
                'Esso': '#d32f2f',
                'Shell': '#fbc02d',
                'SPC': '#1976d2',
                'Caltex': '#388e3c',
                'Sinopec': '#e64a19'
            };

            const updateTrendChart = (grade, days) => {
                currentGrade = grade || currentGrade;
                currentRange = days || currentRange;

                const trendData = JSON.parse(JSON.stringify(data.trends[currentGrade])); // Deep copy
                if (!trendData || trendData.length === 0) return;

                // Filter data by days
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - currentRange);

                trendData.forEach(brand => {
                    brand.data = brand.data.filter(item => {
                        const itemDate = new Date(item[0]);
                        return itemDate >= cutoffDate;
                    });
                });

                // Remove brands with no data in range
                const filteredTrendData = trendData.filter(brand => brand.data.length > 0);
                if (filteredTrendData.length === 0) {
                    if (currentChart) currentChart.destroy();
                    return;
                }

                if (currentChart) {
                    currentChart.destroy();
                }

                const labels = filteredTrendData[0].data.map(item => item[0]);
                const datasets = filteredTrendData.map(brand => ({
                    label: brand.name,
                    data: brand.data.map(item => item[1]),
                    borderColor: brandColors[brand.name] || '#666',
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    pointRadius: filteredTrendData[0].data.length > 30 ? 0 : 3
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
                                title: { display: true, text: 'Price (S$)', font: { size: 10 } },
                                ticks: { font: { size: 10 } }
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
            updateTrendChart('95', 900);

            // Hook up filter buttons
            const gradeButtons = document.querySelectorAll('#grade-filters .filter-btn');
            gradeButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    gradeButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    updateTrendChart(btn.dataset.grade, currentRange);
                });
            });

            const rangeButtons = document.querySelectorAll('#range-filters .range-btn');
            rangeButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    rangeButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    updateTrendChart(currentGrade, parseInt(btn.dataset.range));
                });
            });
        }
    } catch (error) {
        console.error('Error loading prices:', error);
        document.getElementById('updated-date').textContent = 'Error loading data. Please try again later.';
    }
});
