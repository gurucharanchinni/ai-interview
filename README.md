<h1>AI Interview</h1>
This application is an intelligent interview and resume analysis platform built using <b>Python</b>, <b>JavaScript</b>, <b>HTML5</b>, <b>CSS3</b>, <b>Jinja2</b>, and <b>Bootstrap</b>, with <b>PostgreSQL</b> as the backend database. It leverages the <b>Gemini API</b> for AI-driven insights and the <b>Web Speech API</b> to conduct interactive voice-based interviews.

<h1>Features</h1>

- **User Registration**: Allows users to register by setting their name, email, and password. The password is securely encoded using the `hashlib` module before storing it in the database. Upon successful registration, a **welcome email** is sent to the new user using the `smtplib` module.

- **Login Authentication**: Users can log in using their registered email and password. The session lasts for 10 minutes. Once the session expires, the user is required to re-login to access any features.

- **Session-Based Access Control**: Every page in the application checks for valid session authentication. Only logged-in users can access core features such as interview simulation and resume analysis.

- **Interview Categories**: The Interviews section includes two categories:
  - **Role-Based Interviews**: Focused on the selected job role.
  - **Company-Based Interviews**: Includes behavioral and role-specific questions based on the selected company.

  - Difficulty level
  - Type of round
  - Duration
  In Company-Based interviews, the user can choose:
  - Job role within the selected company

  Based on these selections, personalized interview questions are generated.

- **AI Interview Page**: Displays the generated interview questions. It uses the **Web Speech API** to read questions aloud and waits for the user’s spoken response. Only appears once questions are generated.

- **Resume Analysis**: Users upload their resume and provide a job description. This data is sent to the **Gemini API**, which:
  - Analyzes the resume against the job description
  - Returns a score out of 100
  - Identifies strengths and weaknesses
  - Suggests areas of improvement
  - Provides detailed score analysis

- **Result Page**: After the interview is completed:
  - The responses are evaluated using the **Gemini API**
  - A score out of 100 is generated
  - Feedback is given for each answer
  - Suggestions are provided to improve delivery and content
  - The complete interview session and its questions are stored in the database for future access

- **Profile Page**:
  - Option to **change the password**
  - Displays a **history of attended interviews** with corresponding scores
  - Provides a **Repractice** feature allowing users to revisit and retake previous interviews to improve performance
 
- **Logout with Session Invalidation**: Allows users to securely log out of the application. When a user logs out, the session is invalidated immediately, ensuring that all protected routes and pages are inaccessible until the user logs in again.

<h1>Tech Stack</h1>
<h3>Frontend:</h3>

- **HTML5**
- **CSS3**
- **JavaScript** (Request Handling and Web Speech API)
- **Bootstrap** (Responsive Design)
- **Jinja2** (Templating Engine)
<h3>Backend:</h3>

- **Python** (Flask Framework)
- **Gemini API** (AI based interview and resume analysis)
- **PostgreSQL** (Storing User Data and Interactions)
- **SMTP** (`smtplib` and `email` modules in Python)
- **SHA-256** (`hashlib` module in Python)
- **Session Management** (`Flask-Session`)

<h1>UI Snapshots</h1>
