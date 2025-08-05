import { interviewData } from './interviewData.js'; 

let currentSection = '';
let currentRoles = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log("Interviews page loaded");
    
    // Generate dynamic content
    generatePositions();
    generateCompanies();
    generateModalOptions();
    
    // Initialize modal
    const bootstrap = window.bootstrap; // Declare the bootstrap variable
    const modal = new bootstrap.Modal(document.getElementById('interviewModal'));
    
    // Handle interview box clicks
    document.addEventListener('click', function(e) {
        const interviewBox = e.target.closest('.interview-box');
        if (interviewBox) {
            handleInterviewBoxClick(interviewBox, modal);
        }
    });
    
    // Handle selection button clicks
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('selection-btn')) {
            handleSelectionButtonClick(e.target);
        }
    });
    
    // Handle start interview button click
    document.getElementById('startInterviewBtn').addEventListener('click', function() {
        document.getElementById('interviewForm').submit();
    });
});

function generatePositions() {
    const container = document.getElementById('positionContainer');
    container.innerHTML = '';
    
    interviewData.positions.forEach(position => {
        const positionHTML = `
            <div class="col-md-4 mb-4">
                <div class="interview-box" data-section="position" data-name="${position.name}" data-value="${position.value}">
                    <div class="box-content text-center">
                        <h4>${position.name}</h4>
                        <p class="text-muted">${position.description}</p>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += positionHTML;
    });
}

function generateCompanies() {
    const container = document.getElementById('companyContainer');
    container.innerHTML = '';
    
    interviewData.companies.forEach(company => {
        const companyHTML = `
            <div class="col-md-4 mb-4">
                <div class="interview-box" data-section="company" data-name="${company.name}" data-value="${company.value}">
                    <div class="box-content text-center">
                        <img src="/static/images/${company.logo}" alt="${company.name}" class="company-logo mb-3" style="height: 60px; object-fit: contain;">
                        <h4>${company.name}</h4>
                        <p class="text-muted">${company.description}</p>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += companyHTML;
    });
}

function generateModalOptions() {
    // Generate round options
    const roundContainer = document.getElementById('roundSelection');
    roundContainer.innerHTML = '';
    interviewData.rounds.forEach((round, index) => {
        const activeClass = index === 0 ? 'active' : '';
        roundContainer.innerHTML += `
            <button type="button" class="btn btn-outline-primary selection-btn ${activeClass}" 
                    data-field="round" data-value="${round.value}">${round.name}</button>
        `;
    });
    
    // Generate difficulty options
    const difficultyContainer = document.getElementById('difficultySelection');
    difficultyContainer.innerHTML = '';
    interviewData.difficulties.forEach((difficulty, index) => {
        const activeClass = index === 0 ? 'active' : '';
        difficultyContainer.innerHTML += `
            <button type="button" class="btn btn-outline-primary selection-btn ${activeClass}" 
                    data-field="difficulty" data-value="${difficulty.value}">${difficulty.name}</button>
        `;
    });
    
    // Generate duration options
    const durationContainer = document.getElementById('durationSelection');
    durationContainer.innerHTML = '';
    interviewData.durations.forEach((duration, index) => {
        const activeClass = index === 0 ? 'active' : '';
        durationContainer.innerHTML += `
            <button type="button" class="btn btn-outline-primary selection-btn ${activeClass}" 
                    data-field="duration" data-value="${duration.value}">${duration.name}</button>
        `;
    });
    
    // Set default values
    document.getElementById('round').value = interviewData.rounds[0].value;
    document.getElementById('difficulty').value = interviewData.difficulties[0].value;
    document.getElementById('duration').value = interviewData.durations[0].value;
}

function generateRoleOptions(roles) {
    const roleContainer = document.getElementById('roleButtons');
    roleContainer.innerHTML = '';
    
    roles.forEach((role, index) => {
        const activeClass = index === 0 ? 'active' : '';
        roleContainer.innerHTML += `
            <button type="button" class="btn btn-outline-primary selection-btn ${activeClass}" 
                    data-field="role" data-value="${role.value}">${role.name}</button>
        `;
    });
    
    // Set default role value
    if (roles.length > 0) {
        document.getElementById('role').value = roles[0].value;
    }
}

function handleInterviewBoxClick(box, modal) {
    // Get data from the clicked box
    const section = box.getAttribute('data-section');
    const name = box.getAttribute('data-name');
    const value = box.getAttribute('data-value');
    
    currentSection = section;
    
    // Set hidden form values
    document.getElementById('section_type').value = section;
    document.getElementById('selected_name').value = name || '';
    
    const roleSelection = document.getElementById('roleSelection');
    
    // Handle different sections
    if (section === 'position') {
        // For position section, hide role selection initially
        roleSelection.style.display = 'none';
        document.getElementById('creator_name').value = '';
        document.getElementById('company_name').value = '';
        
        // Find the position data and set roles
        const positionData = interviewData.positions.find(p => p.value === value);
        if (positionData && positionData.roles) {
            currentRoles = positionData.roles;
            // Show role selection for positions too
            roleSelection.style.display = 'block';
            generateRoleOptions(currentRoles);
        }
    } 
    else if (section === 'company') {
        // For company section, show role selection
        roleSelection.style.display = 'block';
        document.getElementById('creator_name').value = '';
        document.getElementById('company_name').value = name;
        
        // Find the company data and set roles
        const companyData = interviewData.companies.find(c => c.value === value);
        if (companyData && companyData.roles) {
            currentRoles = companyData.roles;
            generateRoleOptions(currentRoles);
        }
    }
    
    // Reset all other selections to default
    resetModalSelections();
    
    // Show the modal
    modal.show();
}

function handleSelectionButtonClick(button) {
    const field = button.getAttribute('data-field');
    const value = button.getAttribute('data-value');
    
    // Remove active class from siblings in the same group
    const parent = button.parentElement;
    const siblings = parent.querySelectorAll('.selection-btn');
    siblings.forEach(btn => btn.classList.remove('active'));
    
    // Add active class to clicked button
    button.classList.add('active');
    
    // Update hidden input value
    const hiddenInput = document.getElementById(field);
    if (hiddenInput) {
        hiddenInput.value = value;
    }
}

function resetModalSelections() {
    // Reset round selection
    const roundButtons = document.querySelectorAll('[data-field="round"]');
    roundButtons.forEach(btn => btn.classList.remove('active'));
    if (roundButtons.length > 0) {
        roundButtons[0].classList.add('active');
        document.getElementById('round').value = interviewData.rounds[0].value;
    }
    
    // Reset difficulty selection
    const difficultyButtons = document.querySelectorAll('[data-field="difficulty"]');
    difficultyButtons.forEach(btn => btn.classList.remove('active'));
    if (difficultyButtons.length > 0) {
        difficultyButtons[0].classList.add('active');
        document.getElementById('difficulty').value = interviewData.difficulties[0].value;
    }
    
    // Reset duration selection
    const durationButtons = document.querySelectorAll('[data-field="duration"]');
    durationButtons.forEach(btn => btn.classList.remove('active'));
    if (durationButtons.length > 0) {
        durationButtons[0].classList.add('active');
        document.getElementById('duration').value = interviewData.durations[0].value;
    }
    
    // Reset role selection (if visible)
    const roleButtons = document.querySelectorAll('[data-field="role"]');
    if (roleButtons.length > 0) {
        roleButtons.forEach(btn => btn.classList.remove('active'));
        roleButtons[0].classList.add('active');
        if (currentRoles.length > 0) {
            document.getElementById('role').value = currentRoles[0].value;
        }
    }
}