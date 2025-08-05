from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_session import Session
import hashlib
from datetime import timedelta
from resumeats import ResumeATS
from ainterview import AIInterview
from resumeextract import ExtractText
from databases import Database
from welcomeemail import WelcomeMail

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Change this to a random secret key

app.config['SECRET_KEY'] = 'your_secret_key'  # Same as before
app.config['SESSION_TYPE'] = 'filesystem'  # Store sessions on server filesystem
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=10)
app.config['SESSION_FILE_DIR'] = './flask_session_data'  # Optional: custom path for session files
app.config['SESSION_USE_SIGNER'] = True  # Encrypt session cookies
Session(app) 

# # Initialize database on startup
db = Database()
db.init_db()

aiProctor = AIInterview()

# Check if user is logged in
def login_required(f):
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please login to access this feature', 'error')
            return redirect(url_for('auth'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/interviews')
def interviews():
    return render_template('interviews.html')

@app.route('/resume')
def resume():
    return render_template('resume.html')

@app.route('/auth')
def auth():
    return render_template('auth.html')

@app.route('/ai')
def ai():
    # Get the interview details from the session
    interview_details = session.get('interview_details', None)
    return render_template('ai.html', interview_details=interview_details)

@app.route('/interview_results')
@login_required
def interview_results():
    # Get results from session
    results = session.get('interview_results', None)
    interview_details = session.get('completed_interview_details', None)
    
    if not results:
        flash('No interview results found', 'error')
        return redirect(url_for('interviews'))
    
    return render_template('interview_results.html', results=results, interview_details=interview_details)

@app.route('/profile')
@login_required
def profile():
    practices = []
    query = """
        SELECT id, selected_name, company_name, round_type, difficulty, duration, created_at, score
        FROM interview_sessions 
        WHERE user_id = %s 
        ORDER BY created_at DESC
    """
    rows = db.execute_select(query, (session['user_id'],))
    for record in rows:
        practices.append({
            'id': record[0],
            'role': record[1],
            'company': record[2],
            'round_type': record[3],
            'difficulty': record[4],
            'duration': record[5],
            'created_at': record[6],
            'score': record[7]
        })
    return render_template('profile.html', practices=practices)

@app.route('/change_password', methods=['POST'])
@login_required
def change_password():
    current_password = request.form.get('current_password')
    new_password = request.form.get('new_password')
    confirm_password = request.form.get('confirm_password')
    
    hashed_current = hashlib.sha256(current_password.encode()).hexdigest()
    result = db.execute_select("SELECT password FROM users WHERE id = %s", (session['user_id'],))
    if result and result[0][0] != hashed_current:
        flash('Current password is incorrect', 'error')
    elif new_password != confirm_password:
        flash('New passwords do not match', 'error')
    else:
        hashed_new = hashlib.sha256(new_password.encode()).hexdigest()
        db.execute_update("UPDATE users SET password = %s WHERE id = %s", (hashed_new, session['user_id']))
        flash('Password updated successfully', 'success')
    return redirect(url_for('profile'))

@app.route('/register', methods=['POST'])
def register():
    name = request.form.get('name')
    email = request.form.get('email')
    password = request.form.get('password')
    hashed_password = hashlib.sha256(password.encode()).hexdigest()
    existing_user = db.execute_select("SELECT * FROM users WHERE email = %s", (email,))
    if existing_user:
        flash('Email already exists', 'error')
    else:
        db.execute_insert(
            "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
            (name, email, hashed_password)
        )
        flash('Registration successful! Please login.', 'success')
    return redirect(url_for('auth'))

@app.route('/login', methods=['POST'])
def login():
    email = request.form.get('email')
    password = request.form.get('password')
    hashed_password = hashlib.sha256(password.encode()).hexdigest()
    user = db.execute_select("SELECT * FROM users WHERE email = %s AND password = %s", (email, hashed_password))
    if user:
        session.permanent = True
        session['user_id'] = user[0][0]
        session['name'] = user[0][1]
        session['email'] = user[0][2]
        flash('Login successful!', 'success')
        return redirect(url_for('index'))
    else:
        flash('No user with this email and password', 'error')
    return redirect(url_for('auth'))

@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out', 'success')
    return redirect(url_for('index'))

@app.route('/analyze_resume', methods=['POST'])
@login_required
def analyze_resume():
    if request.method == 'POST':
        # Check if the post request has the file part
        if 'resume' not in request.files:
            flash('No resume file part', 'error')
            return redirect(url_for('resume'))
            
        file = request.files['resume']
        job_description = request.form.get('job_description', '')
        
        #if not file uploaded
        if file.filename == '':
            flash('No selected file', 'error')
            return redirect(url_for('resume'))
            
        if file:
            rats = ResumeATS()
            
            #ai analyzes the resume and generates score
            ats_score, insights = rats.analyze_resume_against_role(file.stream, job_description)
            
            return render_template('resume.html', ats_score=ats_score, insights=insights)
        
    return redirect(url_for('resume'))

@app.route('/start_interview', methods=['POST'])
@login_required
def start_interview():
    section_type = request.form.get('section_type')
    selected_name = request.form.get('selected_name')
    creator_name = request.form.get('creator_name')
    company_name = request.form.get('company_name')
    round_type = request.form.get('round')
    difficulty = request.form.get('difficulty')
    duration = request.form.get('duration')
    role = request.form.get('role')
    resume_text = ''
    if 'resume' in request.files:
        file = request.files['resume']
        if file and file.filename != '':
            et = ExtractText()
            resume_text = et.extract_text_from_pdf(file.stream)

    questions = aiProctor.generate_questions(session['user_id'], role, round_type, difficulty, int(duration), resume_text, company_name)
    
    session['questions'] = questions
    session['interview_details'] = {
        'section_type': section_type,
        'selected_name': selected_name,
        'creator_name': creator_name,
        'company_name': company_name,
        'round': round_type,
        'difficulty': difficulty,
        'duration': int(duration),
        'role': role
    }
    session['is_practice'] = False
    if questions:
        flash('Interview session started successfully!', 'success')
        return redirect(url_for('ai',
                                role=role, 
                                company=company_name, 
                                round_type=round_type, 
                                difficulty=difficulty, 
                                duration=duration))
    return redirect(url_for('interviews'))

@app.route('/get_questions', methods=['POST'])
@login_required
def get_questions():
    # Get questions from session
    questions = session.get('questions', [])
    if not questions:
        return jsonify({
            'status': 'error',
            'message': 'No questions found in session'
        }), 404
    
    return jsonify({
        'status': 'success',
        'questions': questions
    })

@app.route('/repractice/<int:practice_id>')
@login_required
def repractice(practice_id):
    query = """
        SELECT selected_name, company_name, round_type, difficulty, duration 
        FROM interview_sessions 
        WHERE id = %s AND user_id = %s
    """
    rows = db.execute_select(query, (practice_id, session['user_id']))
    
    query = """
        SELECT questions
        FROM interview_responses
        WHERE interview_session_id = %s AND user_id = %s
    """
    questions_db = db.execute_select(query, (practice_id, session['user_id']))
    
    questions = ""
    for q in questions_db:
        questions = q[0].split("^")
        
    session['questions'] = questions
    
    if rows:
        role, company, round_type, difficulty, duration = rows[0]
        interview_details = {
            'id': practice_id,
            'company_name': company,
            'round': round_type,
            'difficulty': difficulty,
            'duration': int(duration),
            'role': role
        }
        session['is_practice'] = True
        session['interview_details'] = interview_details
        return redirect(url_for('ai',
                               role=role,
                               company=company,
                               round_type=round_type,
                               difficulty=difficulty,
                               duration=duration,
                               practice_id=practice_id))
    flash('Practice not found', 'error')
    return redirect(url_for('profile'))

@app.route('/submit_interview_responses', methods=['POST'])
@login_required
def submit_interview_responses():
    try:
        # Get JSON data instead of form data
        data = request.get_json()
        responses = data.get('responses', []) if data else [] 
        
        # Validate and filter responses
        valid_responses = []
        for i, response in enumerate(responses):
            valid_responses.append(response)
                
        if not valid_responses:
            # Store results in session for the results page
            session['interview_results'] = {
                'score': 0,
                'feedback': 'No responses were provided for evaluation.',
                'status': 'error'
            }
            session['completed_interview_details'] = session.get('interview_details', {})
            return jsonify({
                'status': 'success',
                'redirect_url': url_for('interview_results')
            })
        
        # Process valid responses
        questions = [r['question'].replace('$', ' ') for r in valid_responses]
        questions_string = '^'.join(questions)
        
        question_dict = {}
        
        for r in valid_responses:
            question_dict[r['question']] = r['response']
        
        # Get AI evaluation
        try:
            score, feedback = aiProctor.evaluate_answers(question_dict)
            
        except Exception as e:
            print(f"Error in AI evaluation: {str(e)}")
            score = 0
            feedback = "There was an error during evaluation. Your responses have been saved."
        
        interview_details = session.get('interview_details', {})
        
        # Check if interview_details exists
        if not interview_details:
            session['interview_results'] = {
                'score': score,
                'feedback': feedback,
                'status': 'error',
                'message': 'No interview details found'
            }
            session['completed_interview_details'] = {}
            return jsonify({
                'status': 'success',
                'redirect_url': url_for('interview_results')
            })
        
        if not session.get('is_practice'):
            query = """
                INSERT INTO interview_sessions 
                (user_id, section_type, selected_name, creator_name, company_name, round_type, difficulty, duration, role, score) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """
            values = (
                session['user_id'], 
                interview_details.get('section_type', ''), 
                interview_details.get('selected_name', ''), 
                interview_details.get('creator_name', ''), 
                interview_details.get('company_name', ''), 
                interview_details.get('round', ''), 
                interview_details.get('difficulty', ''), 
                interview_details.get('duration', 0), 
                interview_details.get('role', ''),
                score
            )
            
            interview_id = db.execute_insert(query, values, return_id=True)
            
            query = '''
                INSERT INTO interview_responses (user_id, interview_session_id, role, questions)
                VALUES (%s, %s, %s, %s)
            '''
            values = (
                session['user_id'],
                interview_id,
                (interview_details.get('company_name', '') + " " + interview_details.get('role', '')).strip(),
                questions_string
            )
            db.execute_insert(query, values)  
        else:
            query = """
                UPDATE interview_sessions
                SET score = %s
                WHERE id = %s AND user_id = %s AND (score IS NULL OR score < %s)

            """
            values = (score, interview_details['id'], session['user_id'], score)
            
            db.execute_update(query, values) 
        
        # Store results in session for the results page
        session['interview_results'] = {
            'score': score,
            'feedback': feedback,
            'status': 'success',
            'total_questions': len(valid_responses),
        }
        session['completed_interview_details'] = interview_details
        
        # Clear interview session data
        session.pop('interview_details', None)
        session.pop('questions', None)
        session.pop('is_practice', None)
        
        return jsonify({
            'status': 'success',
            'redirect_url': url_for('interview_results')
        })
        
    except Exception as e:
        print(f"Error in submit_interview_responses: {str(e)}")  # Debug log
        import traceback
        traceback.print_exc()  # Print full stack trace
        
        # Store error results in session
        session['interview_results'] = {
            'score': 0,
            'feedback': 'There was an error processing your interview. Please try again.',
            'status': 'error',
            'message': str(e)
        }
        session['completed_interview_details'] = session.get('interview_details', {})
        
        return jsonify({
            'status': 'success',
            'redirect_url': url_for('interview_results')
        })

if __name__ == '__main__':
    app.run(debug=True)

