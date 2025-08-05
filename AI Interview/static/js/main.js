document.addEventListener('DOMContentLoaded', function() {
    // Toggle auth tabs
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    
    if (authTabs.length > 0) {
        authTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // Remove active class from all tabs
                authTabs.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Hide all forms
                authForms.forEach(form => form.style.display = 'none');
                
                // Show the corresponding form
                const formId = this.getAttribute('data-form');
                document.getElementById(formId).style.display = 'block';
            });
        });
    }
    
    // FAQ accordion functionality
    const faqItems = document.querySelectorAll('.faq-item');
    
    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            
            question.addEventListener('click', function() {
                // Toggle active class
                item.classList.toggle('active');
                
                // Toggle answer visibility
                const answer = item.querySelector('.faq-answer');
                if (item.classList.contains('active')) {
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                } else {
                    answer.style.maxHeight = '0';
                }
            });
        });
    }
    
    // Resume analysis score animation
    const scoreCircle = document.querySelector('.score-circle');
    
    if (scoreCircle) {
        const score = parseInt(scoreCircle.getAttribute('data-score'));
        scoreCircle.style.setProperty('--score', score);
    }
});