import os
import google.generativeai as genai
from dotenv import load_dotenv
import re
import psycopg2

class AIInterview:
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv("GEMINI_API_KEY")

        # Configure Gemini
        genai.configure(api_key=self.api_key)
        
        self.model = genai.GenerativeModel("gemini-2.0-flash")
        
        conn = psycopg2.connect(
            host="localhost",
            port="5432",
            database="interviewDB",
            user="postgres",
            password="123456789"
        )
        
        self.cursor = conn.cursor()
        
    def generate_questions(self, uid, job, round_type, difficulty, duration, resume, company):
        estimated_questions = duration * 2

        # Ensure cache exists for this job role
        query = """
            SELECT q.questions FROM interview_responses q
            WHERE user_id = %s AND role = %s
            AND id IN (
                SELECT id FROM interview_responses
                WHERE user_id = %s AND role = %s
                ORDER BY created_at DESC
                LIMIT 5
            )
            ORDER BY created_at DESC;
            """
            
        self.cursor.execute(query, (uid, job, uid, job))
        result = self.cursor.fetchall()
        
        past_questions = ''
        if not result:
            print("No questions")
        else:
            for r in result:
                past_questions += r[0]
                past_questions += '^'
                
        # Get previously asked questions for this job role
        previous_questions = past_questions.split("^")
        prev_q_text = "\n".join(previous_questions) if previous_questions else ""

        prompt = f"""You are acting as a professional interviewer who is experienced in technical, behavioural, and HR interviews.

                You are conducting an interview for the job role: "{job}"
                Company (if applicable): "{company}"
                Resume (if available): "{resume}"

                The interview round type is: "{round_type.capitalize()} if the round type is warm up go with the questions in range of very basic to basic which also matches the role selected, if the round type is role related ignore basic questions and focus on the role"
                The difficulty level is: "{difficulty.capitalize()} if the difficulty level is professional go deep into the role and questions can also include concepts which might be used in realtime applications"
                The total duration is {duration} minutes.

                Generate a list of exactly {estimated_questions} interview questions.

                **Rules:**
                - The **first question** must be: "Tell me about yourself"
                - The **last question** must be: "Do you have any queries?"
                - Start with **technical/stream-related questions** based on the job role and resume
                - The **final 2 questions ignoring the default last question (last minute)** should be **HR/behavioural if the duration is greater than or equal 5 minutes**
                - Tailor questions based on:
                - Round type (warm-up, role-related, technical)
                - Difficulty level (beginner, intermediate, professional, expert)
                - Out of all question leaving the first and last question make sure 50% are resume based and 50% are {job} based questions
                - Ensure **90% of questions are not repeated** from the last few interviews for this role

                Previously asked questions (avoid repeating these):
                {prev_q_text}

                **Format**:
                Only return the list of questions, one per line, no numbers, no extra text.
                """

        # Send to Gemini
        response = self.model.generate_content(prompt)
        
        # Clean and split questions
        questions = [q.strip("-• \n") for q in response.text.strip().split("\n") if q.strip()]
        print(questions)

        return questions
    
    def evaluate_answers(self, qa_list):
        prompt = """You are an expert interviewer and evaluator.\n\n
        Below are some interview questions and candidate responses. Your task is to evaluate the responses and do the following:\n
        1. Give an overall performance score out of 100 (only one number).\n
        2. Provide feedback for each and every question in the form that first the questions and answer should be displayed followed by feedback for that answer and also give a suggestion if needed on how good the question can be answered.\n\n
        Important:\n- The score must be a number only between 0 and 100.\n- Feedback must be realistic, helpful, and reflect the quality of responses.\n- Start the result with the score in the format: Score: <number>\n\n"""

        for question, response in qa_list.items():
            prompt += f"Q: {question}\nA: {response}\n\n"

        response = self.model.generate_content(prompt)
        response_text = response.text.strip()

        # Use regex to extract score
        score_match = re.search(r"score\s*[:\-]?\s*(\d{1,3})", response_text, re.IGNORECASE)
        score = int(score_match.group(1)) if score_match else 0

        # Extract feedback excluding score line
        feedback_lines = [
            line.replace("**", "") for line in response_text.split("\n")
            if "score" not in line.lower()
        ]
        feedback = "\n".join(feedback_lines).strip()
        
        print(score)        
        return score, feedback