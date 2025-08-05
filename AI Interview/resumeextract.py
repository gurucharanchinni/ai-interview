import PyPDF2

class ExtractText:
    def extract_text_from_pdf(self, file_stream=None):
        if file_stream is None:
            return ""
        file_stream.seek(0)  # Ensure you're at the beginning of the file
        reader = PyPDF2.PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:  # Check if text was actually extracted
                text += page_text
        return text
