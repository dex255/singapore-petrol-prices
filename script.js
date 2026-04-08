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

        const globalTooltip = document.getElementById('global-loyalty-tooltip');
        
        const showGlobalTooltip = (e) => {
            const el = e.currentTarget;
            if (!globalTooltip) return;
            
            globalTooltip.innerHTML = `
                <span class="tooltip-title">${el.dataset.brandname}</span>
                <div class="tooltip-row">
                    <span class="tooltip-label">Earn Rate:</span>
                    <span>${el.dataset.earn}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Rewards:</span>
                    <span>${el.dataset.redeem}</span>
                </div>
            `;
            
            const rect = el.getBoundingClientRect();
            globalTooltip.style.left = (rect.left + rect.width / 2 + window.scrollX) + 'px';
            globalTooltip.style.top = (rect.bottom + window.scrollY + 10) + 'px';
            
            globalTooltip.classList.add('visible');
        };

        const hideGlobalTooltip = () => {
            if (globalTooltip) globalTooltip.classList.remove('visible');
        };

        // Price comparison tooltip (untoggled state)
        let priceTooltipEl = document.getElementById('global-price-tooltip');
        if (!priceTooltipEl) {
            priceTooltipEl = document.createElement('div');
            priceTooltipEl.id = 'global-price-tooltip';
            document.body.appendChild(priceTooltipEl);
        }

        const showPriceTooltip = (e) => {
            const el = e.currentTarget;
            const text = el.dataset.priceTooltip;
            if (!text) return;

            priceTooltipEl.textContent = text;
            const rect = el.getBoundingClientRect();
            priceTooltipEl.style.left = (rect.left + rect.width / 2 + window.scrollX) + 'px';
            priceTooltipEl.style.top = (rect.bottom + window.scrollY + 8) + 'px';
            priceTooltipEl.classList.add('visible');
        };

        const hidePriceTooltip = () => {
            priceTooltipEl.classList.remove('visible');
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

                    // Calculate price change percentage from trends
                    const gradeTrends = data.trends[row.grade] || data.trends[row.grade.toLowerCase()] || [];
                    const brandTrend = gradeTrends.find(t => t.name.toLowerCase() === brand.toLowerCase());
                    let changePct = 0;
                    let prevDataDate = null;
                    if (brandTrend && brandTrend.data.length >= 2) {
                        const prevEntry = brandTrend.data[brandTrend.data.length - 2];
                        const prevPrice = prevEntry[1];
                        prevDataDate = prevEntry[0]; // date string of previous data point
                        if (prevPrice > 0) {
                            changePct = ((originalPrice - prevPrice) / prevPrice) * 100;
                        }
                    }
                    
                    return { 
                        brand, 
                        original: originalPrice, 
                        display: parseFloat(displayPrice.toFixed(3)), 
                        isNull: false,
                        changePct: changePct,
                        prevDataDate: prevDataDate
                    };
                });

                const validDisplayPrices = processedPrices.filter(p => !p.isNull).map(p => p.display);
                // (cheapest highlighting removed per user request)

                processedPrices.forEach((p, idx) => {
                    const td = document.createElement('td');
                    
                    if (p.isNull) {
                        td.textContent = 'N/A';
                        td.classList.add('price-null');
                    } else {
                        const container = document.createElement('div');
                        container.classList.add('price-container');

                        const priceEl = document.createElement('div');
                        priceEl.classList.add('pump-price');
                        priceEl.textContent = `$${p.display.toFixed(2)}`;
                        
                        // Apply change indicators as a SEPARATE sibling element
                        if (p.changePct > 0.001) {
                            const changeSpan = document.createElement('div');
                            changeSpan.classList.add('price-change-pct', 'price-change-up');
                            changeSpan.textContent = `▲ +${p.changePct.toFixed(1)}%`;
                            container.appendChild(priceEl);
                            container.appendChild(changeSpan);
                        } else if (p.changePct < -0.001) {
                            const changeSpan = document.createElement('div');
                            changeSpan.classList.add('price-change-pct', 'price-change-down');
                            changeSpan.textContent = `▼ ${p.changePct.toFixed(1)}%`;
                            container.appendChild(priceEl);
                            container.appendChild(changeSpan);
                        } else {
                            const changeSpan = document.createElement('div');
                            changeSpan.classList.add('price-change-pct', 'price-change-none');
                            changeSpan.textContent = '-';
                            container.appendChild(priceEl);
                            container.appendChild(changeSpan);
                        }

                        // No cheapest highlighting per user request

                        // In untoggled state: show comparison tooltip on hover
                        if (!isLoyaltyEnabled && p.prevDataDate) {
                            container.dataset.priceTooltip = `Compared to 1 hour ago`;
                            container.addEventListener('mouseenter', showPriceTooltip);
                            container.addEventListener('mouseleave', hidePriceTooltip);
                            container.style.cursor = 'help';
                        }

                        if (isLoyaltyEnabled) {
                            const detailsEl = document.createElement('div');
                            detailsEl.classList.add('price-details');

                            const originalEl = document.createElement('span');
                            originalEl.classList.add('original-price');
                            originalEl.textContent = `$${p.original.toFixed(2)}`;
                            detailsEl.appendChild(originalEl);

                            const infoEl = document.createElement('span');
                            infoEl.classList.add('loyalty-discount-info');
                            
                            // Shorten labels on mobile or standard to fit
                            let label = loyaltyLabels[p.brand];
                            if (label.includes('Points')) label = label.replace('Points', 'Pts');
                            infoEl.textContent = label;
                            
                            detailsEl.appendChild(infoEl);
                            container.appendChild(detailsEl);

                            // Setup Global Tooltip Trigger
                            const details = loyaltyProgramDetails[p.brand];
                            if (details) {
                                container.dataset.brandname = details.name;
                                container.dataset.earn = details.earn;
                                container.dataset.redeem = details.redeem;
                                
                                container.addEventListener('mouseenter', showGlobalTooltip);
                                container.addEventListener('mouseleave', hideGlobalTooltip);
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
        const loyaltyContainer = document.getElementById('loyalty-toggle-container');
        loyaltyContainer.addEventListener('click', () => {
            loyaltyToggle.checked = !loyaltyToggle.checked;
            renderPriceTable();
        });

        const infoTooltip = document.querySelector('.info-tooltip-container');
        if (infoTooltip) {
            infoTooltip.addEventListener('click', (e) => {
                e.stopPropagation(); // Don't toggle the button when clicking the info icon
            });
        }

        loyaltyToggle.addEventListener('change', (e) => {
            e.stopPropagation(); // Prevent double trigger if container click also fired
            renderPriceTable();
        });

        // Render Trend Chart
        if (data.trends) {
            let currentChart = null;
            let currentGrade = '95';
            let currentRange = 90; // Default: 3 MONTHS
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
            updateTrendChart('95', 90);

            // Hook up filter dropdowns
            const gradeSelect = document.getElementById('grade-select');
            const rangeSelect = document.getElementById('range-select');

            gradeSelect.addEventListener('change', (e) => {
                updateTrendChart(e.target.value, currentRange);
            });

            rangeSelect.addEventListener('change', (e) => {
                updateTrendChart(currentGrade, parseInt(e.target.value));
            });
        }

        // Update FAQ dynamic prices
        const updateFAQs = () => {
            const grades = [
                { grade: '95', id: 'faq-95-price', name: 'grade 95 petrol' },
                { grade: 'Diesel', id: 'faq-diesel-price', name: 'diesel' },
                { grade: 'Premium', id: 'faq-premium-price', name: 'premium petrol' }
            ];

            grades.forEach(({ grade, id, name }) => {
                const row = data.prices.find(p => p.grade === grade);
                const el = document.getElementById(id);
                if (row && el) {
                    const prices = ['Esso', 'Shell', 'SPC', 'Caltex', 'Sinopec']
                        .map(b => row[b])
                        .filter(p => p && p !== '-')
                        .map(p => parseFloat(p.replace('$', '')));
                    
                    if (prices.length > 0) {
                        const min = Math.min(...prices).toFixed(2);
                        const max = Math.max(...prices).toFixed(2);
                        if (min === max) {
                            el.innerHTML = `The current price for ${name} is <strong>$${min}</strong> per litre.`;
                        } else {
                            el.innerHTML = `The current price for ${name} ranges from <strong>$${min}</strong> to <strong>$${max}</strong> per litre across major stations.`;
                        }
                    } else {
                        el.innerHTML = `Data for ${name} is currently unavailable.`;
                    }
                }
            });

            // Overall cheapest
            let overallCheapestGrade = '';
            let overallCheapestPrice = Infinity;
            
            data.prices.forEach(row => {
                if (row.grade !== 'Diesel' && row.grade !== 'Premium') {
                    const prices = ['Esso', 'Shell', 'SPC', 'Caltex', 'Sinopec']
                        .map(b => row[b])
                        .filter(p => p && p !== '-')
                        .map(p => parseFloat(p.replace('$', '')));
                    
                    if (prices.length > 0) {
                        const min = Math.min(...prices);
                        if (min < overallCheapestPrice) {
                            overallCheapestPrice = min;
                            overallCheapestGrade = row.grade;
                        }
                    }
                }
            });
            
            const cheapestEl = document.getElementById('faq-cheapest-overall');
            if (cheapestEl && overallCheapestPrice !== Infinity) {
                cheapestEl.innerHTML = `The cheapest petrol grade available today is <strong>Grade ${overallCheapestGrade}</strong> starting at <strong>$${overallCheapestPrice.toFixed(2)}</strong> per litre.`;
            }

            // Grade 98 specific
            const row98 = data.prices.find(p => p.grade === '98');
            const el98 = document.getElementById('faq-98-cheapest');
            if (row98 && el98) {
                let minPrice98 = Infinity;
                let cheapestBrands98 = [];
                
                ['Esso', 'Shell', 'SPC', 'Caltex', 'Sinopec'].forEach(b => {
                    const priceStr = row98[b];
                    if (priceStr && priceStr !== '-') {
                        const price = parseFloat(priceStr.replace('$', ''));
                        if (price < minPrice98) {
                            minPrice98 = price;
                            cheapestBrands98 = [b];
                        } else if (price === minPrice98) {
                            cheapestBrands98.push(b);
                        }
                    }
                });
                
                if (minPrice98 !== Infinity) {
                    const brandsStr = cheapestBrands98.join(' and ');
                    el98.innerHTML = `For Grade 98, the lowest price is <strong>$${minPrice98.toFixed(2)}</strong> per litre, currently offered by <strong>${brandsStr}</strong>.`;
                }
            }
        };
        updateFAQs();

    } catch (error) {
        console.error('Error loading prices:', error);
        document.getElementById('updated-date').textContent = 'Error loading data. Please try again later.';
    }
});
