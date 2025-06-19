// Global variables
let masterDatabase = JSON.parse(localStorage.getItem('masterDatabase')) || [];
let personalCollection = JSON.parse(localStorage.getItem('personalCollection')) || [];
let bulkSetInfo = {};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    displayDatabase();
    displayCollection();
    updateStats();
});

// Navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('[id$="-section"]').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    document.getElementById(sectionName + '-section').classList.remove('hidden');
    
    // Update active button
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

// Image preview
function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(previewId);
            preview.src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Add card to database
document.getElementById('add-database-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const card = {
        id: Date.now(),
        type: document.getElementById('db-card-type').value,
        year: parseInt(document.getElementById('db-card-year').value),
        set: document.getElementById('db-card-set').value,
        number: document.getElementById('db-card-number').value,
        name: document.getElementById('db-card-name').value,
        frontImage: document.getElementById('db-front-preview').src || null,
        backImage: document.getElementById('db-back-preview').src || null
    };
    
    // Check if card already exists
    const exists = masterDatabase.find(c => 
        c.type === card.type && 
        c.year === card.year && 
        c.set === card.set && 
        c.number === card.number
    );
    
    if (exists) {
        alert('This card already exists in the database!');
        return;
    }
    
    masterDatabase.push(card);
    saveMasterDatabase();
    displayDatabase();
    updateStats();
    
    // Reset form
    this.reset();
    document.getElementById('db-front-preview').classList.add('hidden');
    document.getElementById('db-back-preview').classList.add('hidden');
    
    alert('Card added to master database successfully!');
});

// Bulk add to database functions
function startBulkDatabaseAdd() {
    const type = document.getElementById('bulk-db-type').value;
    const year = document.getElementById('bulk-db-year').value;
    const set = document.getElementById('bulk-db-set').value;
    
    if (!type || !year || !set) {
        alert('Please fill in all set information fields');
        return;
    }
    
    bulkSetInfo = { type, year: parseInt(year), set };
    document.getElementById('bulk-db-cards-section').classList.remove('hidden');
    addBulkDatabaseCardRow();
}

function addBulkDatabaseCardRow() {
    const container = document.getElementById('bulk-db-cards-container');
    const cardRow = document.createElement('div');
    cardRow.className = 'form-row';
    cardRow.innerHTML = `
        <div class="form-group">
            <input type="text" placeholder="Card Number" required>
        </div>
        <div class="form-group">
            <input type="text" placeholder="Card Name" required>
        </div>
        <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()">Remove</button>
    `;
    container.appendChild(cardRow);
}

function saveBulkDatabaseCards() {
    const rows = document.querySelectorAll('#bulk-db-cards-container .form-row');
    let cardsAdded = 0;
    
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const number = inputs[0].value;
        const name = inputs[1].value;
        
        if (number && name) {
            // Check if card already exists
            const exists = masterDatabase.find(c => 
                c.type === bulkSetInfo.type && 
                c.year === bulkSetInfo.year && 
                c.set === bulkSetInfo.set && 
                c.number === number
            );
            
            if (!exists) {
                const card = {
                    id: Date.now() + cardsAdded,
                    type: bulkSetInfo.type,
                    year: bulkSetInfo.year,
                    set: bulkSetInfo.set,
                    number: number,
                    name: name,
                    frontImage: null,
                    backImage: null
                };
                
                masterDatabase.push(card);
                cardsAdded++;
            }
        }
    });
    
    if (cardsAdded > 0) {
        saveMasterDatabase();
        displayDatabase();
        updateStats();
        
        // Reset bulk form
        document.getElementById('bulk-db-cards-container').innerHTML = '';
        document.getElementById('bulk-db-cards-section').classList.add('hidden');
        document.getElementById('bulk-db-type').value = '';
        document.getElementById('bulk-db-year').value = '';
        document.getElementById('bulk-db-set').value = '';
        
        alert(`${cardsAdded} cards added to master database successfully!`);
    } else {
        alert('No new cards were added (they may already exist in the database)');
    }
}

// Collection management
function addToCollection(cardId, condition = 'Good') {
    const existingIndex = personalCollection.findIndex(c => c.cardId === cardId);
    
    if (existingIndex >= 0) {
        personalCollection[existingIndex].condition = condition;
    } else {
        personalCollection.push({
            id: Date.now(),
            cardId: cardId,
            condition: condition,
            dateAdded: new Date().toISOString()
        });
    }
    
    savePersonalCollection();
    displayCollection();
    updateStats();
}

function removeFromCollection(cardId) {
    personalCollection = personalCollection.filter(c => c.cardId !== cardId);
    savePersonalCollection();
    displayCollection();
    updateStats();
}

function updateCondition(cardId, condition) {
    const collectionItem = personalCollection.find(c => c.cardId === cardId);
    if (collectionItem) {
        collectionItem.condition = condition;
        savePersonalCollection();
        displayCollection();
    }
}

function isInCollection(cardId) {
    return personalCollection.some(c => c.cardId === cardId);
}

function getCondition(cardId) {
    const item = personalCollection.find(c => c.cardId === cardId);
    return item ? item.condition : 'Good';
}

// Display functions
function displayDatabase() {
    const container = document.getElementById('database-display');
    
    if (masterDatabase.length === 0) {
        container.innerHTML = '<p>No cards in the database yet. Use "Add to Database" to start building the master catalog!</p>';
        return;
    }
    
    container.innerHTML = buildCardDisplay(masterDatabase, 'database');
}

function displayCollection() {
    const container = document.getElementById('collection-display');
    
    if (masterDatabase.length === 0) {
        container.innerHTML = '<p>No cards in the master database yet. Add some cards to the database first!</p>';
        return;
    }
    
    container.innerHTML = buildCardDisplay(masterDatabase, 'collection');
}

function buildCardDisplay(cards, viewType) {
    // Organize cards by type > year > set
    const organized = {};
    
    cards.forEach(card => {
        if (!organized[card.type]) organized[card.type] = {};
        if (!organized[card.type][card.year]) organized[card.type][card.year] = {};
        if (!organized[card.type][card.year][card.set]) organized[card.type][card.year][card.set] = [];
        organized[card.type][card.year][card.set].push(card);
    });
    
    let html = '';
    
    Object.keys(organized).sort().forEach(type => {
        html += `
            <div class="card-type-section">
                <div class="card-type-header" onclick="toggleSection(this)">
                    <h3>${type}</h3>
                    <span>▼</span>
                </div>
                <div class="card-type-content">
        `;
        
        Object.keys(organized[type]).sort((a, b) => b - a).forEach(year => {
            html += `
                <div class="year-section">
                    <div class="year-header" onclick="toggleSection(this)">
                        ${year} <span>▼</span>
                    </div>
                    <div class="year-content">
            `;
            
            Object.keys(organized[type][year]).sort().forEach(set => {
                const cards = organized[type][year][set];
                const ownedCount = cards.filter(c => isInCollection(c.id)).length;
                
                html += `
                    <div class="set-section">
                        <div class="set-header" onclick="toggleSection(this)">
                            <span>${set} ${viewType === 'collection' ? `(${ownedCount}/${cards.length} owned)` : `(${cards.length} cards)`}</span>
                            <span>▼</span>
                        </div>
                        <div class="set-content">
                            <div class="cards-grid">
                `;
                
                cards.sort((a, b) => a.number.localeCompare(b.number)).forEach(card => {
                    const inCollection = isInCollection(card.id);
                    const condition = getCondition(card.id);
                    
                    let cardClass = 'card-item ';
                    if (viewType === 'database') {
                        cardClass += 'in-database';
                    } else {
                        cardClass += inCollection ? 'owned' : 'not-owned';
                    }
                    
                    html += `
                        <div class="${cardClass}">
                            <div class="card-images">
                                ${card.frontImage ? `<img src="${card.frontImage}" class="card-image" alt="Front">` : '<div class="card-image" style="background: #ddd; display: flex; align-items: center; justify-content: center; font-size: 10px;">No Image</div>'}
                                ${card.backImage ? `<img src="${card.backImage}" class="card-image" alt="Back">` : '<div class="card-image" style="background: #ddd; display: flex; align-items: center; justify-content: center; font-size: 10px;">No Image</div>'}
                            </div>
                            <div class="card-info">
                                <strong>#${card.number}</strong> - ${card.name}<br>
                                ${viewType === 'collection' && inCollection ? `Condition: ${condition}<br>` : ''}
                                ${viewType === 'collection' ? (inCollection ? '✅ Owned' : '❌ Need') : '📚 In Database'}
                            </div>
                            <div class="collection-actions">
                                ${viewType === 'database' ? `
                                    <button class="btn btn-danger" onclick="deleteFromDatabase(${card.id})">Delete from DB</button>
                                ` : ''}
                                ${viewType === 'collection' && !inCollection ? `
                                    <button class="btn" onclick="addToCollection(${card.id})">Add to Collection</button>
                                ` : ''}
                                ${viewType === 'collection' && inCollection ? `
                                    <select onchange="updateCondition(${card.id}, this.value)">
                                        <option value="Perfect" ${condition === 'Perfect' ? 'selected' : ''}>Perfect</option>
                                        <option value="Good" ${condition === 'Good' ? 'selected' : ''}>Good</option>
                                        <option value="OK" ${condition === 'OK' ? 'selected' : ''}>OK</option>
                                        <option value="Poor" ${condition === 'Poor' ? 'selected' : ''}>Poor</option>
                                    </select>
                                    <button class="btn btn-danger" onclick="removeFromCollection(${card.id})">Remove</button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
                
                html += `
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    return html;
}

// Toggle sections
function toggleSection(header) {
    const content = header.nextElementSibling;
    const arrow = header.querySelector('span:last-child');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.textContent = '▼';
    } else {
        content.style.display = 'none';
        arrow.textContent = '▶';
    }
}

// Delete card from database
function deleteFromDatabase(cardId) {
    if (confirm('Are you sure you want to delete this card from the master database? This will also remove it from all collections.')) {
        masterDatabase = masterDatabase.filter(card => card.id !== cardId);
        personalCollection = personalCollection.filter(item => item.cardId !== cardId);
        saveMasterDatabase();
        savePersonalCollection();
        displayDatabase();
        displayCollection();
        updateStats();
    }
}

// Update statistics
function updateStats() {
    // Database stats
    const totalCards = masterDatabase.length;
    const uniqueSets = new Set(masterDatabase.map(c => `${c.type}-${c.year}-${c.set}`)).size;
    const uniqueTypes = new Set(masterDatabase.map(c => c.type)).size;
    
    document.getElementById('database-total').textContent = totalCards;
    document.getElementById('database-sets').textContent = uniqueSets;
    document.getElementById('database-types').textContent = uniqueTypes;
    
    // Collection stats
    const ownedCards = personalCollection.length;
    const collectionRate = totalCards > 0 ? Math.round((ownedCards / totalCards) * 100) : 0;
    
    document.getElementById('collection-owned').textContent = ownedCards;
    document.getElementById('collection-total').textContent = totalCards;
    document.getElementById('completion-rate').textContent = collectionRate + '%';
}

// Save functions
function saveMasterDatabase() {
    localStorage.setItem('masterDatabase', JSON.stringify(masterDatabase));
}

function savePersonalCollection() {
    localStorage.setItem('personalCollection', JSON.stringify(personalCollection));
}

// CSV Import/Export functions
function importDatabaseCSV() {
    const file = document.getElementById('csv-database-file').files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csv = e.target.result;
        const lines = csv.split('\n');
        let cardsAdded = 0;
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',').map(v => v.trim());
                const card = {
                    id: Date.now() + i,
                    type: values[0] || '',
                    year: parseInt(values[1]) || new Date().getFullYear(),
                    set: values[2] || '',
                    number: values[3] || '',
                    name: values[4] || '',
                    frontImage: null,
                    backImage: null
                };
                
                // Check if card already exists
                const exists = masterDatabase.find(c => 
                    c.type === card.type && 
                    c.year === card.year && 
                    c.set === card.set && 
                    c.number === card.number
                );
                
                if (!exists) {
                    masterDatabase.push(card);
                    cardsAdded++;
                }
            }
        }
        
        saveMasterDatabase();
        displayDatabase();
        updateStats();
        alert(`${cardsAdded} cards imported to database successfully!`);
    };
    reader.readAsText(file);
}

function importCollectionCSV() {
    const file = document.getElementById('csv-collection-file').files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csv = e.target.result;
        const lines = csv.split('\n');
        let cardsAdded = 0;
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',').map(v => v.trim());
                
                // Find matching card in database
                const dbCard = masterDatabase.find(c => 
                    c.type === values[0] && 
                    c.year === parseInt(values[1]) && 
                    c.set === values[2] && 
                    c.number === values[3]
                );
                
                if (dbCard && values[6]?.toLowerCase() === 'true') {
                    const condition = values[5] || 'Good';
                    addToCollection(dbCard.id, condition);
                    cardsAdded++;
                }
            }
        }
        
        alert(`${cardsAdded} cards added to your collection!`);
    };
    reader.readAsText(file);
}

function exportDatabaseCSV() {
    const csv = 'Type,Year,Set,Number,Name\n' + 
        masterDatabase.map(card => 
            `${card.type},${card.year},${card.set},${card.number},${card.name}`
        ).join('\n');
    
    downloadCSV(csv, 'card-database.csv');
}

function exportCollectionCSV() {
    const csv = 'Type,Year,Set,Number,Name,Condition,Owned\n' + 
        masterDatabase.map(card => {
            const inCollection = isInCollection(card.id);
            const condition = getCondition(card.id);
            return `${card.type},${card.year},${card.set},${card.number},${card.name},${condition},${inCollection}`;
        }).join('\n');
    
    downloadCSV(csv, 'my-collection.csv');
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Clear data functions
function clearDatabase() {
    if (confirm('Are you sure you want to delete ALL cards from the master database? This will also clear all collections and cannot be undone!')) {
        masterDatabase = [];
        personalCollection = [];
        saveMasterDatabase();
        savePersonalCollection();
        displayDatabase();
        displayCollection();
        updateStats();
        alert('Master database cleared!');
    }
}

function clearCollection() {
    if (confirm('Are you sure you want to remove all cards from your personal collection? The master database will remain intact.')) {
        personalCollection = [];
        savePersonalCollection();
        displayCollection();
        updateStats();
        alert('Personal collection cleared!');
    }
}