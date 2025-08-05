import re
import os
import google.generativeai as genai
from dotenv import load_dotenv
from resumeextract import ExtractText

class ResumeATS:
    def __init__(self):
        # Load API key from .env
        load_dotenv()
        self.api_key = os.getenv("GEMINI_API_KEY")

        # Configure Gemini
        genai.configure(api_key=self.api_key)

        # Load Gemini model
        self.model = genai.GenerativeModel("gemini-2.0-flash")  # You can also use "gemini-pro" or "gemini-1.5-flash"
        self.et = ExtractText()
        
    # Extract ATS score from response using regex
    def extract_score(self, response_text):
        match = re.search(
            r'(?i)(?:ATS\s*Score\s*[:\-]?\s*|score\s*of\s*)(\d{1,3})\s*(?:/100)?',
            response_text
        )
        if match:
            return int(match.group(1))
        else:
            return None
        
    def extract_sections(self, response_text):
    # Extract ATS Score
        score = self.extract_score(response_text)

        # Remove score line from response to parse the rest
        response_wo_score = re.sub(r'(?i)ATS\s*Score\s*[:\-]?\s*\d{1,3}\s*(?:/100)?', '', response_text).strip()

        # Define expected headings (make case-insensitive)
        headings = ["Key Strengths:", "Missing Skills/Qualifications:", "Suggestions for Improvement:","Explanation of Score:"]

        # Split the response into parts based on the known headings
        split_data = []
        for i, heading in enumerate(headings):
            pattern = re.escape(heading)
            match = re.search(pattern, response_wo_score, re.IGNORECASE)
            if not match:
                continue
            start = match.end()
            # Find where the next heading starts
            if i + 1 < len(headings):
                next_match = re.search(re.escape(headings[i + 1]), response_wo_score, re.IGNORECASE)
                end = next_match.start() if next_match else len(response_wo_score)
            else:
                end = len(response_wo_score)

            # Extract content between current and next heading
            content = response_wo_score[start:end].strip()
            split_data.append(headings[i].rstrip(':'))  # Add heading without colon
            split_data.append(content)

        return score, split_data


# Analyze resume with respect to role description
    def analyze_resume_against_role(self, file_stream, role_description):
        # self.extract_text_from_pdf(pdf_path)
        self.text = self.et.extract_text_from_pdf(file_stream)
    
        prompt = f"""
        You are an Applicant Tracking System (ATS). Analyze the following resume with respect to the job role description.
        Your response must strictly follow the exact headings below in the same order. Do not use any bullet points, symbols like *, -, or markdown. Use only plain text and complete sentences under each section.
        FORMAT (strictly follow this and do not include any extra text):
        ATS Score: <score out of 100>
        Key Strengths:
        <List the strengths of the resume that match well with the job role, written in complete sentences. No symbols or lists.>
        Missing Skills/Qualifications:
        <List any important qualifications, skills, or experiences missing in the resume that are required for the job role. Write in complete sentences. No bullet points or symbols.>
        Suggestions for Improvement:
        <Give specific, actionable suggestions to improve the resume. Use complete sentences only. No symbols or special formatting.>
        Explanation of Score:
        <Explain how the score was calculated specifying which point for which, based on alignment between resume content and job description.>
        ### Job Role Description:
        {role_description}
        ### Resume Text:
        {self.text}
        """
        
        response = self.model.generate_content(prompt)
        return self.extract_sections(response.text)
